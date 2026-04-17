# Flowra Frontend (React + Vite)

Flowra 졸업작품 프론트엔드 작업용 시작 프로젝트입니다.

- API 기준 문서: `flowra_api_spec_p_0.md`
- 백엔드 연동 주소: `https://flowra.xenon54.co.kr/`
- 기본 API Base URL: `https://flowra.xenon54.co.kr/api/v1`

## 시작하기

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 파일 생성

```bash
cp .env.example .env
```

Windows PowerShell에서는 아래처럼 복사해도 됩니다.

```powershell
Copy-Item .env.example .env
```

3. 개발 서버 실행

```bash
npm run dev
```

## Vercel 배포 연동

이 프로젝트는 `vercel.json`이 포함되어 있어 Vercel에서 바로 빌드/배포할 수 있습니다.

1. Vercel 대시보드에서 **Add New Project**를 선택합니다.
2. GitHub 저장소 `L2D-Life-to-Display/First-Test`를 Import 합니다.
3. Framework Preset은 자동 감지(`Vite`)를 사용합니다.
4. Environment Variables에 아래 값을 추가합니다.

```text
VITE_API_BASE_URL=https://flowra.xenon54.co.kr/api/v1
```

5. Deploy를 실행합니다.

배포 후 React Router 경로(`/auth/login`, `/home` 등) 직접 접근은 `vercel.json`의 SPA rewrite 설정으로 처리됩니다.

## 현재 포함된 구성

- Axios 기반 공통 HTTP 클라이언트
- JWT Access/Refresh 토큰 저장 유틸
- 명세서 기반 도메인 API 모듈
  - `auth`, `users`, `schedules`, `tasks`, `memos`, `categories`, `reminders`, `briefings`
- 연동 테스트용 대시보드 화면
  - 로그인/회원가입
  - 토큰 재발급/로그아웃
  - 내 정보, 브리핑, 일정/할 일/메모 조회

## 주요 폴더

```text
src/
  api/        # 엔드포인트별 API 함수
  config/     # 환경변수 및 설정
  lib/        # HTTP 클라이언트, 토큰 저장소
  types/      # 공통 타입 및 도메인 타입
```

## 다음 작업 추천

1. 화면 단위 폴더 분리 (`pages`, `features`, `components`)
2. 실제 인증 플로우에 맞춘 라우팅/가드 추가
3. React Query 도입으로 서버 상태 캐싱 및 에러 처리 표준화
4. API 응답 스키마 검증 레이어 추가 (예: Zod)
