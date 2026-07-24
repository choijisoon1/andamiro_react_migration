# 안다미로 (DAYFLOW) — Claude Code 가이드

## 프로젝트 개요

감정 일기 웹앱. 사용자가 오늘의 감정을 선택하고 AI와 대화하며 기록한다.

- **스택**: Vue 3 (Composition API) + Vite + Pinia + Vue Router 5
- **백엔드**: Supabase (Auth, DB, Realtime)
- **AI**: Anthropic Claude API (chatAgent, analysisAgent)
- **배포**: Vercel (PWA)
- **폰트**: Pretendard (CDN, font-display: swap)

## 디렉터리 구조

```
src/
├── main.js
├── App.vue
├── assets/
│   └── scss/
│       ├── main.scss       # 진입점 (@use 순서: tokens → reset → fonts)
│       ├── _tokens.scss    # 디자인 토큰 (CSS 변수)
│       ├── _reset.scss     # 전역 리셋 + #app 기본 설정
│       └── _fonts.scss     # Pretendard @font-face
├── lib/
│   └── supabase.js         # createClient (PKCE)
├── stores/
│   ├── auth.js             # 사용자 인증 (signIn/Up/Out/Kakao)
│   └── diary.js            # 일기 CRUD (fetchByMonth, getByDate, save)
├── router/
│   └── index.js            # 라우트 정의 + 인증 가드
├── components/
│   └── layout/
│       ├── AppLayout.vue   # 메인 앱 레이아웃 (헤더 + 탭바)
│       ├── AppTabBar.vue   # 하단 탭 (홈/리포트/조언)
│       └── PageLayout.vue  # 서브페이지 레이아웃 (뒤로가기 헤더)
└── views/
    ├── login/
    │   ├── LoginView.vue
    │   ├── JoinStep1View.vue   # 이메일·비밀번호
    │   ├── JoinStep2View.vue   # 닉네임
    │   ├── JoinStep3View.vue   # 관심 감정 선택
    │   └── JoinStep4View.vue   # 가입 완료
    ├── chat/
    │   ├── ChatView.vue        # 오늘 있었던 일 텍스트 입력
    │   ├── EmotionView.vue     # 감정 태그 선택
    │   └── ResultView.vue      # AI 분석 결과 + 저장
    ├── exchange/
    │   ├── ExchangeView.vue    # 감정 교환 목록
    │   └── RoomView.vue        # 미사용 임시 화면, React 이관 제외
    ├── my/
    │   ├── MyView.vue          # 마이페이지
    │   ├── ChatListView.vue    # 저장된 일기 목록
    │   └── ChatViewView.vue    # 저장된 일기 상세 (ResultView와 유사 UI, 읽기 전용)
    ├── MainView.vue            # 홈
    ├── ReportView.vue          # 리포트
    └── AdviceView.vue          # 조언
```

## 라우트 구조

| 경로 | 뷰 | 인증 필요 |
|------|-----|-----------|
| `/login` | LoginView | — |
| `/join/1~4` | JoinStep1~4View | — |
| `/main` | MainView | ✅ |
| `/chat` | ChatView | ✅ |
| `/chat/emotion` | EmotionView | ✅ |
| `/chat/result` | ResultView | ✅ |
| `/report` | ReportView | ✅ |
| `/advice` | AdviceView | ✅ |
| `/exchange` | ExchangeView | ✅ |
| `/exchange` | DetailView | ✅ |
| `/my` | MyView | ✅ |
| `/my/chat-list` | ChatListView | ✅ |
| `/my/chat-view` | ChatViewView | ✅ (`?date=YYYY-MM-DD` 필수) |

기록 플로우: `/chat` → `/chat/emotion` → `/chat/result`

기록 열람: 메인 캘린더에서 날짜·기록 선택 시 `/my/chat-view?date=…` 로 이동해 해당 날짜 저장 분석을 본다.

## 레이아웃 컴포넌트 사용 규칙

### AppLayout — 탭바 있는 메인 앱 화면

`/main`, `/report`, `/advice` 등 탭 네비게이션이 있는 화면에 사용.

```vue
<AppLayout title="홈" show-logout>
  <!-- 페이지 본문 -->
</AppLayout>
```

| prop | 타입 | 설명 |
|------|------|------|
| `title` | String | 헤더 타이틀 (기본값 `''`) |
| `showLogout` | Boolean | 우측 로그아웃 버튼 표시 여부 |

### PageLayout — 뒤로가기 있는 서브페이지

`/chat`, `/my/chat-view` 등 탭바 없이 헤더에 뒤로가기가 있는 화면에 사용.

```vue
<PageLayout title="오늘의 기록" back-to="/main" action-label="완료" @action="handleSave">
  <!-- 페이지 본문 -->
  <template #action>
    <!-- 헤더 우측 슬롯 (복잡한 경우) -->
  </template>
</PageLayout>
```

| prop | 타입 | 설명 |
|------|------|------|
| `title` | String | 헤더 중앙 타이틀 |
| `backTo` | String | 뒤로가기 대신 특정 경로로 이동 |
| `actionLabel` | String | 헤더 우측 텍스트 버튼 |

## 네이밍 컨벤션

