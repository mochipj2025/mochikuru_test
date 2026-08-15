/* ロード画面と星雫あつめ。
   進捗は架空のタイマーではなく、重要素材の実状態から計算する。
     - DOM準備・重要CSS・背景: このスクリプトはdeferなので実行時点で完了扱い(30%)
     - ベースPet軽量スプライトの decode() (50%)
     - site-motion.js の初期化完了 (20%)
   700ms未満で全て揃えばゲームを出さずに抜ける。4sで入場を強制点灯、
   ゲームは開始から8sで自動終了。ゲーム完了は閲覧条件にしない。 */
(() => {
  'use strict';

  const loader = document.getElementById('mochisuraLoader');
  if (!loader) return;

  const boot = window.__mochisuraBoot || { start: performance.now() };
  if (boot.failsafe) clearTimeout(boot.failsafe);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const drops = document.getElementById('loaderDrops');
  const countText = document.getElementById('loaderCount');
  const progressText = document.getElementById('loaderText');
  const bar = document.getElementById('loaderBar');
  const fill = document.getElementById('loaderFill');
  const enter = document.getElementById('loaderEnter');
  const world = document.getElementById('pixelWorld');

  const GUEST_KEY = 'mochisura-hero-guest-v1';
  /* 星雫の5色。形も変えて色だけに頼らない */
  const DROP_KINDS = [
    { id: 'night',         glyph: '★', name: '紺の星',    c1: '#25316e', c2: '#e5b86f' },
    { id: 'money',         glyph: '✦', name: '白金の星',  c1: '#8a7746', c2: '#f5efdc' },
    { id: 'compatibility', glyph: '✧', name: '桃の星',    c1: '#b06a86', c2: '#e9c3d8' },
    { id: 'dokuzetsu',     glyph: '◆', name: '紫の星',    c1: '#4a3a7e', c2: '#7f9ae8' },
    { id: 'oracle',        glyph: '●', name: '青緑の星',  c1: '#1f5a4e', c2: '#a8d8b8' }
  ];

  const elapsed = () => performance.now() - boot.start;

  /* ---- 進捗(実素材ベース) ---- */
  const parts = { base: .3, sprite: 0, hero: 0 };
  const heroDone = !world || world.dataset.motionReady === '1';
  parts.hero = heroDone ? .2 : 0;
  if (!heroDone) {
    document.addEventListener('mochisura:hero-ready', () => { parts.hero = .2; render(); }, { once: true });
  }

  let spriteFailed = false;
  const baseSprite = new Image();
  baseSprite.src = 'assets/hero-pets/base-idle-walk.webp';
  baseSprite.decode()
    .then(() => { parts.sprite = .5; render(); })
    .catch(() => { spriteFailed = true; parts.sprite = .5; render(); });

  let announcedDecade = 0;
  const percent = () => Math.round((parts.base + parts.sprite + parts.hero) * 100);
  const ready = () => percent() >= 100;

  function render() {
    const value = percent();
    bar.classList.remove('is-indeterminate');
    fill.style.width = `${Math.max(12, value)}%`;
    const decade = Math.floor(value / 10) * 10;
    if (decade !== announcedDecade) {
      announcedDecade = decade;
      bar.setAttribute('aria-valuenow', String(decade));
    }
    if (!collectedDone) progressText.textContent = `庭をひらいています… ${value}%`;
    if (ready()) onReady();
  }

  /* ---- 状態 ---- */
  let exited = false;
  let gameActive = false;
  let readyHandled = false;
  let collectedDone = false;
  const counts = {};
  let collectedTotal = 0;
  let autoExitTimer = 0;

  function onReady() {
    if (readyHandled || exited) return;
    readyHandled = true;
    if (elapsed() < 700 && !gameActive) { exit(); return; }
    enableEnter('庭へ入る');
    /* ゲーム中でも、遊んでいない人を待たせない。2s操作が無ければ庭へ */
    if (gameActive && collectedTotal === 0) {
      clearTimeout(autoExitTimer);
      autoExitTimer = window.setTimeout(() => { if (collectedTotal === 0) exit(); }, 2000);
    }
  }

  function enableEnter(label) {
    enter.textContent = label;
    enter.classList.add('is-ready');
    enter.setAttribute('aria-disabled', 'false');
  }

  /* ---- 星雫あつめ ---- */
  let kindCursor = Math.floor(Math.random() * DROP_KINDS.length);
  const SPOTS = [
    { x: 12, y: 18 }, { x: 46, y: 58 }, { x: 76, y: 22 },
    { x: 26, y: 66 }, { x: 62, y: 40 }
  ];
  let spotCursor = 0;

  function spawnDrop() {
    const kind = DROP_KINDS[kindCursor % DROP_KINDS.length];
    kindCursor += 1;
    const spot = SPOTS[spotCursor % SPOTS.length];
    spotCursor += 1;
    const drop = document.createElement('button');
    drop.type = 'button';
    drop.className = 'stardrop';
    drop.dataset.kind = kind.id;
    drop.setAttribute('aria-label', `星雫をあつめる（${kind.name}）`);
    drop.style.setProperty('--drop-x', `${spot.x}%`);
    drop.style.setProperty('--drop-y', `${spot.y}%`);
    drop.style.setProperty('--drop-c1', kind.c1);
    drop.style.setProperty('--drop-c2', kind.c2);
    drop.style.setProperty('--drop-dur', `${11 + Math.random() * 6}s`);
    drop.style.setProperty('--drop-delay', `${-Math.random() * 8}s`);
    drop.style.setProperty('--drop-sway', `${10 + Math.random() * 14}px`);
    const glyph = document.createElement('span');
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = kind.glyph;
    drop.appendChild(glyph);
    drop.addEventListener('click', () => collect(drop, kind), { once: true });
    drops.appendChild(drop);
  }

  function collect(drop, kind) {
    if (exited) return;
    counts[kind.id] = (counts[kind.id] || 0) + 1;
    collectedTotal += 1;
    const rect = drop.getBoundingClientRect();
    const dropsRect = drops.getBoundingClientRect();
    drop.style.setProperty('--drop-gather-x', `${dropsRect.width / 2 - (rect.left - dropsRect.left) - rect.width / 2}px`);
    drop.style.setProperty('--drop-gather-y', `${-(rect.top - dropsRect.top) - 90}px`);
    drop.classList.add('is-collected');
    window.setTimeout(() => drop.remove(), 320);
    countText.textContent = `星雫を${collectedTotal}個あつめた`;
    if (collectedTotal >= 3 && !collectedDone) {
      collectedDone = true;
      progressText.textContent = 'だれかが庭へ向かっています…';
      decideGuest();
    }
    if (gameActive) spawnDrop();
  }

  function startGame() {
    if (gameActive || exited) return;
    gameActive = true;
    for (let i = 0; i < 3; i += 1) spawnDrop();
    /* 開始から8sで自動終了。入場可能なら1.2s後に自動で庭へ */
    window.setTimeout(() => {
      if (exited) return;
      gameActive = false;
      drops.querySelectorAll('.stardrop').forEach((drop) => {
        drop.classList.add('is-collected');
        window.setTimeout(() => drop.remove(), 320);
      });
      scheduleAutoExit();
    }, 8000);
  }

  function scheduleAutoExit() {
    clearTimeout(autoExitTimer);
    autoExitTimer = window.setTimeout(() => {
      if (enter.classList.contains('is-ready')) exit();
      else {
        /* まだ素材が来ない。以後は準備完了かボタン点灯で即退出 */
        document.addEventListener('mochisura:hero-ready', () => exit(), { once: true });
        autoExitTimer = window.setTimeout(exit, 3000);
      }
    }, 1200);
  }

  /* ---- 抽選 ---- */
  function decideGuest() {
    let stored = null;
    try { stored = JSON.parse(sessionStorage.getItem(GUEST_KEY)); } catch (_) {}
    if (stored && stored.id) { prefetchGuest(stored.id); return stored.id; }

    const ids = DROP_KINDS.map((kind) => kind.id);
    let pick;
    const entries = Object.entries(counts);
    if (!entries.length) {
      pick = ids[Math.floor(Math.random() * ids.length)];
    } else {
      const max = Math.max(...entries.map(([, n]) => n));
      const tops = entries.filter(([, n]) => n === max).map(([id]) => id);
      pick = tops.length === 1 && Math.random() < .6
        ? tops[0]
        : ids[Math.floor(Math.random() * ids.length)];
    }
    try { sessionStorage.setItem(GUEST_KEY, JSON.stringify({ id: pick, decidedAt: Date.now(), appearances: 0 })); } catch (_) {}
    prefetchGuest(pick);
    return pick;
  }

  function prefetchGuest(id) {
    fetch('assets/hero-pets/manifest.json')
      .then((res) => res.json())
      .then((manifest) => {
        const meta = manifest.characters[id];
        if (meta) { const img = new Image(); img.src = `assets/hero-pets/${meta.sheet}`; }
      })
      .catch(() => {});
  }

  /* ---- 退出 ---- */
  function exit() {
    if (exited) return;
    exited = true;
    clearTimeout(autoExitTimer);
    const guestId = decideGuest();
    if (spriteFailed) document.documentElement.classList.add('hero-static');
    document.documentElement.classList.remove('mochisura-loading');
    loader.dataset.exited = 'done';
    loader.classList.add('is-exit');
    window.setTimeout(() => {
      loader.remove();
      document.dispatchEvent(new CustomEvent('mochisura:loader-done', { detail: { guestId, collected: { ...counts } } }));
    }, reducedMotion.matches ? 120 : 620);
  }

  enter.addEventListener('click', () => {
    if (enter.getAttribute('aria-disabled') === 'true') return;
    exit();
  });

  /* ---- タイムライン ---- */
  render();
  if (!exited) {
    const untilGame = Math.max(0, 700 - elapsed());
    window.setTimeout(() => { if (!ready() && !exited) startGame(); }, untilGame);
    const untilForce = Math.max(0, 4000 - elapsed());
    window.setTimeout(() => {
      if (exited) return;
      if (!enter.classList.contains('is-ready')) enableEnter(ready() ? '庭へ入る' : '庭へ入る（静止画）');
    }, untilForce);
  }
})();
