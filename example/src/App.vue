<template>
  <div id="app">
    <SortableList :lst="list1"/>
    <SortableList :lst="list2"/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SortableList from './components/SortableList.vue';

export default Vue.extend({
  name: 'App',
  components: {
    SortableList
  },
  data() { return {
    list1: ['asdf', 'bsdf', 'csdf'],
    list2: ['foo', 'bar', 'baz'],
  }}
});
</script>

<style>
</style>