| 대상 | 표기법 | 예시 |
|------|--------|------|
| 컴포넌트 파일 | PascalCase | `AppTabBar.vue`, `PageLayout.vue` |
| 뷰 파일 | PascalCase + View 접미사 | `ChatView.vue`, `JoinStep1View.vue` |
| `<template>` 컴포넌트 태그 | PascalCase | `<AppLayout>`, `<PageLayout>` |
| SCSS 파일 (partial) | `_` 접두사 + kebab-case | `_tokens.scss`, `_reset.scss` |
| CSS class | kebab-case | `page-header`, `tabbar__item` |
| CSS BEM | `블록__요소--modifier` | `header__logo`, `tabbar__item.is-active` |
| JS 변수·함수 | camelCase | `handleLogin`, `fetchByMonth` |
| Pinia store | camelCase 함수명 | `useAuthStore`, `useDiaryStore` |
| 환경 변수 | VITE_ 접두사 | `VITE_SUPABASE_URL` |

## 디자인 토큰

`src/assets/scss/_tokens.scss`에 정의. 컴포넌트에서 `var(--token)`으로 참조.

```scss
/* 색상 */
--primary: #4283f3
--primary-light: #41c7f4
--white: #fff
--border: #dddddd
--title: #222222
--text-default: #454545
--text-sub: #666666
--text-disabled: #999999
--bg-color: #eef3fc
--dim: rgba(0,0,0,0.5)

/* 폰트 */
--font12 ~ --font24  (0.75rem ~ 1.5rem)

/* 레이아웃 */
--header-height: 58px
--tabbar-height: 64px
```

## Pinia Store 구조

### auth.js

```js
const { user, loading, init, signIn, signUp, signOut, signInWithKakao } = useAuthStore()
```

- `init()` — 세션 복구 + onAuthStateChange 등록 (router 가드에서 호출)
- `user` — Supabase User 객체 또는 `null`

### diary.js

```js
const { diaries, fetchByMonth, getByDate, save } = useDiaryStore()
```

- `save(payload)` — `{ date, content, emotion, ... }` → `diaries` 테이블 insert

## HTML 골격

모든 레이아웃 컴포넌트의 기본 뼈대:

```html
<div class="wrap">
  <div id="headerWrap">
    <header id="header" class="header">...</header>
  </div>
  <div id="bodyWrap">
    <main>
      <section class="...">...</section>
    </main>
  </div>
</div>
```

- `id` — JS 참조용 (`headerWrap`, `bodyWrap`, `header`)
- `class` — CSS 스타일링 전용 (kebab-case BEM)
- `AppLayout`은 `AppTabBar`를 `#bodyWrap` 아래에 추가로 포함

## 컴포넌트 작성 패턴

```vue
<script setup>
// 1. import
// 2. props / emits
// 3. store / router / route
// 4. reactive state (ref, computed)
// 5. functions
// 6. lifecycle (onMounted 등)
</script>

<template>
  <!-- 레이아웃 컴포넌트 래핑 → 본문 slot -->
</template>

<style scoped>
/* BEM 기반 kebab-case */
</style>
```

- `<script setup>` 단독 사용 (Options API 금지)
- `defineProps` / `defineEmits` 객체 형태로 타입·기본값 명시
- 스타일은 `scoped`, 전역 토큰은 `var(--token)` 참조

## 개발 현황

### 완료

- [x] 프로젝트 셋업 (Vue 3 + Pinia + Vue Router + Supabase + PWA)
- [x] 디자인 토큰 (`base.css`)
- [x] `AppLayout` / `PageLayout` / `AppTabBar`
- [x] `useAuthStore` (이메일·카카오 로그인)
- [x] `useDiaryStore` (fetchByMonth / getByDate / save)
- [x] 라우터 전체 + 인증 가드
- [x] `LoginView` (기능 동작, 스타일 미완)
- [x] `MainView` (기본 구조)
- [x] `ChatViewView` (저장 일기 상세·`getByDate`, ResultView 유사 레이아웃)

### 미완 (껍데기)

- [ ] `JoinStep1~4View`
- [ ] `ChatView` / `EmotionView` / `ResultView`
- [ ] `ReportView` / `AdviceView`
- [ ] `MyView` / `ChatListView`
- [ ] `ExchangeView` (`RoomView`는 미사용 임시 화면으로 React 이관 제외)

## 개발 순서 (우선순위)

1. **Phase 1** — 진입 플로우: `LoginView` 스타일 정비 + `JoinStep1~4View`
2. **Phase 2** — 홈 개선: `MainView` (오늘 상태 + 최근 기록 카드)
3. **Phase 3** — 기록 플로우: `ChatView` → `EmotionView` → `ResultView`
4. **Phase 4** — `ReportView` (달력 + 감정 통계)
5. **Phase 5** — `AdviceView` (AI 조언)
6. **Phase 6** — `MyView` / `ChatListView` (`ChatViewView`는 캘린더→상세 열람 경로로 선구현)
7. **Phase 7** — `ExchangeView` (Supabase 공유일기, `RoomView`는 미사용으로 제외)

## 주의사항

- `voiceAgent`, `reportAgent`, `adviceAgent`는 명시적 승인 전 구현 금지
- Claude API 연동은 Phase 3 `ResultView` 이후 별도 승인 후 진행
- 신규 store는 `src/stores/` 아래, composable은 `src/composables/` 아래 생성
- Supabase 쿼리는 store에서만 실행 (뷰에서 직접 호출 금지)
- `AppTabBar` 탭 추가 시 탭바 높이(--tabbar-height) 재검토 필요
