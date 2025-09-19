// 캐시 이름 정의 (v1은 버전 정보로, 나중에 앱을 업데이트할 때 이 버전을 변경합니다)
const CACHE_NAME = 'wedding-money-manager-v1';

// 오프라인 시에도 사용할 수 있도록 캐시에 저장할 파일 목록
const FILES_TO_CACHE = [
  '/', // 앱의 시작점
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'favicon.ico',
  'icons/android-icon-192x192.png', // PWA 설치의 핵심 아이콘
  'icons/apple-icon-180x180.png'    // Apple 기기용 고해상도 아이콘
];

// 1. 서비스 워커 설치 (install)
// 웹사이트 첫 방문 시, 정의된 파일들을 캐시에 저장합니다.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_-NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

// 2. 서비스 워커 활성화 (activate)
// 새로운 버전의 서비스 워커가 설치되면, 이전 버전의 캐시를 삭제하여 정리합니다.
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

// 3. 네트워크 요청 가로채기 (fetch)
// 앱이 서버에 무언가를 요청할 때마다(예: 페이지 새로고침) 이 이벤트가 발생합니다.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 요청에 해당하는 파일이 캐시에 있으면 캐시된 파일을 반환하고,
        // 없으면 서버로 네트워크 요청을 보냅니다.
        return response || fetch(event.request);
      })
  );
});