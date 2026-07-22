# 교환일기 푸시 알림 시스템 설계 문서

> 댓글이 달리면 상대방 폰에 알림이 가는 구조를 처음부터 만드는 방법

---

## 전체 그림 (큰 흐름)

```
사용자가 댓글 작성
      ↓
Supabase DB에 저장됨
      ↓
Supabase가 n8n에 "댓글 달렸어!" 알림
      ↓
n8n이 "누구한테 알릴지" 계산
      ↓
Supabase Edge Function이 암호화 처리
      ↓
상대방 폰에 푸시 알림 도착
```

---

## 1단계 — VAPID 키 만들기

> 푸시 알림을 보내려면 "나 진짜 앱이야"를 증명하는 열쇠가 필요해요

### VAPID가 뭐야?
- 카페에서 "저 직원이에요"라고 보여주는 사원증 같은 것
- 공개키(Public Key): 모두에게 알려줘도 OK
- 비밀키(Private Key): 절대 외부에 노출 금지

### 만드는 방법
```bash
# 터미널에서 실행
npx web-push generate-vapid-keys
```

결과:
```
Public Key:  BN1VeLJPWPgmUn-Cp2LW...  ← 앱 코드에 사용
Private Key: _IIeoNUuAcyj7ew0Kwlq...  ← Supabase 서버에만 저장
```

### 키 보관 방법
| 키 종류 | 저장 위치 |
|--------|----------|
| Public Key | `.env.local` 파일 → `VITE_VAPID_PUBLIC_KEY=...` |
| Private Key | Supabase Edge Function Secret으로만 등록 |

---

## 2단계 — 서비스워커 만들기 (sw.js)

> 앱이 꺼져있어도 알림을 받으려면 "백그라운드 직원"이 필요해요

### 서비스워커가 뭐야?
- 앱이 닫혀있어도 폰 뒤에서 조용히 대기하는 직원
- 알림이 오면 이 직원이 받아서 화면에 보여줌

### 파일 위치
```
src/sw.js
```

### 핵심 코드
```js
// 알림 수신 시
self.addEventListener('push', (event) => {
  const { title, body, url } = event.data.json()
  self.registration.showNotification(title, {
    body,
    icon: '/assets/img/pwa/icon-192.png',
    data: { url }
  })
})

// 알림 클릭 시
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  clients.openWindow(event.notification.data.url)
})
```

### vite.config.js 설정
```js
VitePWA({
  strategies: 'injectManifest',  // 커스텀 sw.js 사용
  srcDir: 'src',
  filename: 'sw.js',
  injectManifest: {
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,  // 4MB 제한
  }
})
```

---

## 3단계 — 푸시 구독 저장하기

> 사용자가 "알림 받을게요" 동의하면 구독 정보를 DB에 저장해요

### Supabase 테이블 만들기
```sql
CREATE TABLE push_subscriptions (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES auth.users NOT NULL,
  endpoint  text NOT NULL,
  p256dh    text NOT NULL,
  auth      text NOT NULL,
  UNIQUE (user_id, endpoint)
);
```

### 컴포저블 파일
```
src/composables/usePushSubscription.js
```

### 동작 순서
```
사용자 로그인
      ↓
마이페이지 → 푸시 알림 토글 ON
      ↓
브라우저 "알림 허용하시겠어요?" 팝업
      ↓
허용 클릭
      ↓
브라우저가 구독 정보 생성 (endpoint, p256dh, auth)
      ↓
Supabase push_subscriptions 테이블에 저장
```

### 핵심 코드
```js
// 구독 등록
const registration = await navigator.serviceWorker.ready
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
})
// Supabase에 저장
await supabase.from('push_subscriptions').upsert({
  user_id: userId,
  endpoint: subscription.endpoint,
  p256dh:   subscription.keys.p256dh,
  auth:     subscription.keys.auth,
})
```

### 마이페이지 토글 (MyView.vue)
- 토글 ON → `subscribe()` 호출 → 알림 허용 팝업
- 토글 OFF → `unsubscribe()` 호출 → DB에서 삭제

---

## 4단계 — Supabase Edge Function 만들기

> n8n이 요청하면 실제로 암호화해서 푸시를 쏘는 서버 함수

