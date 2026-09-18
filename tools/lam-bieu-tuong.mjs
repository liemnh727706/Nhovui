/* Sinh biểu tượng PNG cho bản web cài lên màn hình chính (iOS và Android).
 *
 * Tự vẽ và tự mã hoá PNG để không phải kéo thêm thư viện nào — chạy được cả
 * trên máy lập trình lẫn trên máy dựng của GitHub.
 *
 * Chạy:  node tools/lam-bieu-tuong.mjs
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CAM   = [0xC2, 0x45, 0x1D];   // nền, cùng màu nhấn với giao diện
const TRANG = [0xFF, 0xFF, 0xFF];   // cánh hoa
const VANG  = [0xF2, 0xC2, 0x30];   // nhuỵ

/* --- mã hoá PNG --- */
const bangCrc = (() => {
  const b = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    b[n] = c >>> 0;
  }
  return b;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = bangCrc[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function khoi(kieu, du) {
  const ten = Buffer.from(kieu, "ascii");
  const than = Buffer.concat([ten, du]);
  const dai = Buffer.alloc(4); dai.writeUInt32BE(du.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(than), 0);
  return Buffer.concat([dai, than, crc]);
}

function taoPng(canh, diem) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(canh, 0);
  ihdr.writeUInt32BE(canh, 4);
  ihdr[8] = 8;    // 8 bit mỗi kênh
  ihdr[9] = 2;    // RGB, không kênh trong suốt
  const tho = Buffer.alloc(canh * (canh * 3 + 1));
  let v = 0;
  for (let y = 0; y < canh; y++) {
    tho[v++] = 0;                       // kiểu lọc: không
    for (let x = 0; x < canh; x++) {
      const p = diem[y * canh + x];
      tho[v++] = p[0]; tho[v++] = p[1]; tho[v++] = p[2];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    khoi("IHDR", ihdr),
    khoi("IDAT", zlib.deflateSync(tho, { level: 9 })),
    khoi("IEND", Buffer.alloc(0))
  ]);
}

/* --- vẽ bông cúc, cùng hình với biểu tượng 🌼 của bản web --- */
function veBieuTuong(canh) {
  const diem = new Array(canh * canh);
  const tam = canh / 2;

  // các hình tròn cần vẽ, theo thứ tự đè lên nhau
  const hinh = [];
  for (let i = 0; i < 8; i++) {
    const g = (Math.PI / 4) * i;
    hinh.push({
      x: tam + Math.cos(g) * canh * 0.204,
      y: tam + Math.sin(g) * canh * 0.204,
      r: canh * 0.074,
      mau: TRANG
    });
  }
  hinh.push({ x: tam, y: tam, r: canh * 0.102, mau: VANG });

  for (let y = 0; y < canh; y++) {
    for (let x = 0; x < canh; x++) {
      let mau = CAM;
      // lấy mẫu 2x2 cho viền đỡ răng cưa
      for (const h of hinh) {
        let trong = 0;
        for (const dx of [0.25, 0.75]) for (const dy of [0.25, 0.75]) {
          const a = x + dx - h.x, b = y + dy - h.y;
          if (a * a + b * b <= h.r * h.r) trong++;
        }
        if (trong === 4) mau = h.mau;
        else if (trong > 0) {
          const t = trong / 4;
          mau = [0, 1, 2].map(i => Math.round(mau[i] * (1 - t) + h.mau[i] * t));
        }
      }
      diem[y * canh + x] = mau;
    }
  }
  return taoPng(canh, diem);
}

const canLam = [
  ["icon-512.png", 512],
  ["icon-192.png", 192],
  ["apple-touch-icon.png", 180]   // iOS dùng riêng file này cho màn hình chính
];

for (const [ten, canh] of canLam) {
  const f = path.join(goc, "www", ten);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const png = veBieuTuong(canh);
  fs.writeFileSync(f, png);
  console.log(`  ${ten}  ${canh}x${canh}  ${png.length.toLocaleString("vi-VN")} bytes`);
}
