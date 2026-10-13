// 홈 화면 앱용 서비스 워커
// 사이트 파일은 항상 인터넷에서 새로 받아오고(그래서 업데이트하면 바로 반영됨),
// 인터넷이 안 될 때만 마지막으로 받아둔 걸 보여줌.
const CACHE = 'nyanko-v2';
const CORE = ['./', './index.html', './data.js', './manifest.webmanifest', './icon-w-192.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 사이트 파일: 인터넷 먼저, 안 되면 저장해둔 것
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './index.html' : req, copy)).catch(() => {});
        }
        return res;
      } catch (err) {
        const c = await caches.open(CACHE);
        if (req.mode === 'navigate') return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
        return (await c.match(req, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  // 글꼴: 저장해둔 게 있으면 그걸 쓰고 뒤에서 새로 받아둠
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