### 파일 위치
```
supabase/functions/send-push-notification/index.ts
```

### 하는 일
```
1. VAPID JWT 서명 생성 (내가 진짜 앱임을 증명)
2. 알림 내용 AES-GCM으로 암호화
3. 브라우저 푸시 서버(FCM 등)로 전송
```

### 배포 방법
```bash
# Supabase CLI 로그인
export SUPABASE_ACCESS_TOKEN=sbp_xxxxx

# VAPID 비밀키 등록
npx supabase secrets set --project-ref [프로젝트ID] \
  VAPID_PRIVATE_KEY=_IIeoNUuAcyj7ew0Kwlq...
  VITE_VAPID_PUBLIC_KEY=BN1VeLJPWPgmUn-Cp2LW...

# Edge Function 배포
npx supabase functions deploy send-push-notification \
  --project-ref [프로젝트ID]
```

---

## 5단계 — n8n 설치 (GCP VM)

> 자동화 허브. "댓글 달렸으면 누구한테 알릴지 판단해"

### GCP VM에 n8n 설치
```bash
sudo npm install -g n8n
sudo -u ubuntu /usr/local/bin/n8n start &
```

### ngrok으로 외부 접근 가능하게 만들기
> n8n은 GCP 안에 있어서 외부에서 접근이 안 됨.
> ngrok이 임시 URL을 만들어서 터널을 뚫어줌

```bash
# ngrok 실행 (백그라운드)
nohup ngrok http 5678 > ~/ngrok.log 2>&1 &

# 발급된 URL 확인
curl -s http://localhost:4040/api/tunnels | grep public_url
```

결과 예시:
```
https://fidelity-daredevil-factsheet.ngrok-free.app
```

**주의**: GCP VM 재시작하면 ngrok URL이 바뀜.
바뀌면 Supabase DB Webhook URL도 다시 업데이트 필요.

---

## 6단계 — n8n 워크플로우 설정

> n8n에서 4개의 노드를 연결해서 자동화 파이프라인을 만듦

### 워크플로우 불러오기
1. n8n 접속 (ngrok URL)
2. 빈 캔버스에서 `Cmd+V`로 JSON 붙여넣기
3. `Cmd+S` 저장
4. `Publish` 버튼 클릭 → 활성화

### 워크플로우 JSON 위치
```
n8n-exchange-notify.json
```

### 노드 4개 설명

#### 노드 1: Webhook
```
역할: Supabase에서 오는 HTTP POST 요청 수신
URL:  https://[ngrok주소]/webhook/73b3e999-...
```

#### 노드 2: Get Members
```
역할: 알림 받아야 할 사람 목록 조회
API:  GET Supabase /exchange_members
      ?post_id=eq.[방ID]
      &user_id=neq.[댓글 단 사람ID]
```

#### 노드 3: Get Subscriptions
```
역할: 각 멤버의 푸시 구독 정보 조회
API:  GET Supabase /push_subscriptions
      ?user_id=eq.[멤버ID]
```

#### 노드 4: Send Push
```
역할: Edge Function 호출해서 실제 푸시 전송
API:  POST Supabase Edge Function
      /functions/v1/send-push-notification
```

---

## 7단계 — Supabase DB Webhook 설정

> 댓글이 저장될 때 자동으로 n8n에 알림을 보내도록 설정

### 설정 위치
```
Supabase 대시보드
  → Integrations (왼쪽 메뉴)
  → Database Webhooks
  → Webhooks 탭
  → Create a new hook
```

### 설정값
```
이름:    exchange-comment-notify
테이블:  exchange_comments
이벤트:  INSERT (댓글 작성 시)
URL:     https://[ngrok주소]/webhook/73b3e999-...
Method:  POST
```

---

## 전체 컴포넌트 구조

```
andamiro/
├── src/
│   ├── sw.js                          # 서비스워커 (푸시 수신)
│   ├── composables/
│   │   └── usePushSubscription.js     # 구독 등록/해제 로직
│   └── views/
│       └── my/
│           └── MyView.vue             # 푸시 알림 토글 UI
│
├── supabase/
│   └── functions/
│       └── send-push-notification/
│           └── index.ts              # 암호화 + 전송 Edge Function
│
├── n8n-exchange-notify.json          # n8n 워크플로우 설정 파일
└── vite.config.js                    # PWA + 서비스워커 빌드 설정
```

