<script setup>
// -------------------------------------------------------
// [임포트]
// ref·computed: Vue 반응형 상태 도구
// useRouter: 페이지 이동 함수 제공
// useChatStore: 감정·텍스트를 다음 화면까지 유지하는 전역 스토어
// PageLayout: 헤더+바디 틀 공통 컴포넌트
// FooterText: 텍스트 2줄 + 버튼 형태의 공통 푸터 컴포넌트
// -------------------------------------------------------
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import PageLayout from '@/components/layout/PageLayout.vue'
import FooterText from '@/components/layout/FooterText.vue'

const chat   = useChatStore() // 선택한 감정을 ResultView까지 전달할 스토어
const router = useRouter()    // 다음 화면으로 이동할 때 사용

// -------------------------------------------------------
// [감정 목록]
// type: CSS 배경·이미지 파일명에 사용되는 키
// label: 화면에 표시되는 한글 텍스트
// weatherLabel: 추후 날씨 아이콘 연동 시 사용 (현재 미사용)
// ref()로 감싸는 이유: 선택 시 배열 순서를 바꿔 애니메이션 처리하기 위해
// -------------------------------------------------------
const emotions = ref([
  { type: 'best',   label: '최고예요',   weatherLabel: '최고예요'  },
  { type: 'good',   label: '좋아요',     weatherLabel: '조금흐림' },
  { type: 'normal', label: '보통이에요',  weatherLabel: '흐림'     },
  { type: 'bad',    label: '별로에요',   weatherLabel: '별로예요'  },
  { type: 'worst',  label: '최악이에요',  weatherLabel: '최악이에요'},
])

// 현재 선택된 감정 객체 (null이면 아무것도 선택 안 된 상태)
const selected = ref(null)

// -------------------------------------------------------
// [배경 클래스]
// #bodyWrap에 붙는 클래스를 동적으로 계산
// 'emotion bg-best' 처럼 선택 감정에 따라 배경색이 바뀜
// 아무것도 선택 안 했으면 'emotion bg-none' (중립 배경)
// 실제 색상은 _chat.scss의 .bg-{type} 규칙에 정의돼 있음
// -------------------------------------------------------
const bodyClass = computed(() =>
  `emotion ${selected.value ? 'bg-' + selected.value.type : 'bg-none'}`
)

// -------------------------------------------------------
// [미리보기 카드]
// previewCaption: 선택된 감정 이름. 없으면 빈 문자열 (스크린리더용 aria-live 영역)
// previewImage: 선택된 감정 이미지 경로. 없으면 중립 이미지
// -------------------------------------------------------
const previewCaption = computed(() => selected.value?.label ?? '• • •')
const previewImage   = computed(() =>
  selected.value
    ? `/assets/img/emotion/img-${selected.value.type}.png`
    : '/assets/img/emotion/img-none.png'
)

// -------------------------------------------------------
// [감정 선택]
// 1. selected를 클릭한 감정으로 업데이트
// 2. 선택된 항목을 배열 맨 앞으로 이동 (idx > 0 조건: 이미 맨 앞이면 건너뜀)
// 3. TransitionGroup이 배열 순서 변화를 감지해 FLIP 슬라이드 애니메이션 실행
// -------------------------------------------------------
function selectEmotion(emotion) {
  selected.value = emotion
  const idx = emotions.value.findIndex(e => e.type === emotion.type)
  if (idx > 0) {
    emotions.value.splice(idx, 1)  // 현재 위치에서 제거
    emotions.value.unshift(emotion) // 맨 앞에 삽입
  }
}

// -------------------------------------------------------
// [다음 화면으로 이동]
// 선택된 감정 정보를 chatStore에 저장한 뒤 /chat(텍스트 입력 화면)으로 이동
// chatStore에 저장하는 이유: URL 쿼리 파라미터 없이 ResultView까지 데이터를 유지하기 위해
// -------------------------------------------------------
function startChat() {
  if (!selected.value) return
  chat.emotion      = selected.value.type  // ex) 'best'
  chat.emotionLabel = selected.value.label // ex) '최고예요'
  router.push('/chat')
}
</script>

