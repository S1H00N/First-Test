# Flowra P0 Auth/Home Smoke Test Checklist

## 0) 사전 준비
1. 프론트 실행: `npm run dev -- --host 0.0.0.0 --port 5173`
2. 접속: `http://localhost:5173`
3. 테스트용 계정 2개 준비
- 계정 A: 이미 가입된 이메일 (중복 테스트용)
- 계정 B: 신규 가입 이메일

## 1) 공통 검증 포인트
- 토스트 노출: 에러 코드에 맞는 한국어 메시지 표시
- 폼 필드 에러: 회원가입/로그인 시 해당 입력 필드 아래 인라인 에러 표시
- 자동 포커스: 유효성 실패 시 첫 에러 필드로 포커스 이동
- 강제 로그아웃 배너: 로그인 화면 상단에 사유 배너 표시

---

## 2) DUPLICATE_RESOURCE (회원가입 중복)
### 시나리오
1. `/auth/signup` 이동
2. 이미 가입된 이메일(계정 A) + 유효한 비밀번호(8자 이상) + 이름 입력
3. 회원가입 클릭

### 기대 결과
- 토스트: "이미 사용 중인 이메일입니다..."
- 이메일 필드 인라인 에러 표시
- 포커스가 이메일 필드로 이동

---

## 3) VALIDATION_ERROR (서버 검증 실패)
### 시나리오 A (UI 우선)
1. `/auth/signup` 이동
2. 프론트 1차 검증을 통과하는 값으로 입력
3. 서버에서만 막는 규칙(예: 백엔드 추가 정책)에 걸리도록 값 시도
4. 회원가입 클릭

### 기대 결과
- 토스트: VALIDATION_ERROR 매핑 메시지
- 가능하면 `error.details.field` 기준으로 해당 필드 인라인 에러 표시
- 포커스가 해당 필드로 이동

### 시나리오 B (백엔드 코드 확인용 콘솔 스크립트)
브라우저 DevTools Console에서 실행:

```javascript
await fetch('https://flowra.xenon54.co.kr/api/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'not-an-email',
    password: '123',
    name: ''
  }),
}).then(async (res) => ({ status: res.status, body: await res.json() }))
```

- `body.error.code`가 `VALIDATION_ERROR`인지 확인

---

## 4) UNAUTHORIZED (로그인 실패)
### 시나리오
1. `/auth/login` 이동
2. 존재하는 이메일(계정 A) + 잘못된 비밀번호 입력
3. 로그인 클릭

### 기대 결과
- 토스트: "이메일 또는 비밀번호가 일치하지 않습니다."
- 폼 상단 에러 배너 표시
- 포커스가 비밀번호 필드로 이동

---

## 5) TOKEN_EXPIRED (만료 후 강제 로그아웃)
### 시나리오 (권장: 관리자 패널 사용)
1. 정상 로그인 후 보호 라우트(`/home`, `/memo` 등)로 이동
2. 백엔드 관리자 패널에서 해당 세션/토큰을 만료 처리
3. 프론트에서 보호 API 재호출(새로고침 또는 대시보드 새로고침)

### 기대 결과
- 인터셉터에서 인증 실패 처리 후 로그인 페이지로 리다이렉트
- 로그인 상단 배너: "보안을 위해 로그아웃 되었습니다. 다시 로그인해 주세요."
- 재로그인 성공 시 이전 경로로 자동 복귀

---

## 6) Home 화면 병렬 연동 확인
### 시나리오
1. 로그인 성공 후 `/home` 진입
2. 초기 진입 시 로딩 스피너 확인
3. 내 정보(`GET /users/me`)와 오늘 브리핑(`GET /briefings/today`) 병렬 조회 확인
4. 데이터가 없으면 Empty State 카드 표시 확인
5. `대시보드 새로고침` 클릭 시 재조회 동작 확인

### 기대 결과
- 둘 다 성공: 상태 메시지 "대시보드 데이터 조회 성공"
- 한쪽만 실패: 상태 메시지 + 일부 조회 실패 토스트 + 실패 카드만 ErrorState
- 둘 다 실패: 전역 ErrorState + 재시도 버튼
