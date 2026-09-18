/* Bộ nhớ đệm để ứng dụng chạy được cả khi mất mạng.
 *
 * Người bệnh sa sút trí nhớ tập hằng ngày, thường ở nhà, đôi khi không có
 * mạng — bài tập không được phép phụ thuộc vào đường truyền.
 *
 * Đổi PHIEN_BAN mỗi lần sửa nội dung để máy người dùng lấy bản mới.
 */
const PHIEN_BAN = "nhovui-v1";

/* Đường dẫn tương đối theo phạm vi đăng ký, để chạy đúng cả khi đặt trong
   thư mục con như /Nhovui/ trên GitHub Pages. */
const CAN_GIU = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(PHIEN_BAN)
      .then(kho => kho.addAll(CAN_GIU))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // thiếu một file cũng không chặn cài đặt
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(ten => Promise.all(ten.filter(t => t !== PHIEN_BAN).map(t => caches.delete(t))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;

  const cungNha = new URL(req.url).origin === self.location.origin;

  if (cungNha) {
    /* File của ứng dụng: lấy trong đệm trước cho nhanh và chạy được ngoại tuyến,
       đồng thời lặng lẽ làm mới bản đệm ở nền. */
    ev.respondWith(
      caches.match(req).then(daCo => {
        const tuMang = fetch(req).then(res => {
          if (res && res.ok) {
            const ban = res.clone();
            caches.open(PHIEN_BAN).then(kho => kho.put(req, ban));
          }
          return res;
        }).catch(() => daCo);
        return daCo || tuMang;
      })
    );
    return;
  }

  /* Phông chữ Google: thử mạng trước, mất mạng thì dùng bản đã lưu. */
  ev.respondWith(
    fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const ban = res.clone();
        caches.open(PHIEN_BAN).then(kho => kho.put(req, ban));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