<template>
  <!--
    PageLayout: 공통 레이아웃 컴포넌트
    - :body-class → #bodyWrap에 동적 클래스 적용 (배경색 변경)
    - hide-header → 이 화면에서만 상단 헤더를 숨김 (전체 화면 감정 선택 UX)
    - #body 슬롯 → main + footer를 자유롭게 배치하기 위해 기본 슬롯 대신 사용
  -->
  <PageLayout :body-class="bodyClass" hide-header>
    <template #body>
      <main>
        <!-- 안내 텍스트 영역 -->
        <!-- aria-labelledby: 섹션 제목을 스크린리더가 읽을 수 있도록 연결 -->
        <section class="text-content" aria-labelledby="emotion-screen-title">
          <div class="text-group">
            <span id="emotion-screen-sub">가장 가까운 감정을 골라주세요</span>
            <em id="emotion-screen-title">지금 기분이 어때요?</em>
          </div>
        </section>

        <!-- 선택된 감정 미리보기 카드 -->
        <!-- aria-live="polite": 감정 선택 시 스크린리더가 변경 내용을 자동으로 읽어줌 -->
        <section class="emotion-content" aria-label="선택한 감정 미리보기">
          <div class="emotion-preview-card" aria-live="polite">
            <!-- 선택된 감정 이름 텍스트 (미선택 시 • • • 장식 표시) -->
            <p class="emotion-preview-caption" :aria-hidden="!selected">{{ previewCaption }}</p>
            <!-- 감정 이미지: 장식용이라 aria-hidden으로 스크린리더에서 제외 -->
            <div class="emotion-preview-emoji" aria-hidden="true">
              <span class="emotion-preview-emoji__icon">
                <img class="emotion-preview-image" :src="previewImage" alt="선택된 감정" />
              </span>
            </div>
          </div>
        </section>

        <!-- 감정 선택 버튼 목록 -->
        <section class="btn-content" aria-label="감정 선택">
          <!--
            TransitionGroup: 배열 순서가 바뀔 때 각 버튼의 이동을 자동으로 애니메이션 처리
            - tag="div" → 실제 DOM에 div.btn-group으로 렌더링
            - name="emotion-list" → CSS 클래스 .emotion-list-move 로 이동 트랜지션 적용
            - role="group" + aria-labelledby → 버튼 그룹임을 스크린리더에 알림
            - aria-live="polite" → 순서 변경 시 스크린리더에 알림
          -->
          <TransitionGroup
            tag="div"
            name="emotion-list"
            class="btn-group"
            role="group"
            aria-labelledby="emotion-screen-title"
            aria-live="polite"
          >
            <!--
              감정 버튼 하나하나
              - :key="e.type" → TransitionGroup이 각 버튼을 추적하는 고유 키
              - :data-emotion-type → CSS에서 배경 아이콘 이미지를 지정하는 데 사용
              - :class is-active → 선택된 버튼에 테두리 강조 스타일 적용
              - :aria-pressed → 토글 상태를 스크린리더에 전달 ("true"/"false")
              - emotion-option__label → 텍스트는 CSS로 시각적으로 숨김 처리
                                        (버튼 안에 아이콘만 보이지만 스크린리더는 읽을 수 있음)
            -->
            <button
              v-for="e in emotions"
              :key="e.type"
              type="button"
              class="emotion-option"
              :data-emotion-type="e.type"
              :class="{ 'is-active': selected?.type === e.type }"
              :aria-pressed="String(selected?.type === e.type)"
              @click="selectEmotion(e)"
            >
              <span class="emotion-option__label">{{ e.label }}</span>
            </button>
          </TransitionGroup>
        </section>
      </main>

      <!--
        FooterText 공통 푸터 컴포넌트
        - pointer → 푸터 상단에 삼각형 포인터 표시 (감정 버튼 영역과 시각적으로 연결)
        - sub-text / main-text → 버튼 왼쪽에 표시할 안내 문구 2줄
        - :disabled="!selected" → 감정 선택 전에는 버튼 비활성화
        - @click → startChat 함수 호출
      -->
      <FooterText
        pointer
        :pointer-visible="!!selected"
        sub-text="오늘의 감정톡"
        main-text="감정 선택하고 대화 시작하기"
        label="시작하기"
        :disabled="!selected"
        @click="startChat"
      />
    </template>
  </PageLayout>
</template>

<style lang="scss">
/* EmotionView 전용 스타일은 _chat.scss에 모아서 관리
   scoped가 아닌 이유: #bodyWrap.emotion 같은 전역 선택자가 필요하기 때문 */
@use '@/assets/scss/chat';
</style>
