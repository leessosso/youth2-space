/**
 * PWA 아이콘 — 현재 아이덴티티(흰 바탕 + 주황 인물 로고) 유지.
 * 마스터: pwa-icons/logo-orange.png (투명 배경, 로고 영역만 잘라 둔 주황 로고)
 *   - 기존 배포 icon-512.png에서 흰 배경을 알파로 되돌려 추출. 하트는 투명 구멍.
 *   - pwa-icons/icon-source.png(파란 '등촌' 아트)는 더 이상 쓰지 않는다.
 * 실행: npm run icons:generate
 *
 * any: 투명 배경, 로고를 캔버스 가로에 꽉 차게(여백 ANY_PADDING). Android 자동 스플래시에서 크게 보인다.
 * maskable: 흰 배경. 로고 픽셀의 MASKABLE_INSIDE_RATIO(95%)가 지름 80% 안전 원 안에 들어가는 크기.
 *   나머지 5%(팔·발 끝)는 안전 원 밖으로 나가 가장 좁은 원형 마스크에서만 살짝 잘린다 — 스플래시 로고를 키우기 위한 절충.
 *   maskable은 512 하나만 둔다. 192 maskable을 추가한 #55 이후 스플래시 로고가 작아져 #55 이전 구성으로 되돌림.
 */
import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "icons");
const masterPath = path.join(root, "pwa-icons", "logo-orange.png");

/** manifest background_color와 같아야 한다. */
export const ICON_BACKGROUND = "#ffffff";
const ANY_PADDING = 0.01;
/** 안전 영역 반지름(캔버스 대비) — 0.4 = 지름 80%. 안티앨리어싱 여유 2%. */
const SAFE_RADIUS = 0.4;
const MASKABLE_INSIDE_RATIO = 0.95;

try {
  await access(masterPath);
} catch {
  throw new Error(`마스터 로고가 없습니다: ${masterPath}`);
}
const master = sharp(masterPath).ensureAlpha();
const { width: mw, height: mh } = await master.metadata();
const { data: alpha } = await master.clone().extractChannel(3).raw().toBuffer({ resolveWithObject: true });

/** 로고 중심(바운딩 박스 중심)에서 보이는 픽셀까지의 최대 거리. */
const radii = [];
for (let y = 0; y < mh; y += 1) {
  for (let x = 0; x < mw; x += 1) {
    if (alpha[y * mw + x] > 8) {
      radii.push(Math.hypot(x + 0.5 - mw / 2, y + 0.5 - mh / 2));
    }
  }
}

radii.sort((a, b) => a - b);
const fitR = radii[Math.floor(MASKABLE_INSIDE_RATIO * (radii.length - 1))];

async function logoAt(scale) {
  const w = Math.max(1, Math.round(mw * scale));
  const h = Math.max(1, Math.round(mh * scale));
  return { w, h, buf: await sharp(masterPath).resize(w, h, { kernel: "lanczos3" }).png().toBuffer() };
}

async function composite(size, scale, background) {
  const { w, h, buf } = await logoAt(scale);
  return sharp({
    create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: buf, left: Math.round((size - w) / 2), top: Math.round((size - h) / 2) }])
    .png()
    .toBuffer();
}

const anyScale = (size) => Math.min((size * (1 - 2 * ANY_PADDING)) / mw, (size * (1 - 2 * ANY_PADDING)) / mh);
const maskableScale = (size) => (SAFE_RADIUS * size) / fitR;

const anyPng = (size) => composite(size, anyScale(size));
const maskablePng = (size) => composite(size, maskableScale(size), ICON_BACKGROUND);
/** 파비콘은 탭 바탕이 어두울 수 있어 흰 바탕을 유지한다. */
const faviconPng = (size) => composite(size, anyScale(size), ICON_BACKGROUND);

await mkdir(outDir, { recursive: true });
for (const size of [192, 512]) {
  await writeFile(path.join(outDir, `icon-${size}.png`), await anyPng(size));
  console.log(`wrote icon-${size}.png`);
}
await writeFile(path.join(outDir, "icon-512-maskable.png"), await maskablePng(512));
console.log("wrote icon-512-maskable.png");

/** iOS는 투명 영역을 검게 채우므로 흰 바탕 불투명 아이콘을 따로 둔다(모서리는 iOS가 살짝만 깎는다). */
await writeFile(path.join(outDir, "apple-touch-icon.png"), await composite(180, ((180 * 0.9) / mw), ICON_BACKGROUND));
console.log("wrote apple-touch-icon.png");

await writeFile(path.join(root, "public", "favicon.png"), await faviconPng(32));
console.log("wrote public/favicon.png");

const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map(async (size) => ({
    size,
    buf: await faviconPng(size),
  })),
);
await writeFile(path.join(root, "src", "app", "favicon.ico"), pngsToIco(icoPngs));
console.log("wrote src/app/favicon.ico");

/** PNG를 담은 ICO. 크기 256 이상은 디렉터리에 0으로 적는다. */
function pngsToIco(images) {
  const headerLen = 6 + 16 * images.length;
  let offset = headerLen;
  const entries = images.map(({ size, buf }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buf.length;
    return entry;
  });
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(images.length, 4);
  return Buffer.concat([dir, ...entries, ...images.map((image) => image.buf)]);
}
