// TODO change cursor to grab cursor
// TODO insert before current element if in first half of the element (NOTE: keep some dead zone in the middle that does not change the current choice)
// TODO should _stop() before calling move() to prevent user confusion when the elementw as already dropped (but will still follow the cursor till .move() returns)

// NOTE works only on horizontal stacks (not with multiple elements at the same height)

class _DnDContext {
    src_node: HTMLElement
    drag_helper: HTMLElement
    drag_helper_on_mouse: boolean
    src_container: object
    src_container_node: HTMLElement
    src_idx: number
    offset_x: number
    offset_y: number
    hovered_target: HTMLElement | null
    hovered_next_element: HTMLElement | null
    hovered_container_node: HTMLElement | null
    hovered_container: object | null
    hovered_idx:  number | null
    can_drop: boolean

    constructor(src_node: HTMLElement, drag_helper: HTMLElement, src_container_node: HTMLElement, src_container: object, src_idx: number, offset_x: number, offset_y: number) {
        this.src_node = src_node
        this.drag_helper = drag_helper
        this.drag_helper_on_mouse = false;
        this.src_container_node = src_container_node
        this.src_container = src_container
        this.src_idx = src_idx
        this.can_drop = false;
        this.hovered_target = src_node;
        this.hovered_next_element = src_node;
        this.hovered_idx = src_idx;
        this.hovered_container_node = src_container_node;
        this.hovered_container = src_container;
        this.offset_x = offset_x;
        this.offset_y = offset_y;
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
    constructor(container_class: string, element_class: string, {candrop, cancelled, move}: {
                candrop: null | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => boolean),
                cancelled: null | ((element_node: HTMLElement, src: object, src_idx: number) => void),
                move: null | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => void) | ((element_node: HTMLElement, src: object, src_idx: number, dst: object, dst_idx: number) => Promise<void>)
    }) {
        this.container_class = container_class
        this.element_class = element_class
        this.containers = new Map();
        this.context = null;


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
        if(!this.context)
            return null;

        let current_node : HTMLElement | null = dom_node;

        let element_candidate: HTMLElement | null = null;
        let container_candidate : HTMLElement | null = null;
        while(current_node && current_node.classList) {
            if (current_node === this.context.src_node) { // skip nodes inside the current source to prevent drgging INTO the src element on recursive structures
                return current_node;
            }
            if (!element_candidate && current_node.classList.contains(this.element_class)) {
                element_candidate = current_node;
            }
            if (!container_candidate && current_node.classList.contains(this.container_class)) {
                container_candidate = current_node;
            }
            current_node = current_node.parentElement;
        }
         // for example HTMLDocument - happens in firefox when dragging out of the browser window
        if(current_node && !current_node.classList) {
            return null;
        }
        return element_candidate || container_candidate;
    }
    _lookup_container_for_element(element_node: HTMLElement) : HTMLElement | null {
        let current_node : HTMLElement | null = element_node;
        while(current_node !== null && current_node.classList && !current_node.classList.contains(this.container_class)) {
            current_node = current_node.parentElement;
        }
         // for example HTMLDocument - happens in firefox when dragging out of the browser window
         if(current_node && !current_node.classList) {
            return null;
        }
        return current_node;
    }
    _list_container_elements_in_order(container_node: Element): Iterable<HTMLElement> {
        return container_node.getElementsByClassName(this.element_class) as HTMLCollectionOf<HTMLElement>;
    }

    _move_draghelper_to_mouse(evt) {
        if(!this.context || this.context.drag_helper_on_mouse)
            return;

        this.context.drag_helper.style.position = 'absolute';
        this.context.drag_helper.style.top = (evt.clientY + this.context.offset_y) + 'px';
        this.context.drag_helper.style.left = (evt.clientX + this.context.offset_x) + 'px';
        this.context.drag_helper_on_mouse = true;
    }
    _move_draghelper_into_container(container_node: HTMLElement, next_element_node: HTMLElement | null) {
        if(!this.context)
            return;

        this.context.drag_helper.style.position = 'unset';
        this.context.drag_helper.style.top = 'unset';
        this.context.drag_helper.style.left = 'unset';
        if(next_element_node) {
            container_node.insertBefore(this.context.drag_helper, next_element_node)
        } else {
            container_node.appendChild(this.context.drag_helper);
        }
        this.context.drag_helper_on_mouse = false;
    }

    _on_mouseup(evt: MouseEvent) {
        evt.preventDefault();
        evt.stopPropagation();

        this._try_commit();
    }

    _on_mousemove(evt: MouseEvent) {
        if(!this.context)
            return;

        evt.preventDefault();
        evt.stopPropagation();

        if(this.context.drag_helper_on_mouse) {
            this.context.drag_helper.style.top = (evt.clientY + this.context.offset_y) + 'px';
            this.context.drag_helper.style.left = (evt.clientX + this.context.offset_x) + 'px';
        }

        if(evt.target == this.context.hovered_target)
            return;

        let changed = false;

        this.context.hovered_target = evt.target as HTMLElement;
        let hovered_element = this._lookup_element_for_node(this.context.hovered_target);
        if(hovered_element == this.context.drag_helper) {
            console.error('Got a hover event for the draghelper. This is a BUG!')
            hovered_element = null;
        }

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
                this.context.hovered_next_element = null;
            }
        }
        if(hovered_element != this.context.hovered_next_element) {
            changed = true;
            this.context.hovered_next_element = hovered_element;

            if(hovered_element) {
                let i = 0;
                for(const element of this._list_container_elements_in_order(hovered_container_node)) {
                    if(element == this.context.drag_helper)
                        continue;

                    if(element == hovered_element)
                        break;
                    i += 1;
                }
                this.context.hovered_idx = i;
                console.debug('element', {hovered_element, hovered_container_node, hovered_idx: this.context.hovered_idx})
            }
        }

        if(hovered_container_node != this.context.hovered_container_node) {
            changed = true;
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
            let found = false;
            for(const element of this._list_container_elements_in_order(hovered_container_node)) {
                if(element == this.context.drag_helper)
                    continue;

                const rect = element.getBoundingClientRect()
                if(rect.y > evt.clientY) {
                    this.context.hovered_next_element = element;
                    found = true
                    break;
                }
                i += 1;
            }
            if(!found) {
                this.context.hovered_next_element = null;
            }
            if(this.context.hovered_idx != i)
                changed = true;
            this.context.hovered_idx = i;
            console.debug('container', {hovered_element, hovered_container_node, hovered_idx: this.context.hovered_idx})
        }

        if(!this.context.hovered_container || this.context.hovered_idx === null || this.context.hovered_container == this.context.src_container && (this.context.hovered_idx == this.context.src_idx || this.context.hovered_idx == this.context.src_idx + 1)) {
            this.context.can_drop = false;
        } else if(this.candrop) {
            this.context.can_drop = this.candrop(this.context.hovered_target, this.context.src_container, this.context.src_idx, this.context.hovered_container, this.context.hovered_idx);
        } else {
            this.context.can_drop = true;
        }

        if(changed) {
            if(!this.context.can_drop || this.context.hovered_container == null || this.context.hovered_container_node === null || this.context.hovered_idx === null) {
                this._move_draghelper_to_mouse(evt);
            } else {
                this._move_draghelper_into_container(this.context.hovered_container_node, this.context.hovered_next_element);
            }
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
        if(!this.context.hovered_container || this.context.hovered_idx === null)
            return this._cancel();

        const move_callback = this.move ?? ((_element_node: HTMLElement, _src: object, _src_idx: number, _dst: object, _dst_idx: number) => Promise.resolve());
        Promise.resolve(move_callback(this.context.src_node, this.context.src_container, this.context.src_idx, this.context.hovered_container, this.context.hovered_idx)).then(() => {
            this._stop();
        }, function(error) {
            console.warn('Cancelled drop due to exception in move handler', error);
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

        const parent = this.context.drag_helper.parentNode;
        if(parent !== null)
            parent.removeChild(this.context.drag_helper);
        window.removeEventListener('mouseup', this._on_mouseup);
        window.removeEventListener('mousemove', this._on_mousemove);
        window.removeEventListener('keydown', this._on_keydown);
        this.context = null;
    }

    start_drag(evt: MouseEvent, dom_node: HTMLElement, src_idx: number) {
        if(!dom_node.classList.contains(this.element_class)) {
            console.warn("Ignored drag request of node that is not a drag element");
            return;
        }
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

        // TODO tgr drag_helper zindex
        let drag_helper = dom_node.cloneNode(true) as HTMLElement;
        drag_helper.style.pointerEvents = 'none';
        drag_helper.style.opacity = '0.5';
        const node_style = getComputedStyle(dom_node);
        drag_helper.style.width = parseFloat(node_style.width) + 'px' // - parseFloat(node_style.paddingLeft) - parseFloat(node_style.paddingRight) + 'px';
        drag_helper.style.height = parseFloat(node_style.height) + 'px' // - parseFloat(node_style.paddingTop) - parseFloat(node_style.paddingBottom) + 'px';
        container_node.appendChild(drag_helper)

        const node_bounds = dom_node.getBoundingClientRect();
        let offset_x = node_bounds.x - evt.clientX;
        let offset_y = node_bounds.y - evt.clientY;

        this.context = new _DnDContext(dom_node, drag_helper, container_node, src_container, src_idx, offset_x, offset_y);
        this._move_draghelper_to_mouse(evt)

        window.addEventListener('mouseup', this._on_mouseup);
        window.addEventListener('mousemove', this._on_mousemove);
        window.addEventListener('keydown', this._on_keydown);
    }
}

export default DnDBus;
