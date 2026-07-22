<script setup>
import FormGroup from '@/components/common/FormGroup.vue'

const props = defineProps({
  nickname:   { type: String, default: '' },
  ageGroup:   { type: String, default: '' },
  gender:     { type: String, default: '' },
  fields:     { type: Array, default: () => ['nickname', 'ageGroup', 'gender'] },
  showLabels: { type: Boolean, default: false },
  idPrefix:   { type: String, default: 'profile' },
})

const emit = defineEmits(['update:nickname', 'update:ageGroup', 'update:gender'])

const ageGroups = ['10대', '20대', '30대', '40대', '50대', '60대 이상']
const genders = [
  { value: '남성', img: '/assets/img/login/img-m.png' },
  { value: '여성', img: '/assets/img/login/img-w.png' },
]

const includes = field => props.fields.includes(field)
</script>

<template>
  <div class="form-content profile-form">
    <FormGroup
      v-if="includes('nickname')"
      :label="showLabels ? '닉네임' : ''"
      :for="`${idPrefix}Nickname`"
    >
      <div class="profile-form__input-wrap">
        <label v-if="!showLabels" class="sr-only" :for="`${idPrefix}Nickname`">닉네임</label>
        <input
          :id="`${idPrefix}Nickname`"
          :value="nickname"
          type="text"
          placeholder="닉네임"
          maxlength="10"
          @input="emit('update:nickname', $event.target.value)"
        />
        <span class="input-count">{{ nickname.length }}/10</span>
      </div>
    </FormGroup>

    <FormGroup v-if="includes('ageGroup')" :label="showLabels ? '연령대' : ''">
      <fieldset class="tyep-button">
        <legend class="sr-only">연령대 선택</legend>
        <label
          v-for="age in ageGroups"
          :key="age"
          class="radio"
          :for="`${idPrefix}Age${age}`"
        >
          <input
            :id="`${idPrefix}Age${age}`"
            type="radio"
            :name="`${idPrefix}Age`"
            :value="age"
            :checked="ageGroup === age"
            @change="emit('update:ageGroup', age)"
          />
          <span>{{ age }}</span>
        </label>
      </fieldset>
    </FormGroup>

    <FormGroup v-if="includes('gender')" :label="showLabels ? '성별' : ''">
      <fieldset class="tyep-button ico">
        <legend class="sr-only">성별 선택</legend>
        <label
          v-for="item in genders"
          :key="item.value"
          class="radio"
          :for="`${idPrefix}Gender${item.value}`"
        >
          <input
            :id="`${idPrefix}Gender${item.value}`"
            type="radio"
            :name="`${idPrefix}Gender`"
            :value="item.value"
            :checked="gender === item.value"
            @change="emit('update:gender', item.value)"
          />
          <div class="radio-face">
            <img :src="item.img" :alt="item.value" />
            <span class="radio-text">{{ item.value }}</span>
          </div>
        </label>
      </fieldset>
    </FormGroup>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/tokens' as *;

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

.profile-form__input-wrap {
  position: relative;

  input { padding-right: 58px; }

  .input-count {
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    color: $text-disabled;
    font-size: $font13;
  }
}
</style>
