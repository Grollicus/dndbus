<template>
  <ul class="container">
    <li v-for="el, idx in lst" ref="elements" :key="el" class="element"  @mousedown.prevent.stop="on_mousedown($event, idx)">{{el}}</li>
  </ul>
</template>

<script>

import bus from '../dragbus';
console.log('bus', bus);

export default {
  name: 'HelloWorld',
  props: {
    lst: Array
  },
  mounted() {
    bus.register_container(this.$el, this);
  },
  beforeDestroy() {
    bus.unregister_container(this.$el, this);
  },
  methods: {
    on_mousedown(evt, idx) {
      bus.start_drag(evt, this.$refs.elements[idx], idx);
    }
  }
}
</script>

<style>
.element {
  height: 20px;
  padding-top: 10px;
  padding-bottom: 10px;
  background-color: yellow;
  margin-top: 20px;
}
.container {
  background-color: greenyellow;
  padding-bottom: 30px;
}
.preview {
  background-color: #4444ff;
}
.hover {
  background-color: #aaaaff;
}
</style>
