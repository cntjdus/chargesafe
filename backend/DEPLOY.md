# 배포 가이드 (Render)

ChargeSafe 백엔드를 Render 무료 플랜에 배포하는 방법입니다.
Supabase(DB)는 이미 클라우드에 있으므로 서버만 올리면 됩니다.

## 준비물

- GitHub 계정
- Render 계정 ([render.com](https://render.com) — GitHub으로 가입 가능)
- 다음 3가지 비밀값 (로컬 `backend/.env`와 `backend/firebase-service-account.json`에 있음):
  - `DATABASE_URL` — Supabase 연결 문자열
  - `JWT_SECRET` — `.env`에 있는 값
  - `firebase-service-account.json` 파일 **전체 내용**

## 1단계: GitHub에 코드 올리기

GitHub 업로드는 팀의 협업 워크플로(브랜치 전략, PR 규칙 등)에 맞춰 직접 진행합니다.

중요한 점 한 가지만 확인하세요:
`.env`와 `firebase-service-account.json`은 `.gitignore`에 등록되어 있어 **커밋/업로드되지 않습니다** — 정상이며, 이 비밀값들은 저장소 대신 Render 환경변수로 넣습니다(2단계).

## 2단계: Render에서 배포

1. [dashboard.render.com](https://dashboard.render.com) → `New +` → `Web Service`
2. GitHub 저장소 `cntjdus/chargesafe` 연결 (처음이면 GitHub 접근 권한 승인)
3. 서비스 설정 (백엔드는 저장소의 `backend/` 폴더 안에 있으므로 **Root Directory 지정이 중요**):
   - **Branch**: `backend`
   - **Root Directory**: `backend`  ← 반드시 입력
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: `Free`
4. **환경변수(Environment) 3개 입력:**

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `backend/.env`의 Supabase 연결 문자열 그대로 |
   | `JWT_SECRET` | `backend/.env`의 값 그대로 |
   | `FIREBASE_SERVICE_ACCOUNT` | `backend/firebase-service-account.json` 파일을 열어 **전체 내용({ 부터 } 까지)** 복사해 붙여넣기 |

5. `Create Web Service` 클릭 → 몇 분 후 배포 완료
6. 배포 주소 확인 (예: `https://chargesafe.onrender.com`)

## 3단계: Firebase에 배포 도메인 등록

푸시 알림이 배포 주소에서도 동작하려면:

1. [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 `chargesafe-cs`
2. Authentication → Settings → **승인된 도메인(Authorized domains)** → 도메인 추가
3. 배포 주소의 도메인만 입력 (예: `chargesafe.onrender.com`, `https://`와 경로 제외)

## 완료 후

- 배포 주소로 접속 → 로그인 → 정상 동작 확인
- ESP32 펌웨어의 서버 주소를 `http://localhost:3000` → 배포 주소(`https://...onrender.com`)로 변경
- 무료 플랜은 15분간 접속이 없으면 잠들고, 다음 첫 요청이 깨우는 데 ~50초 걸립니다 (시연 중 계속 사용하면 문제없음)

## 참고

- DB 스키마는 이미 Supabase에 적용되어 있어 배포 시 마이그레이션이 필요 없습니다.
  (DB를 새로 만들 경우에만 `npm run migrate` 실행)
- 코드를 수정하고 `git push`하면 Render가 자동으로 재배포합니다.
