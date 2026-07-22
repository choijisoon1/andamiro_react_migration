<script setup>
defineProps({
  label: { type: String, default: '' },
  for:   { type: String, default: '' },
  hint:  { type: String, default: '' },
  error: { type: String, default: '' },
})
</script>

<template>
  <div class="form-group">
    <label v-if="label" :for="$props.for" class="form-group__label">{{ label }}</label>
    <div class="form-group__control">
      <slot />
    </div>
    <p v-if="error" class="form-group__error">{{ error }}</p>
    <p v-else-if="hint" class="form-group__hint">{{ hint }}</p>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__label {
    font-size: $font16;
    font-weight: $font-sb;
    color: $title;
  }

  &__hint {
    font-size: $font13;
    font-weight: $font-l;
    color: $text-disabled;
  }

  &__error {
    font-size: $font13;
    color: #dc2626;
  }
}
</style>
