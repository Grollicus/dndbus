// TODO change cursor to grab cursor
// TODO insert before current element if in first half of the element
// TODO preview insert location
// TODO should _stop() before calling move() to prevent user confusion when the elementw as already dropped (but will still follow the cursor till .move() returns)
// TODO drag_helper height/width includes padding, so it is added twice

// NOTE works only on horizontal stacks (not with multiple elements at the same height)

class _DnDContext {
    src_node: HTMLElement
    drag_helper: HTMLElement
    src_container: object
    src_container_node: HTMLElement
    src_idx: number
    hovered_target: HTMLElement | null
    hovered_element: HTMLElement | null
    hovered_container_node: HTMLElement | null
    hovered_container: object | null
    hovered_idx:  number | null
    can_drop: boolean

    constructor(src_node: HTMLElement, drag_helper: HTMLElement, src_container_node: HTMLElement, src_container: object, src_idx: number) {
        this.src_node = src_node
        this.drag_helper = drag_helper
        this.src_container_node = src_container_node
        this.src_container = src_container
        this.src_idx = src_idx
        this.can_drop = false;
    }
}

type candrop_t = null | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => boolean)
type cancelled_t = null | ((element_node: HTMLElement, src: object, src_idx: number) => void)
type move_t = null | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => void) | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => Promise<void>)

class DnDBus {
    container_class: string
    element_class: string
    containers: Map<HTMLElement, object>
    context: _DnDContext | null

    candrop: candrop_t
    cancelled: cancelled_t
    move: move_t

