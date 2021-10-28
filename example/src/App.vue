<template>
  <div id="app">
    <button @click="type='row'" :disabled="type=='row'">Row</button>
    <button @click="type='col'" :disabled="type=='col'" style="margin-left: 0.5em;">Col</button>

    <SortableList v-if="type=='col'" :lst="list1"/>
    <SortableList v-if="type=='col'" :lst="list2"/>

    <SortableRow v-if="type=='row'" :lst="list1"/>
    <SortableRow v-if="type=='row'" :lst="list2"/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import SortableList from './components/SortableCol.vue';
import SortableRow from './components/SortableRow.vue';

export default Vue.extend({
  name: 'App',
  components: {
    SortableList,
    SortableRow,
  },
  data() { return {
    type: 'col',
    list1: ['asdf', 'bsdf', 'csdf', 'dsdf', 'esdf', 'fsdf', 'gsdf', 'hsdf', 'isdf'],
    list2: ['foo', 'bar', 'baz', 'f0o', 'b4r', 'b4z', 'f00', 'b44', 'b43'],
  }}
});
</script>

<style>
.preview {
  background-color: #4444ff;
}
.hover {
  background-color: #aaaaff;
}
</style>
