<script setup>
defineProps({
  show:        { type: Boolean, default: false },
  icon:        { type: String,  default: ''    },
  title:       { type: String,  default: ''    },
  titleClass:  { type: String,  default: ''    },
  description: { type: String,  default: ''    },
  cancelLabel: { type: String,  default: ''    },
  btnLabel:    { type: String,  default: '확인' },
})
defineEmits(['close', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-bottom" role="dialog" aria-modal="true">
          <div class="modal-bottom__body">
            <span v-if="icon" class="modal-bottom__icon">{{ icon }}</span>
            <strong v-if="title" :class="['modal-bottom__title', titleClass]">{{ title }}</strong>
            <p v-if="description || $slots.description" class="modal-bottom__desc">
              <slot name="description">{{ description }}</slot>
            </p>
            <slot />
          </div>
          <div class="modal-bottom__footer">
            <slot name="footer">
              <button v-if="cancelLabel" class="btn-ctp btn-ctp--secondary" @click="$emit('close')">
                {{ cancelLabel }}
              </button>
              <button class="btn-ctp" @click="$emit('confirm')">{{ btnLabel }}</button>
            </slot>
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
  align-items: flex-end;
}

// ── 바텀 시트 ──
.modal-bottom {
  width: 100%;
  background: $white;
  border-radius: 24px 24px 0 0;
  padding: 24px 24px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 24px;

  &__body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }

  &__icon {
    font-size: 48px;
    line-height: 1;
  }

  &__title {
    padding-top: 16px;
    font-size: $font20;
    font-weight: $font-b;
    color: $title;

    &.title-l {  padding-top:0; width:100%; text-align:left;  font-size: $font18; }
  }

  &__desc {
    font-size: $font14;
    color: $text-sub;
    line-height: 1.55;
  }

  &__footer {

    display:flex;
    gap:10px;

    .btn-ctp {
      width: 100%;
      height: 56px;
      font-size: $font16;
      font-weight: $font-sb;
      background: $primary;
      color: $white;
      border: none;
      cursor: pointer;

      &--secondary {
        background: $white;
        color: $primary;
        border: 1px solid $primary;
      }
    }
  }
}

// ── 트랜지션 ──
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
  .modal-bottom { transition: transform 0.25s ease; }
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  .modal-bottom { transform: translateY(100%); }
}
</style>
