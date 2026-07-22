<script setup>
defineProps({
  label:          { type: String,  default: '다음'  },
  disabled:       { type: Boolean, default: false   },
  secondaryLabel: { type: String,  default: ''      },
  secondaryDisabled: { type: Boolean, default: false },
})
defineEmits(['click', 'secondary-click'])
</script>

<template>
  <footer class="button-ctp">
    <div class="button-content" :class="{ 'button-content--duo': secondaryLabel }">
      <slot name="above" />
      <button
        v-if="secondaryLabel"
        class="btn-ctp btn-ctp--secondary"
        :disabled="secondaryDisabled"
        @click="$emit('secondary-click')"
      >
        {{ secondaryLabel }}
      </button>
      <button class="btn-ctp" :disabled="disabled" @click="$emit('click')">
        {{ label }}
      </button>
    </div>
  </footer>
</template>
