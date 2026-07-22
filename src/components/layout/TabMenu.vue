<script setup>
defineProps({
  tabs:       { type: Array,  required: true },
  modelValue: { type: String, required: true },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <section class="tab-menu">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-menu__item"
      :class="{ 'is-active': modelValue === tab.key }"
      @click="$emit('update:modelValue', tab.key)"
    >{{ tab.label }}</button>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.tab-menu {
  display: flex;
  flex-direction:row;
  flex:0 0 43px;
  gap: 0;
  padding:0 ;
  position: sticky;
  top: 0;
  background: $white;
  z-index: 10;
  width:calc(100% + 48px );
  height:43px;
  margin-left:-24px;
  margin-bottom:10px;
}

.tab-menu__item {
  flex:1;
  width:100%;
  padding: 12px 0;
  font-size: $font14;
  font-weight: $font-m;
  color: #bbb;
  cursor: pointer;
  background: $white;
  transition: all 0.15s;

  &.is-active {
    color: $primary;
    font-weight: $font-b;
    border-bottom:2px solid $primary;
  }
}
</style>
