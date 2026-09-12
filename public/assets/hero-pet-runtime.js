/* 軽量スプライトの読込とフレーム再生。
   - manifest.json を1回だけ取得して共有する
   - rAFループはページ全体でこの1本だけ。購読者がいない間は完全に止まる
   - 30fps刻み。タブ非表示中はrAF自体が止まるので更新も止まる */

const BASE = 'assets/hero-pets/';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let manifestPromise = null;
export function loadManifest() {
  manifestPromise = manifestPromise || fetch(`${BASE}manifest.json`).then((res) => {
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    return res.json();
  });
  return manifestPromise;
}

export async function loadGuest(id) {
  const manifest = await loadManifest();
  const meta = manifest.characters[id];
  if (!meta) throw new Error(`unknown guest: ${id}`);
  const img = new Image();
  img.src = `${BASE}${meta.sheet}`;
  await img.decode();
  return { manifest, meta, sheetUrl: img.src };
}

/* ---- 共有ティッカー ---- */
const subscribers = new Set();
let rafId = 0;
let lastTick = 0;
const loop = (time) => {
  rafId = 0;
  if (!subscribers.size) return;
  if (time - lastTick >= 33) {
    lastTick = time;
    subscribers.forEach((fn) => fn(time));
  }
  rafId = requestAnimationFrame(loop);
};
export function subscribe(fn) {
  subscribers.add(fn);
  if (!rafId) rafId = requestAnimationFrame(loop);
  return () => {
    subscribers.delete(fn);
    if (!subscribers.size && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  };
}

/* ---- スプライト ---- */
export function createSprite(manifest, sheetUrl) {
  const { w: cellW, h: cellH } = manifest.cell;
  const el = document.createElement('span');
  el.className = 'hero-guest-sprite';
  el.setAttribute('aria-hidden', 'true');
  el.style.width = `${cellW}px`;
  el.style.height = `${cellH}px`;
  el.style.backgroundImage = `url("${sheetUrl}")`;

  let stopCurrent = null;
  const setFrame = (anim, frame) => {
    el.style.backgroundPosition = `${-(anim.col + frame) * cellW}px ${-anim.row * cellH}px`;
  };

  const play = (name, { loop: shouldLoop = true, onDone } = {}) => {
    stopCurrent?.();
    const anim = manifest.anims[name];
    if (!anim) return;
    setFrame(anim, 0);
    if (reducedMotion.matches) { if (!shouldLoop) onDone?.(); return; }
    const step = 1000 / anim.fps;
    let startTime = 0;
    const unsubscribe = subscribe((time) => {
      if (!startTime) startTime = time;
      const index = Math.floor((time - startTime) / step);
      if (shouldLoop) {
        setFrame(anim, index % anim.frames);
      } else if (index >= anim.frames) {
        stop();
        onDone?.();
      } else {
        setFrame(anim, index);
      }
    });
    stopCurrent = unsubscribe;
  };

  const stop = () => { stopCurrent?.(); stopCurrent = null; };
  return { el, play, stop };
}
