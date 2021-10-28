<template>
  <ul class="container-col">
    <li v-for="el, idx in lst" ref="elements" :key="el+idx" class="element-col"  @mousedown.left.prevent.stop="on_mousedown($event, idx)">{{el}}</li>
  </ul>
</template>

<script>

import {bus_col} from '../dragbus';

export default {
  name: 'HelloWorld',
  props: {
    lst: Array
  },
  mounted() {
    bus_col.register_container(this.$el, this);
  },
  beforeDestroy() {
    bus_col.unregister_container(this.$el, this);
  },
  methods: {
    on_mousedown(evt, idx) {
      bus_col.start_drag(evt, this.$refs.elements[idx], idx);
    }
  }
}
</script>

<style>
.element-col {
  height: 20px;
  padding-top: 10px;
  padding-bottom: 10px;
  background-color: yellow;
  margin-top: 20px;
}
.container-col {
  background-color: greenyellow;
  padding-bottom: 30px;
}
</style>
