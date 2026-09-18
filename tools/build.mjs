/* Dựng bản web độc lập và bản nhúng vào ứng dụng Android từ một mã nguồn duy nhất.
 *
 *   src/nho-vui.html  →  www/index.html                         (mở bằng trình duyệt, host https)
 *                     →  android/app/src/main/assets/index.html (nhúng trong APK)
 *
 * Mã nguồn gốc không có <!doctype>, <head> vì khi đăng lên Claude Artifact thì
 * nền tảng tự bọc phần đó. File rời và assets của APK thì không có ai bọc hộ,
 * nên phải tự thêm:
 *   - thiếu <meta charset>  → tiếng Việt hiện thành ký tự lạ
 *   - thiếu viewport        → trang bày theo khổ máy tính, chữ bé tí
 *
 * Chạy:  node tools/build.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nguon = path.join(goc, "src", "nho-vui.html");
const dich = [
  path.join(goc, "www", "index.html"),
  path.join(goc, "android", "app", "src", "main", "assets", "index.html")
];

const src = fs.readFileSync(nguon, "utf8");
const moStyle = src.indexOf("<style>");
if (moStyle < 0) throw new Error("Không tìm thấy <style> trong src/nho-vui.html");

const dauTrang = src.slice(0, moStyle).trim();   // <title> + các <link> font
const thanTrang = src.slice(moStyle);            // <style> + giao diện + script

const trang = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Ứng dụng luyện trí nhớ hằng ngày cho người sa sút trí tuệ.">
<meta name="theme-color" content="#FAF4EC" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#16120F" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Nhớ Vui">
${dauTrang}
<style>
/* phần nền tảng tự thêm cho Artifact — bản rời và bản APK phải tự lo */
:root{
  color-scheme: light dark;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
body{margin:0}
</style>
</head>
<body>
${thanTrang}
</body>
</html>
`;

for (const f of dich) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, trang, "utf8");
}

/* tự kiểm tra lại những thứ từng hỏng */
const kiem = fs.readFileSync(dich[0], "utf8");
const bytes = fs.readFileSync(dich[0]);
const ok = (ten, dung) => console.log(`  ${dung ? "OK " : "LOI"} ${ten}`);
console.log(`Da dung ${dich.length} file, ${bytes.length} bytes:`);
dich.forEach(f => console.log("  " + path.relative(goc, f)));
ok("co <!doctype html>", kiem.startsWith("<!doctype html>"));
ok("co <meta charset> trong 1024 byte dau", bytes.indexOf(Buffer.from('<meta charset="utf-8">')) < 1024);
ok("co the viewport", /width=device-width/.test(kiem));
ok("chu co dau dung UTF-8", bytes.includes(Buffer.from("Nhớ Vui", "utf8")));
ok("co [hidden] display:none !important", /\[hidden\]\{display:none !important\}/.test(kiem));
try {
  new Function(kiem.match(/<script>([\s\S]*)<\/script>/)[1]);
  ok("ma JavaScript khong loi cu phap", true);
} catch (e) {
  ok("ma JavaScript LOI: " + e.message, false);
  process.exit(1);
}
