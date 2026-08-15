(() => {
  'use strict';

  const cardBack = 'assets/link-characters/mochisura-card-back.webp';
  const characters = [
    {
      id: 'night',
      title: '夜空スラ',
      topic: '暦と十二の景色',
      description: '生年月日からひらく十二の景色。暦を手がかりに、いまのあなたの輪郭をそっと照らします。',
      cardFront: 'assets/link-characters/night-card-front.webp?v=20260814-alpha1',
      cardBack,
      href: 'slime/index.html',
      need: '生年月日だけ'
    },
    {
      id: 'money',
      title: 'お金スラ',
      topic: 'お金と価値観のバランス',
      description: '大事にしたいものと、実際の使い方。その間にあるバランスを、やさしく現実的に見つめます。',
      cardFront: 'assets/link-characters/money-card-front.webp?v=20260814-alpha1',
      cardBack,
      href: 'money/index.html',
      need: '生年月日＋七つへの配点'
    },
    {
      id: 'compatibility',
      title: '相性スラ',
      topic: '人と人のつながり',
      description: 'ふたつの光が与え合うものを読み、人との距離やつながり方をそっと見つめます。',
      cardFront: 'assets/link-characters/compatibility-card-front.webp?v=20260814-alpha1',
      cardBack,
      href: 'aishou/index.html',
      need: '生年月日ふたつ'
    },
    {
      id: 'dokuzetsu',
      title: '毒舌スラ',
      topic: '星読みをズバッと',
      description: 'そのままでは見えにくい本音を、少し辛口の言葉でズバッと届けます。',
      cardFront: 'assets/link-characters/dokuzetsu-card-front.webp?v=20260814-alpha1',
      cardBack,
      href: 'hoshiyomi/index.html',
      need: '生年月日・時刻・場所'
    },
    {
      id: 'oracle',
      title: 'カードスラ',
      topic: 'もちくる36枚の案内役',
      description: '36枚のカードから、いまのあなたに必要なメッセージへ案内します。',
      cardFront: 'assets/link-characters/oracle-card-front.webp?v=20260814-alpha1',
      cardBack,
      href: 'oracle/index.html',
      need: '入力なし・36枚から一枚'
    }
  ];

  const stage = document.querySelector('#characterSelectorStage');
  const detail = document.querySelector('#characterSelectorDetail');
  if (!stage || !detail) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const slots = ['far-left', 'left', 'front', 'right', 'far-right'];
  let activeIndex = 0;
  let ringLocked = false;
  let suppressCardClick = false;
  let inertiaRunId = 0;

  const normalizeOffset = (index) => {
    let offset = index - activeIndex;
    if (offset > 2) offset -= characters.length;
    if (offset < -2) offset += characters.length;
    return offset;
  };

  const createParticles = (layer, count = 18, maxDistance = 208) => {
    if (prefersReducedMotion.matches) return;
    layer.textContent = '';
    const fragment = document.createDocumentFragment();
    const colors = ['#f5cf73', '#fff3bd', '#89aef6', '#dce8ff'];

    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement('span');
      const angle = (Math.PI * 2 * index) / count + (Math.random() - .5) * .24;
      const distance = maxDistance * .54 + Math.random() * maxDistance * .46;
      particle.className = `portal-flip-particle${index % 4 === 0 ? ' is-star' : ''}`;
      particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance * .72}px`);
      particle.style.setProperty('--particle-delay', `${Math.random() * 90}ms`);
      particle.style.setProperty('--particle-size', `${4 + Math.random() * 5}px`);
      particle.style.setProperty('--particle-color', colors[index % colors.length]);
      fragment.appendChild(particle);
    }

    layer.appendChild(fragment);
    window.setTimeout(() => { layer.textContent = ''; }, 850);
  };

  /* ポケポケ風チルトの後始末。カードが手前を離れるとき・スワイプ開始時に呼ぶ。 */
  const clearTilt = (card) => {
    card.classList.remove('is-tilting');
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
    card.style.setProperty('--glare-o', '0');
  };

  const flipCard = (card, floatLayer, character) => {
    if (character.placeholder || card.dataset.flipping === 'true') return;
    const willShowBack = !card.classList.contains('is-flipped');
    card.dataset.flipping = 'true';
    floatLayer.classList.add('is-flipping');
    createParticles(floatLayer.querySelector('.portal-flip-particles'));
    card.classList.toggle('is-flipped', willShowBack);
    card.setAttribute('aria-pressed', String(willShowBack));
    card.setAttribute('aria-label', willShowBack
      ? `${character.title}のカード裏面。もう一度押すと表面に戻ります`
      : `${character.title}のカード。押すと裏面を表示します`);

    window.setTimeout(() => {
      card.dataset.flipping = 'false';
      floatLayer.classList.remove('is-flipping');
    }, prefersReducedMotion.matches ? 120 : 720);
  };

  const createCard = (character, index) => {
    const floatLayer = document.createElement('div');
    floatLayer.className = 'mochi-portal-float';
    floatLayer.dataset.characterIndex = String(index);
    floatLayer.style.setProperty('--float-delay', `${index * -.43}s`);

    const cardMotion = document.createElement('span');
    cardMotion.className = 'mochi-portal-card-motion';

    const card = document.createElement('button');
    card.className = 'mochi-portal-card';
    card.type = 'button';
    card.dataset.characterId = character.id;
    card.dataset.index = String(index);
    card.dataset.flipping = 'false';
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-posinset', String(index + 1));
    card.setAttribute('aria-setsize', String(characters.length));

    const cardInner = document.createElement('span');
    cardInner.className = 'mochi-portal-card-inner';
    const front = document.createElement('span');
    front.className = 'mochi-portal-face mochi-portal-face-front';
    const frontImage = document.createElement('img');
    frontImage.loading = 'lazy';
    frontImage.src = character.cardFront;
    frontImage.alt = '';
    frontImage.width = 720;
    frontImage.height = 1028;
    front.appendChild(frontImage);

    const back = document.createElement('span');
    back.className = 'mochi-portal-face mochi-portal-face-back';
    back.setAttribute('aria-hidden', 'true');
    const backImage = document.createElement('img');
    backImage.loading = 'lazy';
    backImage.src = character.cardBack;
    backImage.alt = '';
    backImage.width = 720;
    backImage.height = 1028;
    back.appendChild(backImage);

    cardInner.append(front, back);
    card.appendChild(cardInner);
    cardMotion.appendChild(card);

    const floorShadow = document.createElement('span');
    floorShadow.className = 'mochi-portal-floor-shadow';
    floorShadow.setAttribute('aria-hidden', 'true');
    const particles = document.createElement('span');
    particles.className = 'portal-flip-particles';
    particles.setAttribute('aria-hidden', 'true');

    if (character.href) {
      const stageLink = document.createElement('a');
      stageLink.className = 'mochi-portal-stage-link';
      stageLink.href = character.href;
      stageLink.textContent = `${character.title}に会う →`;
      floatLayer.append(cardMotion, stageLink, particles, floorShadow);
    } else {
      floatLayer.append(cardMotion, particles, floorShadow);
    }

    card.addEventListener('click', () => {
      if (suppressCardClick) return;
      if (index !== activeIndex) {
        const offset = normalizeOffset(index);
        rotateRing(offset < 0 ? -1 : 1, Math.abs(offset));
        return;
      }
      flipCard(card, floatLayer, character);
    });

    /* 手前のカードだけ、ポインタ位置で3Dに傾ける。矩形はチルトの影響を受けない外側ラッパーから取る。 */
    const updateTilt = (event) => {
      if (prefersReducedMotion.matches
        || !floatLayer.classList.contains('is-active')
        || stage.classList.contains('is-swiping')
        || stage.classList.contains('is-coasting')) return;
      const rect = cardMotion.getBoundingClientRect();
      const px = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
      const py = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
      card.classList.add('is-tilting');
      card.style.setProperty('--tilt-x', `${(py * -24).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(px * 32).toFixed(2)}deg`);
      card.style.setProperty('--glare-x', `${(50 + px * 100).toFixed(1)}%`);
      card.style.setProperty('--glare-y', `${(50 + py * 100).toFixed(1)}%`);
      card.style.setProperty('--glare-o', `${(.35 + Math.min(1, Math.hypot(px, py) * 2.2) * .5).toFixed(2)}`);
    };

    card.addEventListener('pointerenter', updateTilt);
    card.addEventListener('pointermove', updateTilt);
    card.addEventListener('pointerleave', () => clearTilt(card));
    card.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse') clearTilt(card);
    });
    card.addEventListener('pointercancel', () => clearTilt(card));
    return floatLayer;
  };

  const renderDetail = (character) => {
    detail.textContent = '';
    const copy = document.createElement('div');
    copy.className = 'character-selector-detail-copy';
    const topic = document.createElement('small');
    topic.textContent = character.topic;
    const title = document.createElement('strong');
    title.textContent = character.title;
    const description = document.createElement('p');
    description.textContent = character.description;
    copy.append(topic, title, description);
    if (character.need) {
      const need = document.createElement('span');
      need.className = 'need';
      need.textContent = character.need;
      copy.append(need);
    }
    detail.append(copy);
  };

  function setActive(nextIndex, transitionDuration = 720) {
    if (ringLocked || nextIndex === activeIndex && stage.classList.contains('is-ready')) return false;
    const previousIndex = activeIndex;
    const isRingMove = stage.classList.contains('is-ready') && nextIndex !== activeIndex;
    ringLocked = true;
    activeIndex = (nextIndex + characters.length) % characters.length;
    stage.dataset.activeIndex = String(activeIndex);

    stage.querySelectorAll('.mochi-portal-float').forEach((floatLayer, index) => {
      const offset = normalizeOffset(index);
      const slot = slots[offset + 2];
      const isActive = offset === 0;
      const character = characters[index];
      const card = floatLayer.querySelector('.mochi-portal-card');
      const link = floatLayer.querySelector('.mochi-portal-stage-link');

      floatLayer.dataset.slot = slot;
      floatLayer.classList.toggle('is-active', isActive);
      if (!isActive) clearTilt(card);
      card.setAttribute('aria-current', isActive ? 'true' : 'false');
      card.tabIndex = isActive ? 0 : -1;
      if (link) link.hidden = !isActive;

      card.classList.remove('is-flipped');
      card.setAttribute('aria-pressed', 'false');

      card.setAttribute('aria-label', isActive
        ? character.placeholder ? `${character.title}、準備中` : `${character.title}のカード。押すと裏面を表示します`
        : `${character.title}を手前へ移動`);
    });

    renderDetail(characters[activeIndex]);

    if (isRingMove) {
      [previousIndex, activeIndex].forEach((index) => {
        const particleLayer = stage.querySelector(`.mochi-portal-float[data-character-index="${index}"] .portal-flip-particles`);
        createParticles(particleLayer, 10, 150);
      });
    }

    window.setTimeout(() => { ringLocked = false; }, prefersReducedMotion.matches ? 120 : transitionDuration + 40);
    return true;
  }

  const rotateRing = (direction, steps = 1, releaseVelocity = 0) => {
    if (ringLocked) return;
    const normalizedDirection = direction < 0 ? -1 : 1;
    const stepCount = Math.max(1, Math.min(3, steps));
    const runId = ++inertiaRunId;
    const targetIndex = activeIndex + normalizedDirection * stepCount;

    if (prefersReducedMotion.matches) {
      stage.style.setProperty('--ring-duration', '120ms');
      setActive(targetIndex, 120);
      return;
    }

    /* 軌道はスロット姿勢そのものを区分補間する。曲線近似だと正面付近で横速度が
       死んで、送り出されるカードが中央に居残って見える。
       u=|offset| が 0(正面)→1(横)→2(端)→2.5(背面中央) の順に通る。dxは中央からの距離。 */
    const poseStops = [0, 1, 2, 2.5];
    const poses = window.matchMedia('(max-width: 720px)').matches
      ? [
        { dx: 0, y: 96, s: 1, r: 0, o: 1, br: 1, sa: 1, z: 10 },
        { dx: 33, y: 106, s: .48, r: -4, o: .76, br: .72, sa: .82, z: 6 },
        { dx: 50, y: 80, s: .3, r: -8, o: .5, br: .58, sa: .72, z: 4 },
        { dx: 0, y: 66, s: .27, r: 0, o: .42, br: .5, sa: .68, z: 3 }
      ]
      : [
        { dx: 0, y: 104, s: 1, r: 0, o: 1, br: 1, sa: 1, z: 10 },
        { dx: 23, y: 112, s: .6, r: -4, o: .76, br: .72, sa: .82, z: 6 },
        { dx: 41, y: 72, s: .4, r: -8, o: .5, br: .58, sa: .72, z: 4 },
        { dx: 0, y: 58, s: .36, r: 0, o: .42, br: .5, sa: .68, z: 3 }
      ];

    const poseAt = (offset) => {
      const sign = offset < 0 ? -1 : 1;
      const u = Math.min(2.5, Math.abs(offset));
      let segment = 0;
      while (segment < poseStops.length - 2 && u > poseStops[segment + 1]) segment += 1;
      const t = (u - poseStops[segment]) / (poseStops[segment + 1] - poseStops[segment]);
      const a = poses[segment];
      const b = poses[segment + 1];
      const lerp = (key) => a[key] + (b[key] - a[key]) * t;
      return {
        x: 50 + sign * lerp('dx'),
        y: lerp('y'),
        scale: lerp('s'),
        rotation: sign * lerp('r'),
        opacity: lerp('o'),
        brightness: lerp('br'),
        saturation: lerp('sa'),
        zIndex: Math.round(lerp('z'))
      };
    };

    const floatLayers = [...stage.querySelectorAll('.mochi-portal-float')];
    const startIndex = activeIndex;
    const duration = Math.round(620 + (stepCount - 1) * 300 - Math.min(Math.abs(releaseVelocity), 1.8) * 90);
    const startTime = performance.now();
    ringLocked = true;
    stage.classList.add('is-coasting');

    const drawOrbit = (currentIndex) => {
      floatLayers.forEach((floatLayer, index) => {
        let offset = index - currentIndex;
        while (offset > characters.length / 2) offset -= characters.length;
        while (offset < -characters.length / 2) offset += characters.length;
        const pose = poseAt(offset);
        floatLayer.style.left = `${pose.x}%`;
        floatLayer.style.top = `${pose.y}px`;
        floatLayer.style.opacity = String(pose.opacity);
        floatLayer.style.filter = `brightness(${pose.brightness}) saturate(${pose.saturation})`;
        floatLayer.style.transform = `translateX(-50%) scale(${pose.scale}) rotate(${pose.rotation}deg)`;
        floatLayer.style.zIndex = String(pose.zIndex);
      });
    };

    const animate = (now) => {
      if (runId !== inertiaRunId) return;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3.2);
      drawOrbit(startIndex + normalizedDirection * stepCount * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
        return;
      }

      floatLayers.forEach((floatLayer) => {
        floatLayer.style.removeProperty('left');
        floatLayer.style.removeProperty('top');
        floatLayer.style.removeProperty('opacity');
        floatLayer.style.removeProperty('filter');
        floatLayer.style.removeProperty('transform');
        floatLayer.style.removeProperty('z-index');
      });
      ringLocked = false;
      stage.classList.remove('is-coasting');
      stage.style.setProperty('--ring-duration', '0ms');
      setActive(targetIndex, 0);
      requestAnimationFrame(() => stage.style.setProperty('--ring-duration', '720ms'));
    };

    requestAnimationFrame(animate);
  };

  const enableSwipe = () => {
    const gesture = {
      pointerId: null,
      startX: 0,
      startY: 0,
      startTime: 0,
      lastX: 0,
      lastTime: 0,
      velocityX: 0,
      axis: null,
      longPressed: false,
      holdTimer: 0
    };

    const resetGesture = () => {
      window.clearTimeout(gesture.holdTimer);
      stage.classList.remove('is-pointer-down');
      stage.classList.remove('is-swiping');
      stage.style.setProperty('--swipe-tilt', '0deg');
      gesture.pointerId = null;
      gesture.axis = null;
      gesture.longPressed = false;
      gesture.holdTimer = 0;
    };

    stage.addEventListener('pointerdown', (event) => {
      if (ringLocked || event.button !== 0 || !event.target.closest('.mochi-portal-card')) return;
      gesture.pointerId = event.pointerId;
      gesture.startX = event.clientX;
      gesture.startY = event.clientY;
      gesture.startTime = performance.now();
      gesture.lastX = event.clientX;
      gesture.lastTime = gesture.startTime;
      gesture.velocityX = 0;
      gesture.axis = null;
      gesture.longPressed = false;
      stage.classList.add('is-pointer-down');
      gesture.holdTimer = window.setTimeout(() => {
        if (gesture.pointerId !== event.pointerId || gesture.axis) return;
        gesture.longPressed = true;
        suppressCardClick = true;
      }, 360);
    });

    stage.addEventListener('pointermove', (event) => {
      if (event.pointerId !== gesture.pointerId) return;
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;
      const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY));

      if (gesture.longPressed) return;

      if (!gesture.axis && distance > 12) {
        window.clearTimeout(gesture.holdTimer);
        gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? 'horizontal' : 'vertical';
        if (gesture.axis === 'horizontal') {
          stage.setPointerCapture(event.pointerId);
          stage.classList.add('is-swiping');
          stage.querySelectorAll('.mochi-portal-card.is-tilting').forEach(clearTilt);
        }
      }

      if (gesture.axis !== 'horizontal') return;
      event.preventDefault();
      const now = performance.now();
      const sampleTime = Math.max(1, now - gesture.lastTime);
      const sampledVelocity = (event.clientX - gesture.lastX) / sampleTime;
      gesture.velocityX = gesture.velocityX * .58 + sampledVelocity * .42;
      gesture.lastX = event.clientX;
      gesture.lastTime = now;
      const tilt = Math.max(-3.2, Math.min(3.2, deltaX * .018));
      stage.style.setProperty('--swipe-tilt', `${tilt}deg`);
    });

    stage.addEventListener('pointerup', (event) => {
      if (event.pointerId !== gesture.pointerId) return;
      const deltaX = event.clientX - gesture.startX;
      const elapsed = Math.max(1, performance.now() - gesture.startTime);
      const idleTime = Math.max(0, performance.now() - gesture.lastTime);
      const velocityDecay = Math.max(0, 1 - idleTime / 180);
      const releaseVelocity = gesture.velocityX * velocityDecay;
      const averageVelocity = Math.abs(deltaX) / elapsed;
      const stableReleaseVelocity = Math.min(Math.abs(releaseVelocity), averageVelocity * 2.4);
      const velocity = Math.max(stableReleaseVelocity, averageVelocity * .35);
      const wasHorizontal = gesture.axis === 'horizontal';
      const wasLongPress = gesture.longPressed;
      resetGesture();

      if (wasLongPress) {
        window.setTimeout(() => { suppressCardClick = false; }, 400);
        return;
      }
      if (!wasHorizontal || Math.abs(deltaX) < 30 && velocity < .24) return;
      suppressCardClick = true;
      window.setTimeout(() => { suppressCardClick = false; }, 520);
      const projectedDistance = Math.abs(deltaX) + velocity * 150;
      const swipeDistance = Math.abs(deltaX);
      const canCoast = elapsed < 520 && swipeDistance >= 90;
      const steps = canCoast && swipeDistance >= 165 && (projectedDistance >= 285 || velocity >= 1.35)
        ? 3
        : canCoast && (projectedDistance >= 145 || velocity >= .62) ? 2 : 1;
      rotateRing(deltaX < 0 ? 1 : -1, steps, velocity);
    });

    stage.addEventListener('pointercancel', resetGesture);
    stage.addEventListener('contextmenu', (event) => {
      if (event.target.closest('.mochi-portal-card')) event.preventDefault();
    });
  };

  const createControls = () => {
    const controls = document.createElement('div');
    controls.className = 'character-ring-controls';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'character-ring-button is-previous';
    previous.setAttribute('aria-label', '前のカードを手前へ');
    previous.textContent = '‹';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'character-ring-button is-next';
    next.setAttribute('aria-label', '次のカードを手前へ');
    next.textContent = '›';
    previous.addEventListener('click', () => rotateRing(-1));
    next.addEventListener('click', () => rotateRing(1));
    controls.append(previous, next);
    return controls;
  };

  characters.forEach((character, index) => stage.appendChild(createCard(character, index)));
  stage.appendChild(createControls());
  enableSwipe();
  stage.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    rotateRing(event.key === 'ArrowRight' ? 1 : -1);
  });

  setActive(0);
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('is-ready')));
})();
