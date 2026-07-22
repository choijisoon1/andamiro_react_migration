<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
})

defineEmits(['click'])
</script>

<template>
  <button type="button" class="modal-button" @click="$emit('click', $event)">
    <span
      class="modal-button__icon"
      :class="`modal-button__icon--${icon}`"
      aria-hidden="true"
    ></span>
    <span class="modal-button__text">
      <em>{{ title }}</em>
      <span>{{ description }}</span>
    </span>
  </button>
</template>
