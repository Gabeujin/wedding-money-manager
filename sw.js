// 캐시 이름을 v2로 변경하여 서비스 워커 업데이트를 트리거합니다
const CACHE_NAME = 'wedding-money-manager-v2';

// GitHub Pages 경로에 맞게 모든 파일 경로 앞에 './'를 추가합니다.
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './favicon.ico',
  './icons/android-icon-192x192.png',
  './icons/apple-icon-180x180.png'
];

// 서비스 워커 설치 (install) 이벤트
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell for version 2');
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

// 서비스 워커 활성화 (activate) 이벤트 (이전 v1 캐시를 삭제합니다)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 네트워크 요청 가로채기 (fetch) 이벤트 (변경 없음)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});