---

## 데이터 흐름 상세

```
[사용자 A] 댓글 작성
      |
      ↓
[Supabase DB] exchange_comments 테이블에 INSERT
      |
      ↓ (DB Webhook 트리거)
      |
[n8n - Webhook 노드]
  받은 데이터:
    record.post_id  = "방ID"
    record.user_id  = "사용자A의ID"
      |
      ↓
[n8n - Get Members 노드]
  쿼리: 같은 방 멤버 중 A 제외
  결과: [{ user_id: "사용자B의ID" }]
      |
      ↓ (B에 대해 반복 실행)
      |
[n8n - Get Subscriptions 노드]
  쿼리: 사용자B의 구독 정보 조회
  결과:
    endpoint: "https://fcm.googleapis.com/..."
    p256dh:   "암호화공개키"
    auth:     "인증시크릿"
      |
      ↓
[n8n - Send Push 노드]
  POST → Supabase Edge Function
      |
      ↓
[Edge Function - send-push-notification]
  1. VAPID JWT 서명
  2. AES-GCM 암호화
  3. FCM 서버로 전송
      |
      ↓
[브라우저/앱 - 서비스워커]
  push 이벤트 수신
      |
      ↓
[사용자 B 화면]
  "Andamiro - New comment!" 푸시 알림 표시
```

---

## 자주 발생하는 문제와 해결법

### ngrok URL이 바뀌었을 때
```
1. GCP VM SSH 접속
2. nohup ngrok http 5678 > ~/ngrok.log 2>&1 &
3. curl -s http://localhost:4040/api/tunnels | grep public_url
4. 새 URL 복사
5. Supabase DB Webhook URL 업데이트
```

### n8n 프로세스가 죽었을 때
```
1. GCP VM SSH 접속
2. sudo -u ubuntu /usr/local/bin/n8n start &
3. ngrok도 같이 재시작 필요
```

### 서비스워커 빌드 에러 (파일 크기 초과)
```
vite.config.js → injectManifest →
maximumFileSizeToCacheInBytes: 4 * 1024 * 1024  ← 이미 설정됨
```

### 푸시 토글 눌렀는데 반응 없을 때
```
1. 브라우저 → 주소창 자물쇠 → 알림 상태 확인
2. "차단"이면 → "허용"으로 변경
3. 페이지 새로고침 후 다시 토글
```

### 알림이 안 올 때 체크리스트
```
□ n8n 워크플로우 Published 상태인지 확인
□ ngrok 살아있는지 확인
□ Supabase DB Webhook URL 최신인지 확인
□ 받는 사람이 push_subscriptions에 데이터 있는지 확인
□ 받는 사람이 알림 권한 허용했는지 확인
```

---

## 환경변수 목록

### 프론트엔드 (.env.local)
```
VITE_SUPABASE_URL=https://[프로젝트ID].supabase.co
VITE_SUPABASE_ANON_KEY=[anon키]
VITE_VAPID_PUBLIC_KEY=BN1VeLJPWPgmUn-Cp2LW...
```

### Supabase Edge Function Secrets
```
VAPID_PRIVATE_KEY=_IIeoNUuAcyj7ew0Kwlq...
VITE_VAPID_PUBLIC_KEY=BN1VeLJPWPgmUn-Cp2LW...
```

---

## 초대 링크 시스템

### 흐름
```
방장이 교환일기 방 생성 (초대코드 자동생성)
      ↓
방 상세 → "초대 링크 복사" 버튼 클릭
      ↓
https://dayflow-phi.vercel.app/exchange/join?code=ABC123
      ↓
상대방이 링크 클릭
      ↓
비로그인 → 로그인 → 자동으로 입장 페이지로 이동
로그인   → 바로 입장 페이지로 이동
      ↓
"방 입장하기" 버튼 클릭
      ↓
exchange_members에 추가됨
      ↓
이후 댓글 알림 수신 가능
```

### 초대코드 생성 로직
```js
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  // 결과 예시: "A3K9MX"
}
```
