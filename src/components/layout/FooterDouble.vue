<script setup>
defineProps({
  labelLeft:    { type: String,  default: '취소'  },
  labelRight:   { type: String,  default: '확인'  },
  disabledLeft: { type: Boolean, default: false   },
  disabledRight:{ type: Boolean, default: false   },
})
defineEmits(['left', 'right'])
</script>

<template>
  <footer class="button-ctp">
    <div class="button-content button-content--double">
      <button class="btn-line" :disabled="disabledLeft" @click="$emit('left')">
        {{ labelLeft }}
      </button>
      <button class="btn-ctp" :disabled="disabledRight" @click="$emit('right')">
        {{ labelRight }}
      </button>
    </div>
  </footer>
</template>
