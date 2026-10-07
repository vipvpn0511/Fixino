var VERSION = 'mobile-ali-v3';
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800&display=swap';
var SHELL = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil((async function () {
    var cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    // فونت وزیرمتن: فایل CSS و فایل‌های فونت را از همین حالا ذخیره می‌کنیم تا آفلاین هم بیاید
    try {
      var res = await fetch(FONT_CSS);
      if (res.ok) {
        var copy = res.clone();
        var css = await res.text();
        await cache.put(FONT_CSS, copy);
        var urls = css.match(/https:\/\/[^)'"\s]+\.woff2/g) || [];
        await Promise.all(urls.map(function (u) { return cache.add(u).catch(function () {}); }));
      }
    } catch (err) { /* آفلاین هنگام نصب: فونت در اولین باز شدن آنلاین ذخیره می‌شود */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== VERSION; })
      .map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  e.respondWith((async function () {
    var cache = await caches.open(VERSION);
    var hit = await cache.match(req, {ignoreSearch: req.mode === 'navigate'});
    var net = fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(function () { return null; });
    if (hit) { e.waitUntil(net); return hit; }
    var res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
