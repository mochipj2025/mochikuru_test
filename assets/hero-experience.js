/* ヒーローのランダムゲスト。
   - 同時に1体だけ。自動登場は1セッション最大2回
   - 初回はローダーの抽選結果(sessionStorage)。無ければ乱数
   - 画像は選出後に遅延ロード。失敗したらゲストは出さず、庭は通常のまま
   - 星雫再プレイ(右下✦)で抽選し直して、もう一度だけ呼べる
   - 昼夜はCSS側(.pixel-world.is-night)が引き受けるのでJSでは追わない */

import { loadGuest, createSprite } from './hero-pet-runtime.js?v=20260814-star1';

const GUEST_KEY = 'mochisura-hero-guest-v1';
const IDS = ['night', 'money', 'compatibility', 'dokuzetsu', 'oracle'];

const world = document.getElementById('pixelWorld');
const petActor = document.getElementById('petActor');
const potActor = document.getElementById('potActor');
if (world) init();

function init() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const readState = () => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(GUEST_KEY));
      if (stored && IDS.includes(stored.id)) return stored;
    } catch (_) {}
    return { id: IDS[Math.floor(Math.random() * IDS.length)], decidedAt: Date.now(), appearances: 0 };
  };
  const writeState = (state) => {
    try { sessionStorage.setItem(GUEST_KEY, JSON.stringify(state)); } catch (_) {}
  };
  let state = readState();
  writeState(state);

  let guestEl = null;
  let bubbleEl = null;
  let stayTimer = 0;
  let nextTimer = 0;
  let loading = false;

  /* ---- 開始条件: ローダー退出 → 最初のユーザー操作 → 2〜4s ---- */
  const armFirstInteraction = () => {
    let armed = false;
    const onFirst = () => {
      if (armed) return;
      armed = true;
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
      window.removeEventListener('scroll', onFirst);
      scheduleShow(2000 + Math.random() * 2000);
    };
    window.addEventListener('pointerdown', onFirst, { passive: true });
    window.addEventListener('keydown', onFirst);
    window.addEventListener('scroll', onFirst, { passive: true, once: true });
  };
  if (document.getElementById('mochisuraLoader')) {
    document.addEventListener('mochisura:loader-done', (event) => {
      if (event.detail?.guestId && IDS.includes(event.detail.guestId)) {
        state = readState();
      }
      armFirstInteraction();
    }, { once: true });
  } else {
    armFirstInteraction();
  }

  function scheduleShow(delay) {
    clearTimeout(nextTimer);
    nextTimer = window.setTimeout(() => show(false), delay);
  }

  /* ---- 登場 ---- */
  async function show(manual) {
    if (guestEl || loading) return;
    if (!manual && state.appearances >= 2) return;
    if (document.visibilityState === 'hidden') {
      /* タブが見えるようになってから、手動/自動の区別を保ったまま出す */
      const onVisible = () => {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', onVisible);
        window.setTimeout(() => show(manual), 1200);
      };
      document.addEventListener('visibilitychange', onVisible);
      return;
    }
    loading = true;
    let guest;
    try {
      guest = await loadGuest(state.id);
    } catch (_) {
      loading = false;
      return; /* 画像が来なければ何もしない。庭は通常のまま */
    }
    loading = false;

    const sprite = createSprite(guest.manifest, guest.sheetUrl);
    guestEl = document.createElement('button');
    guestEl.type = 'button';
    guestEl.className = 'hero-guest is-entering';
    guestEl.dataset.char = state.id;
    guestEl.setAttribute('aria-label', `${guest.meta.title}が遊びに来た。押すと紹介を表示`);
    const fx = document.createElement('span');
    fx.className = 'hero-guest-fx';
    fx.setAttribute('aria-hidden', 'true');
    guestEl.append(sprite.el, fx);
    guestEl.style.left = `${placeX(guest.meta.spot)}%`;
    world.appendChild(guestEl);

    document.dispatchEvent(new CustomEvent('mochisura:guest', { detail: { phase: 'enter', id: state.id } }));

    sprite.play('greeting', {
      loop: false,
      onDone: () => sprite.play('idle')
    });
    window.setTimeout(() => guestEl?.classList.remove('is-entering'), reducedMotion.matches ? 150 : 900);

    guestEl.addEventListener('click', () => {
      if (bubbleEl) return;
      openBubble(guest, sprite);
    });

    startStayTimer(guest, sprite);
  }

  function placeX(preferred) {
    /* 既存のPetと鉢植えに56px以上寄せない。%で持ち、実測pxで検算する */
    const width = world.clientWidth || 600;
    let x = preferred;
    const guestWidth = 120;
    const zones = [];
    if (petActor) zones.push([petActor.offsetLeft - 56, petActor.offsetLeft + petActor.offsetWidth + 56]);
    if (potActor) zones.push([potActor.offsetLeft - 56, potActor.offsetLeft + potActor.offsetWidth + 56]);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const px = width * x / 100;
      const hit = zones.some(([lo, hi]) => px + guestWidth > lo && px < hi);
      if (!hit) break;
      x = 14 + ((x + 17) % 60);
    }
    return Math.max(4, Math.min(76, x));
  }

  function startStayTimer(guest, sprite) {
    clearTimeout(stayTimer);
    stayTimer = window.setTimeout(() => exitGuest(guest, sprite), 8000 + Math.random() * 4000);
  }

  /* ---- 吹き出し ---- */
  function openBubble(guest, sprite) {
    clearTimeout(stayTimer);
    sprite.play('surprise', { loop: false, onDone: () => sprite.play('idle') });

    bubbleEl = document.createElement('div');
    bubbleEl.className = 'hero-guest-bubble';
    bubbleEl.dataset.char = state.id;
    const topic = document.createElement('small');
    topic.textContent = guest.meta.topic;
    const title = document.createElement('strong');
    title.textContent = guest.meta.title;
    const accent = document.createElement('span');
    accent.className = 'hero-guest-bubble-accent';
    accent.setAttribute('aria-hidden', 'true');
    const cta = document.createElement('a');
    cta.className = 'hero-guest-cta';
    cta.href = guest.meta.href;
    cta.textContent = `${guest.meta.cta} →`;
    const later = document.createElement('button');
    later.type = 'button';
    later.className = 'hero-guest-later';
    later.textContent = 'また今度';
    bubbleEl.append(accent, topic, title, cta, later);
    world.appendChild(bubbleEl);
    positionBubble();
    world.classList.add('has-guest-bubble');

    const close = () => {
      if (!bubbleEl) return;
      bubbleEl.remove();
      bubbleEl = null;
      world.classList.remove('has-guest-bubble');
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onOutside, true);
      guestEl?.focus();
      if (guestEl) startStayTimer(guest, sprite);
    };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    const onOutside = (event) => {
      if (bubbleEl && !bubbleEl.contains(event.target) && event.target !== guestEl && !guestEl?.contains(event.target)) close();
    };
    later.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onOutside, true);
    cta.focus();
  }

  function positionBubble() {
    if (!bubbleEl || !guestEl) return;
    const width = world.clientWidth || 600;
    const guestLeft = guestEl.offsetLeft + guestEl.offsetWidth / 2;
    const bubbleWidth = Math.min(240, width - 24);
    let left = guestLeft - bubbleWidth / 2;
    left = Math.max(12, Math.min(width - bubbleWidth - 12, left));
    bubbleEl.style.left = `${left}px`;
    bubbleEl.style.width = `${bubbleWidth}px`;
  }

  /* ---- 退場 ---- */
  function exitGuest(guest, sprite) {
    if (!guestEl) return;
    if (bubbleEl) { startStayTimer(guest, sprite); return; } /* 読んでいる間は帰らない */
    const el = guestEl;
    guestEl = null;
    clearTimeout(stayTimer);
    sprite.stop();
    el.classList.add('is-exiting');
    window.setTimeout(() => el.remove(), 600);
    document.dispatchEvent(new CustomEvent('mochisura:guest', { detail: { phase: 'exit', id: state.id } }));
    state.appearances += 1;
    writeState(state);
    if (state.appearances < 2) scheduleShow(45000 + Math.random() * 45000);
  }

  /* ---- 星雫の再プレイ(右下✦) ---- */
  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'stardrop-replay';
  replay.setAttribute('aria-label', '星雫あつめをもう一度あそぶ');
  replay.textContent = '✦';
  world.appendChild(replay);

  const REPLAY_KINDS = [
    { id: 'night',         glyph: '★', name: '紺の星',   c1: '#25316e', c2: '#e5b86f' },
    { id: 'money',         glyph: '✦', name: '白金の星', c1: '#8a7746', c2: '#f5efdc' },
    { id: 'compatibility', glyph: '✧', name: '桃の星',   c1: '#b06a86', c2: '#e9c3d8' },
    { id: 'dokuzetsu',     glyph: '◆', name: '紫の星',   c1: '#4a3a7e', c2: '#7f9ae8' },
    { id: 'oracle',        glyph: '●', name: '青緑の星', c1: '#1f5a4e', c2: '#a8d8b8' }
  ];

  replay.addEventListener('click', () => {
    if (world.querySelector('.stardrop-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'stardrop-overlay';
    overlay.setAttribute('role', 'group');
    overlay.setAttribute('aria-label', '星雫あつめ。3個あつめると、だれかが遊びに来る');
    const note = document.createElement('p');
    note.className = 'stardrop-overlay-note';
    note.setAttribute('aria-live', 'polite');
    note.textContent = '星雫を3個あつめよう';
    overlay.appendChild(note);
    world.appendChild(overlay);

    const counts = {};
    let total = 0;
    let cursor = Math.floor(Math.random() * REPLAY_KINDS.length);
    const spots = [{ x: 18, y: 26 }, { x: 48, y: 56 }, { x: 72, y: 30 }, { x: 30, y: 62 }, { x: 60, y: 40 }];
    let spotCursor = 0;

    const closeOverlay = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      replay.focus();
    };
    const onKey = (event) => { if (event.key === 'Escape') closeOverlay(); };
    document.addEventListener('keydown', onKey);

    const spawn = () => {
      const kind = REPLAY_KINDS[cursor % REPLAY_KINDS.length];
      cursor += 1;
      const spot = spots[spotCursor % spots.length];
      spotCursor += 1;
      const drop = document.createElement('button');
      drop.type = 'button';
      drop.className = 'stardrop';
      drop.setAttribute('aria-label', `星雫をあつめる（${kind.name}）`);
      drop.style.setProperty('--drop-x', `${spot.x}%`);
      drop.style.setProperty('--drop-y', `${spot.y}%`);
      drop.style.setProperty('--drop-c1', kind.c1);
      drop.style.setProperty('--drop-c2', kind.c2);
      drop.style.setProperty('--drop-dur', `${11 + Math.random() * 6}s`);
      drop.style.setProperty('--drop-delay', `${-Math.random() * 8}s`);
      const glyph = document.createElement('span');
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = kind.glyph;
      drop.appendChild(glyph);
      drop.addEventListener('click', () => {
        counts[kind.id] = (counts[kind.id] || 0) + 1;
        total += 1;
        drop.classList.add('is-collected');
        window.setTimeout(() => drop.remove(), 320);
        if (total >= 3) {
          note.textContent = 'だれかが庭へ向かっています…';
          const entries = Object.entries(counts);
          const max = Math.max(...entries.map(([, n]) => n));
          const tops = entries.filter(([, n]) => n === max).map(([id]) => id);
          const pick = tops.length === 1 && Math.random() < .6
            ? tops[0]
            : IDS[Math.floor(Math.random() * IDS.length)];
          state = { ...state, id: pick };
          writeState(state);
          window.setTimeout(() => { closeOverlay(); show(true); }, 900);
        } else {
          note.textContent = `星雫を${total}個あつめた`;
          spawn();
        }
      }, { once: true });
      overlay.appendChild(drop);
    };
    for (let i = 0; i < 3; i += 1) spawn();
  });

  window.addEventListener('resize', positionBubble, { passive: true });
}
