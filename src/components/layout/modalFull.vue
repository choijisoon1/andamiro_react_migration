<script setup>
import { useSlots } from 'vue'
defineProps({
  show:       { type: Boolean, default: false },
  title:      { type: String,  default: ''   },
  modalClass: { type: String,  default: ''   },
  bodyClass:  { type: String,  default: ''   },
})
defineEmits(['close'])
const slots = useSlots()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay">
        <div :class="['modal-full', modalClass]" role="dialog" aria-modal="true">
          <div class="modal-full__head">
            <h3 v-if="title" class="modal-full__title">{{ title }}</h3>
            <button class="modal-full__close" @click="$emit('close')">닫기</button>
          </div>
          <div :class="['modal-full__body', bodyClass]">
            <slot />
          </div>
          <div v-if="slots.footer" class="modal-full__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

// ── 오버레이 ──
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

// ── 풀 모달 ──
.modal-full {
  width: 100%;
  height: 100%;
  background: $white;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 20px;
    border-bottom: 0;
    flex-shrink: 0;
  }

  &__title {
    font-size: $font18;
    font-weight: $font-sb;
    color: $title;
  }

  &__close {
    font-size: 0;
    color: $text-sub;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    position: absolute;
    top:10px;
    right:10px;
    width:40px; height:40px;
    background:url("/assets/img/com/ico_close.svg") no-repeat center / 18px;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 40px 24px 20px;
  }

  &__footer {
    padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
    flex-shrink: 0;

    .btn-ctp {
      width: 100%;
      height: 56px;
      border-radius: 100px;
      font-size: $font18;
      font-weight: $font-sb;
      background: $primary;
      color: $white;
      border: none;
      cursor: pointer;
    }
  }
}

// ── 트랜지션 ──
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
  .modal-full { transition: transform 0.25s ease; }
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  .modal-full { transform: translateY(20px); }
}
</style>
