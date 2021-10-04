/*eslint-disable*/

import Dndbus from "../../build/dndbus.js"

let bus = new Dndbus('container', 'element', {
        move(element_node, src, src_idx, dst, dst_idx) {
            console.log('move', src.lst, src_idx, dst.lst, dst_idx);
            const to_move = src.lst.splice(src_idx, 1)[0];
            dst.lst.splice(dst_idx, 0, to_move);
        }
});

export default bus;
