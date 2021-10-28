<template>
  <div class="container-row">
    <div v-for="el, idx in lst" ref="elements" :key="el+idx" class="element-row"  @mousedown.left.prevent.stop="on_mousedown($event, idx)">{{el}}</div>
  </div>
</template>

<script>

import {bus_row} from '../dragbus';

export default {
  name: 'HelloWorld',
  props: {
    lst: Array
  },
  mounted() {
    bus_row.register_container(this.$el, this);
  },
  beforeDestroy() {
    bus_row.unregister_container(this.$el, this);
  },
  methods: {
    on_mousedown(evt, idx) {
      bus_row.start_drag(evt, this.$refs.elements[idx], idx);
    }
  }
}
</script>

<style>
.element-row {
  flex-basis: content;

  height: 20px;
  padding: 10px;
  background-color: yellow;
  margin-left: 20px;
  margin-right: 20px;
}
.container-row {
  display:flex;
  flex-wrap: wrap;
  background-color: greenyellow;
  padding-bottom: 30px;
  padding-right: 30px;
}
</style>
