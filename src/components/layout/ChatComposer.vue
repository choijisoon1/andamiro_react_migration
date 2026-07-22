<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '질문을 입력해 보세요',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  canSend: {
    type: Boolean,
    default: false,
  },
  showAttach: {
    type: Boolean,
    default: false,
  },
  showVoice: {
    type: Boolean,
    default: false,
  },
  isVoiceOn: {
    type: Boolean,
    default: false,
  },
  voiceAutoSendSeconds: {
    type: Number,
    default: 2,
  },
  accept: {
    type: String,
    default: 'image/*',
  },
})

const emit = defineEmits([
  'update:modelValue',
  'send',
  'attach',
  'file-change',
  'toggle-voice',
  'stop-voice',
  'input',
  'keydown',
])

const textarea = ref(null)
const fileInput = ref(null)

watch(
  () => props.modelValue,
  () => nextTick(autoResize)
)

function autoResize() {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
}

function handleInput(event) {
  emit('update:modelValue', event.target.value)
  autoResize()
  emit('input', event)
}

function handleFileChange(event) {
  emit('file-change', event)
}

function openFilePicker() {
  fileInput.value?.click()
}

defineExpose({
  autoResize,
  openFilePicker,
})
</script>

<template>
  <footer class="chat-composer">
    <div v-if="showVoice && isVoiceOn" class="chat-voice-banner">
      <span class="chat-voice-banner__pulse" aria-hidden="true"></span>
      <span class="chat-voice-banner__text">음성 대화 중 — 말씀하신 뒤 {{ voiceAutoSendSeconds }}초 뒤 자동 전송돼요</span>
      <button type="button" class="chat-voice-banner__cancel" @click="$emit('stop-voice')">취소</button>
    </div>

    <div class="chat-composer__row">
      <button
        v-if="showAttach"
        type="button"
        class="chat-composer__attach"
        aria-label="사진 첨부"
        @click="$emit('attach')"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M9 4v10M4 9h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </button>

      <div class="chat-composer__field">
        <label class="chat-visually-hidden" for="chatInput">메시지 입력</label>
        <textarea
          id="chatInput"
          ref="textarea"
          :value="modelValue"
          class="chat-composer__input"
          rows="1"
          :placeholder="placeholder"
          autocomplete="off"
          :disabled="disabled"
          @input="handleInput"
          @keydown="$emit('keydown', $event)"
        />
        <button
          v-if="showVoice"
          type="button"
          class="chat-composer__mic"
          :class="{ 'is-recording': isVoiceOn }"
          :aria-pressed="String(isVoiceOn)"
          aria-label="음성 대화"
          @click="$emit('toggle-voice')"
        >
          음성대화
        </button>
        <button type="button" class="chat-composer__send" :disabled="!canSend" aria-label="보내기" @click="$emit('send')">입력</button>
      </div>
    </div>

    <input
      v-if="showAttach"
      ref="fileInput"
      type="file"
      :accept="accept"
      class="chat-visually-hidden"
      tabindex="-1"
      aria-hidden="true"
      @change="handleFileChange"
    />
  </footer>
</template>

<style scoped lang="scss">
.chat-composer {
  flex: 0 0 auto;
  padding: 20px 16px;
  padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
  background: $white;
  border-top: 1px solid $border-e;
}

.chat-composer__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-composer__field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background: #f5f5f8;
  border-radius: $radius-r;
  padding: 0 10px 0 14px;
  gap: 4px;

  &:focus-within {
    outline: 2px solid $primary;
    outline-offset: 2px;
  }
}

.chat-composer__input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  box-shadow: none;
  resize: none;
  overflow-y: auto;
  font-size: max(16px, $font16);
  line-height: 1.5;
  color: $title;
  font-family: inherit;
  max-height: 60px;

  &:focus,
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }

  &::placeholder {
    color: $text-disabled;
  }

  &:disabled {
    opacity: 0.6;
  }
}

.chat-composer__attach,
.chat-composer__send {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size:0;
}

.chat-composer__attach {
  color: $text-sub;
  transition: color 0.15s;
}

.chat-composer__mic {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: $text-sub;
  transition: color 0.15s;
  font-size:0;

  &::before {
    content:"";
    display:block;
    width:24px; height:24px;
    background-color:$text-disabled;
    -webkit-mask-image:url("/assets/img/com/ico-mike.svg");
    -webkit-mask-repeat:no-repeat;
    -webkit-mask-size:auto 20px;
    -webkit-mask-position:center;
    mask-image:url("/assets/img/com/ico-mike.svg");
    mask-repeat:no-repeat;
    mask-size:auto 20px;
    mask-position:center;

  }

  &.is-recording {
    color: #e53935;
  }
}

.chat-composer__send {
  border-radius: 50%;
  background: $primary;
  color: $white;
  transition: background 0.2s;


  &::before {
    content:"";
    display:block;
    width:24px; height:24px;
    background-color:$white;
    -webkit-mask-image:url("/assets/img/com/ico-top.svg");
    -webkit-mask-repeat:no-repeat;
    -webkit-mask-size:auto 14px;
    -webkit-mask-position:center;
    mask-image:url("/assets/img/com/ico-top.svg");
    mask-repeat:no-repeat;
    mask-size:auto 14px;
    mask-position:center;

  }

  &:disabled {
    background: $bg-disabled;
  }
}

.chat-voice-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #fff3f3;
  border-radius: $radius-md;
  font-size: $font13;
  color: #e53935;
}

.chat-voice-banner__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e53935;
  flex-shrink: 0;
  animation: pulse-dot 1s infinite;
}

.chat-voice-banner__text {
  flex: 1;
}

.chat-voice-banner__cancel {
  font-size: $font13;
  color: $text-sub;
  text-decoration: underline;
  flex-shrink: 0;
}

.chat-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.4;
    transform: scale(0.7);
  }
}
</style>
