const CACHE_NAME = 'ncpicks-v2';   // 캐시 이름 올리면 활성화 시 구버전 캐시 자동 삭제
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap',
];

// 설치 — 핵심 파일 캐싱
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 활성화 — 구버전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 요청 처리
//  · index.html(문서) = 네트워크 우선 → 매일 갱신되는 최신 데이터를 항상 받음. 오프라인이면 캐시.
//  · 그 외 정적 자원(아이콘·폰트·차트) = 캐시 우선(거의 안 바뀜, 속도 우선).
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  const isDoc = req.mode === 'navigate' || req.destination === 'document'
             || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
  if (isDoc) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        if (req.destination === 'document') return caches.match('./index.html');
      });
    })
  );
});
