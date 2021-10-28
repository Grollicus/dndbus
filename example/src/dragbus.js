/*eslint-disable*/

import Dndbus from "../../build/dndbus.js"

let bus_col = new Dndbus('container-col', 'element-col', {
    move(element_node, src, src_idx, dst, dst_idx) {
        console.log('move', src.lst, src_idx, dst.lst, dst_idx);
        if(src == dst && src_idx < dst_idx) {
            dst_idx -= 1; // will move 1 to the front b/c src element got removed
        }
        const to_move = src.lst.splice(src_idx, 1)[0];
        dst.lst.splice(dst_idx, 0, to_move);
    },
    hover_class: 'hover',
    preview_class: 'preview',
});

let bus_row = new Dndbus('container-row', 'element-row', {
    move(element_node, src, src_idx, dst, dst_idx) {
        console.log('move', src.lst, src_idx, dst.lst, dst_idx);
        if(src == dst && src_idx < dst_idx) {
            dst_idx -= 1; // will move 1 to the front b/c src element got removed
        }
        const to_move = src.lst.splice(src_idx, 1)[0];
        dst.lst.splice(dst_idx, 0, to_move);
    },
    hover_class: 'hover',
    preview_class: 'preview',
});

export {
    bus_row,
    bus_col
};
