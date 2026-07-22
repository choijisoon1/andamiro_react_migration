<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  title:       { type: String, default: '당신의 하루를 들려주길\n기다리고 있어요!' },
  description: { type: String, default: '작은 기록이 모여 당신의 마음 지도가 완성돼요.' },
  buttonLabel: { type: String, default: '' },
  buttonTo:    { type: String, default: '/chat' },
  wrapperClass: { type: [String, Array, Object], default: '' },
  iconWrapperClass: { type: [String, Array, Object], default: '' },
  iconBaseClass: { type: String, default: 'no-data__icon' },
  iconClass: { type: [String, Array, Object], default: '' },
})

const router = useRouter()
const descriptionLines = computed(() => props.description.split(/<br\s*\/?>/i))
</script>

<template>
  <section :class="['no-data', wrapperClass]" aria-label="데이터 없음 안내">
    <div>
      <div class="text-content">
        <span :class="['no-data__icon-wrap', iconWrapperClass]" aria-hidden="true">
          <span :class="[iconBaseClass, iconClass]"></span>
        </span>
        <div class="text-group">
          <p><em class="no-data__title">{{ title }}</em></p>
          <p>
            <template v-for="(line, index) in descriptionLines" :key="`${line}-${index}`">
              <br v-if="index > 0" />
              {{ line }}
            </template>
          </p>
        </div>
        <div v-if="buttonLabel" class="btn-content">
          <button type="button" class="btn-sub" @click="router.push(buttonTo)">
            {{ buttonLabel }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.no-data__title {
  white-space: pre-line;
}

.no-data__icon-wrap {
  display: block;
}

.no-data__icon,
:global(.no-my-date_icon) {
  display: block;
  width: 210px;
  height: 210px;
  margin: 0 auto;
  background: url("/assets/img/com/img-none.png") no-repeat center center / 100% auto;
}

:global(.bg-\[\#F7F8FA\]) {
  background-color: #F7F8FA !important;
}

:global(.bg-\[\#EEF3FF\]) {
  background-color: #EEF3FF !important;
  border-radius:50%;
}

:global(.w-9) {
  width: 80px !important;
}

:global(.h-9) {
  height: 80px !important;
}

:global(.bg-\[url\(\'\/assets\/img\/my\/ico-book\.png\'\)\]) {
  background-image: url("/assets/img/my/ico-book.png") !important;

}

:global(.bg-no-repeat) {
  background-repeat: no-repeat !important;
}

:global(.bg-center) {
  background-position: center !important;
}

:global(.bg-contain) {
  background-size: contain !important;
}
</style>