    /**
     * Creates new Drag'n'Drop Bus
     * @param container_class CSS class of containers that contain draggable elements
     * @param element_class CSS class of the draggable elements
     * @param callbacks callbacks that will be called when dragging elements:
     * @param callbacks.candrop durring drag operations, if the source element can be dropped in `dst` at `dst_idx`
     * @param callbacks.cancelled called after cancelling a drag operation, for example for redraws
     * @param callbacks.move called after a dragged element is dropped. Should do the actual move. Can be async.
     */
    constructor(container_class, element_class, {candrop, cancelled, move}: {
                candrop: null | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => boolean),
                cancelled: null | ((element_node: HTMLElement, src: object, src_idx: number) => void),
                move: null | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => void) | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => Promise<void>)
    }) {
        this.container_class = container_class
        this.element_class = element_class
        this.containers = new Map();
        this.context = null;

        console.log({candrop, cancelled, move})

        this.candrop = candrop ?? null;
        this.cancelled = cancelled ?? null
        this.move = move ?? null;

        this._on_mouseup = this._on_mouseup.bind(this);
        this._on_mousemove = this._on_mousemove.bind(this);
        this._on_keydown = this._on_keydown.bind(this);
    }

    register_container(dom_node: HTMLElement, container_object: object) {
        this.containers.set(dom_node, container_object);
    }

    unregister_container(dom_node: HTMLElement) {
        this.containers.delete(dom_node);
    }

    _lookup_element_for_node(dom_node: HTMLElement): HTMLElement | null {
        let current_node : HTMLElement | null = dom_node;
        while(current_node !== null && !current_node.classList.contains(this.element_class) && !current_node.classList.contains(this.container_class)) {
            current_node = current_node.parentElement;
        }
        return current_node;
    }
    _lookup_container_for_element(element_node: HTMLElement) : HTMLElement | null {
        let current_node : HTMLElement | null = element_node;
        while(current_node !== null && !current_node.classList.contains(this.container_class)) {
            current_node = current_node.parentElement;
        }
        return current_node;
    }
    _list_container_elements_in_order(container_node: Element): Iterable<HTMLElement> {
        return container_node.getElementsByClassName(this.element_class) as HTMLCollectionOf<HTMLElement>;
    }

    _on_mouseup(evt: MouseEvent) {
        evt.preventDefault();
        evt.stopPropagation();

        this._try_commit();
    }

    _on_mousemove(evt: MouseEvent) {
        if(!this.context)
            return;

        this.context.drag_helper.style.top = evt.clientY + 'px';
        this.context.drag_helper.style.left = evt.clientX + 'px';
        evt.preventDefault();
        evt.stopPropagation();

        if(evt.target == this.context.hovered_target)
            return;

        this.context.hovered_target = evt.target as HTMLElement;
        let hovered_element = this._lookup_element_for_node(this.context.hovered_target);
        let hovered_container_node;
        if(!hovered_element) {
            hovered_container_node = null;
        } else if (hovered_element.classList.contains(this.container_class)) {
            hovered_container_node = hovered_element;
            hovered_element = null;
        } else {
            hovered_container_node = this._lookup_container_for_element(hovered_element);
            if(!hovered_container_node) {
                console.warn("Found element outside of a container, ignoring!")
                this.context.hovered_element = null;
            }
        }
        if(hovered_element != this.context.hovered_element) {
            this.context.hovered_element = hovered_element;
            if(hovered_element) {
                let i = 0;
                for(const element of this._list_container_elements_in_order(hovered_container_node)) {
                    if(element == hovered_element)
                        break;
                    i += 1;
                }
                this.context.hovered_idx = i;
                console.debug('element', {hovered_element, hovered_container_node, hovered_idx: this.context.hovered_idx})
            }
        }

        if(hovered_container_node != this.context.hovered_container_node) {
            if(!hovered_container_node) {
                this.context.hovered_container_node = hovered_container_node;
                this.context.hovered_container = null;
            } else {
                let hovered_container: object | null | undefined = this.containers.get(hovered_container_node);
                if(!hovered_container) {
                    console.warn("Found unknown container, ignoring!", hovered_container_node)
                    hovered_container_node = null;
                    hovered_container = null;
                }
                this.context.hovered_container_node = hovered_container_node;
                this.context.hovered_container = hovered_container;
            }
        }

        if(!hovered_element && hovered_container_node) {
            let i = 0;
            for(const element of this._list_container_elements_in_order(hovered_container_node)) {
                const rect = element.getBoundingClientRect()
                if(rect.y > evt.clientY)
                    break;
                i += 1;
            }
            this.context.hovered_idx = i;
            console.debug('container', {hovered_element, hovered_container_node, hovered_idx: this.context.hovered_idx})
        }

        if(!this.context.hovered_container || this.context.hovered_idx === null) {
            this.context.can_drop = false;
            return;
        }
        if(this.candrop) {
            this.context.can_drop = this.candrop(this.context.hovered_target, this.context.src_container, this.context.src_idx, this.context.hovered_container, this.context.hovered_idx);
        } else {
            this.context.can_drop = true;
        }
    }

    _on_keydown(evt: KeyboardEvent) {
        if(evt.key != 'Escape') {
            return;
        }
        evt.stopPropagation();
        evt.preventDefault();

        this._cancel();
    }

    _try_commit() {
        if(!this.context)
            return;

        if(!this.context.can_drop)
            return this._cancel();
        if(!this.context.hovered_container || !this.context.hovered_idx)
            return this._cancel();

        let move_callback = this.move ?? ((_element_node: HTMLElement, _src: object, _src_idx: number, _dst: object, _dst_idx: number) => Promise.resolve());
        Promise.resolve(move_callback(this.context.src_node, this.context.src_container, this.context.src_idx, this.context.hovered_container, this.context.hovered_idx)).then(() => {
            this._stop();
        }, function(error) {
            console.warn('Cancelled drop due to exception in predrop handler', error);
            this._cancel();
        })
    }

    _cancel() {
        if(!this.context)
            return;

        if(this.cancelled)
            this.cancelled(this.context.src_node, this.context.src_container, this.context.src_idx);

        this._stop();
    }

    _stop() {
        if(!this.context)
            return;

        this.context.src_container_node.removeChild(this.context.drag_helper);
        window.removeEventListener('mouseup', this._on_mouseup);
        window.removeEventListener('mousemove', this._on_mousemove);
        window.removeEventListener('keydown', this._on_keydown);
        this.context = null;
    }

    start_drag(dom_node: HTMLElement, src_idx: number) {
        let container_node = this._lookup_container_for_element(dom_node);
        if(container_node === null) {
            console.warn("Ignored drag request of node not in a container", dom_node);
            return;
        }
        let src_container = this.containers.get(container_node);
        if(!src_container) {
            console.warn("Ignored drag request of unknown Element", dom_node);
            return;
        }
        container_node.classList.contains(this.container_class)

        // TODO tgr drag_helper zindex
        let drag_helper = dom_node.cloneNode(true) as HTMLElement;
        drag_helper.style.position = 'absolute';
        drag_helper.style.top = '99999px';
        drag_helper.style.left = '99999px';
        drag_helper.style.pointerEvents = 'none';
        drag_helper.style.width = dom_node.clientWidth + 'px';
        drag_helper.style.height = dom_node.clientHeight + 'px';
        container_node.appendChild(drag_helper)

        this.context = new _DnDContext(dom_node, drag_helper, container_node, src_container, src_idx);

        window.addEventListener('mouseup', this._on_mouseup);
        window.addEventListener('mousemove', this._on_mousemove);
        window.addEventListener('keydown', this._on_keydown);
    }
}

export default DnDBus;
