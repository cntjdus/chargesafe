const fs = require('fs');
const path = require('path');

let initialized = false;
let messaging = null;

// 서비스 계정 키를 읽는다. 우선순위:
//   1) FIREBASE_SERVICE_ACCOUNT      — JSON 문자열 또는 base64(JSON). 배포 환경(Render 등)용
//   2) FIREBASE_SERVICE_ACCOUNT_PATH — 파일 경로. 로컬 개발용
// 둘 다 없으면 null을 반환하고 알림은 DB 기록만 남긴다.
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const text = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(text);
  }
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (saPath) {
    return JSON.parse(fs.readFileSync(path.resolve(saPath), 'utf8'));
  }
  return null;
}

function getMessaging() {
  if (initialized) return messaging;
  initialized = true;

  let serviceAccount;
  try {
    serviceAccount = loadServiceAccount();
  } catch (err) {
    console.warn('FCM 서비스 계정 키 파싱 실패 — 알림은 DB에만 기록됩니다:', err.message);
    return null;
  }
  if (!serviceAccount) return null;

  try {
    const { initializeApp, cert } = require('firebase-admin/app');
    const { getMessaging: getAdminMessaging } = require('firebase-admin/messaging');
    const app = initializeApp({ credential: cert(serviceAccount) });
    messaging = getAdminMessaging(app);
    console.log(`FCM 초기화 완료 (project: ${serviceAccount.project_id})`);
  } catch (err) {
    console.warn('FCM 초기화 실패 — 알림은 DB에만 기록됩니다:', err.message);
    messaging = null;
  }
  return messaging;
}

module.exports = { getMessaging };
