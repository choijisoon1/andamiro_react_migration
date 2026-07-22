<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'list',
  },
  count: {
    type: Number,
    default: 3,
  },
})

const isExchangeList = computed(() => ['exchange-list', 'list'].includes(props.type))
</script>

<template>
  <section
    class="loading-skeleton"
    :class="`loading-skeleton--${type}`"
    aria-busy="true"
    aria-live="polite"
  >
    <div
      v-for="item in count"
      :key="`${type}-${item}`"
      class="loading-skeleton__item"
    >
      <template v-if="isExchangeList">
        <span class="loading-skeleton__thumb"></span>
        <div class="loading-skeleton__body">
          <span class="loading-skeleton__line loading-skeleton__line--title"></span>
          <span class="loading-skeleton__line loading-skeleton__line--meta"></span>
          <span class="loading-skeleton__line loading-skeleton__line--short"></span>
        </div>
        <span class="loading-skeleton__action"></span>
      </template>

      <template v-else-if="type === 'card'">
        <div class="loading-skeleton__card">
          <span class="loading-skeleton__line loading-skeleton__line--title"></span>
          <span class="loading-skeleton__line loading-skeleton__line--meta"></span>
          <span class="loading-skeleton__line loading-skeleton__line--meta"></span>
          <span class="loading-skeleton__line loading-skeleton__line--short"></span>
        </div>
      </template>

      <template v-else-if="type === 'result'">
        <div class="loading-skeleton__result">
          <span class="loading-skeleton__result-hero"></span>
          <span class="loading-skeleton__line loading-skeleton__line--title"></span>
          <span class="loading-skeleton__line loading-skeleton__line--meta"></span>
          <span class="loading-skeleton__line loading-skeleton__line--short"></span>
        </div>
      </template>

      <template v-else>
        <div class="loading-skeleton__card">
          <span class="loading-skeleton__line loading-skeleton__line--title"></span>
          <span class="loading-skeleton__line loading-skeleton__line--meta"></span>
          <span class="loading-skeleton__line loading-skeleton__line--short"></span>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped lang="scss">
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.loading-skeleton__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 24px;
  border-bottom: 1px solid #e7ebf1;
}

.loading-skeleton__thumb,
.loading-skeleton__action,
.loading-skeleton__line,
.loading-skeleton__card,
.loading-skeleton__result-hero {
  background: linear-gradient(90deg, #e9ecef 25%, #f3f4f6 50%, #e9ecef 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.loading-skeleton__thumb {
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border-radius: 12px;
}

.loading-skeleton__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.loading-skeleton__line {
  display: block;
  height: 12px;
  border-radius: 999px;
}

.loading-skeleton__line--title { width: 62%; height: 16px; }
.loading-skeleton__line--meta  { width: 84%; }
.loading-skeleton__line--short { width: 44%; }

.loading-skeleton__action {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.loading-skeleton__card {
  width: 100%;
  padding: 20px;
  border-radius: 16px;
}

.loading-skeleton__card .loading-skeleton__line + .loading-skeleton__line {
  margin-top: 10px;
}

.loading-skeleton__result {
  width: 100%;
  padding: 24px;
  border-radius: 20px;
}

.loading-skeleton__result-hero {
  display: block;
  width: 100%;
  height: 164px;
  margin-bottom: 18px;
  border-radius: 20px;
}

.loading-skeleton--card .loading-skeleton__item,
.loading-skeleton--result .loading-skeleton__item {
  border-bottom: 0;
  padding: 0;
}

@media (prefers-reduced-motion: reduce) {
  .loading-skeleton__thumb,
  .loading-skeleton__action,
  .loading-skeleton__line,
  .loading-skeleton__card,
  .loading-skeleton__result-hero {
    animation: none;
  }
}
</style>
