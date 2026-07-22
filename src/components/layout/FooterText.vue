<script setup>
defineProps({
  subText:        { type: String,  default: ''       },
  mainText:       { type: String,  default: ''       },
  label:          { type: String,  default: '시작하기' },
  disabled:       { type: Boolean, default: false    },
  pointer:        { type: Boolean, default: false    },
  pointerVisible: { type: Boolean, default: false    },
})
defineEmits(['click'])
</script>

<template>
  <footer :class="pointer ? null : 'button-ctp'">
    <div v-if="pointer" class="emotion-footer-pointer" :class="{ 'is-visible': pointerVisible }" aria-hidden="true" />
    <component :is="pointer ? 'section' : 'div'" :class="pointer ? 'btn-content' : 'button-content'">
      <div class="text-group">
        <p>{{ subText }}</p>
        <p>{{ mainText }}</p>
      </div>
      <button class="btn-ctp" :disabled="disabled" @click="$emit('click')">
        {{ label }}
      </button>
    </component>
  </footer>
</template>
