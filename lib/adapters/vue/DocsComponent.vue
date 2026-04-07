<!-- Vue/Nuxt adapter — renders any DocsifyTemplate component as static HTML. -->
<!-- Usage: <DocsComponent component="EntitySchema" :data="{ name: 'User', fields: [...] }" /> -->

<script setup>
import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { components } from '../../core/registry.js';

const props = defineProps({
  component: String,
  data: Object
});

const Component = components[props.component];
const html = Component ? renderToString(h(Component, { data: props.data })) : `<!-- not found: ${props.component} -->`;
</script>

<template>
  <div v-html="html" />
</template>
