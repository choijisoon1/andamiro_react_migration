<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { to: '/main',   label: '홈',      icon: 'home'   },
  { to: '/report', label: '리포트',  icon: 'report' },
  { to: '/advice', label: '조언',    icon: 'advice' },
  { to: '/my',     label: '마이',    icon: 'my'     },
]
</script>

<template>
  <footer class="tabbar">
    <nav class="tabbar__inner">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="tabbar__item"
        :class="{ 'is-active': route.path === tab.to }"
        :aria-current="route.path === tab.to ? 'page' : undefined"
      >
        <span class="tabbar__icon" :data-icon="tab.icon" />
        <span class="tabbar__label">{{ tab.label }}</span>
      </RouterLink>
    </nav>
  </footer>
</template>

<style scoped lang="scss">
.tabbar {
  flex: 0 0 auto;
  background: $white;
}

.tabbar__inner {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
}

.tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 8px;
  border-radius: 10px;
  color: $text-disabled;
  font-size: $font12;
  font-weight: $font-m;
  transition: color 0.15s;
}

.tabbar__item.is-active {
  color: $primary;
}

.tabbar__icon {
  display: block;
  width: 26px;
  height: 26px;
  background-color: $text-disabled;
  mask-repeat: no-repeat;
  mask-size: contain;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
  -webkit-mask-position: center;
  transition: background-color 0.15s;
}

.tabbar__item.is-active .tabbar__icon {
  background-color: $primary;
}

/* 아이콘 — 실제 SVG 경로로 교체 */
.tabbar__icon[data-icon="home"]   { -webkit-mask-image: url('/assets/img/com/ico-home.png');   mask-image: url('/assets/img/com/ico-home.png'); }
.tabbar__icon[data-icon="report"] { -webkit-mask-image: url('/assets/img/com/ico-report.png'); mask-image: url('/assets/img/com/ico-report.png'); }
.tabbar__icon[data-icon="advice"] { -webkit-mask-image: url('/assets/img/com/ico-advice.svg'); mask-image: url('/assets/img/com/ico-advice.svg'); }
.tabbar__icon[data-icon="my"]     { -webkit-mask-image: url('/assets/img/com/ico-my.svg');     mask-image: url('/assets/img/com/ico-my.svg'); }
</style>
