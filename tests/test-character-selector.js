const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'assets/character-selector.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/character-selector.css'), 'utf8');
const siteCss = fs.readFileSync(path.join(root, 'assets/site.css'), 'utf8');
const failures = [];

function check(label, condition) {
  if (!condition) failures.push(label);
}

check('トップにキャラクターセレクターがある', /id="characterSelectorStage"/.test(html));
check('専用CSSを読み込んでいる', /assets\/character-selector\.css/.test(html));
check('専用JSを読み込んでいる', /assets\/character-selector\.js/.test(html));
check('星と暦の3リンクに物語画像がある', /assets\/story-links\/year-2026-dokuzetsu\.webp/.test(html) && /assets\/story-links\/calendar-mechanism\.webp/.test(html) && /assets\/story-links\/detailed-compatibility\.webp/.test(html));
check('物語リンクは3列からスマホ1列になる', /story-link-grid\s*\{[\s\S]*?repeat\(3/.test(siteCss) && /@media \(max-width:\s*720px\)[\s\S]*?story-link-grid\s*\{\s*grid-template-columns:\s*1fr/.test(siteCss));
check('物語リンクの光演出はホバー時だけ', /story-link-card:hover \.story-link-sheen/.test(siteCss) && /animation:\s*story-link-sheen \.78s/.test(siteCss));
check('占術の説明を専用の信頼性パネルにしている', /class="method-trust-panel"/.test(html) && /east-west-celestial-method\.webp/.test(html));
check('入力内容を外部送信しない表示がある', /入力内容は外部へ送信されず/.test(html) && /method-trust-private/.test(siteCss));
check('信頼性パネルはリンクではない', !/<a\s[^>]*class="method-trust-panel"/.test(html));
check('夜空スラのデータがある', /title:\s*'夜空スラ'/.test(script));
check('夜空スラは十二景診断へ進む', /href:\s*'slime\/index\.html'/.test(script));
check('お金スラはお金の診断へ進む', /id:\s*'money'[\s\S]*?href:\s*'money\/index\.html'/.test(script));
check('相性スラは相性診断へ進む', /id:\s*'compatibility'[\s\S]*?href:\s*'aishou\/index\.html'/.test(script));
check('毒舌スラは星読みへ進む', /id:\s*'dokuzetsu'[\s\S]*?href:\s*'hoshiyomi\/index\.html'/.test(script));
check('カードスラはもちくるへ進む', /id:\s*'oracle'[\s\S]*?href:\s*'oracle\/index\.html'/.test(script));
check('夜空スラの完成カード画像が存在する', fs.existsSync(path.join(root, 'assets/link-characters/night-card-front.webp')));
check('もちスラのカード裏面画像が存在する', fs.existsSync(path.join(root, 'assets/link-characters/mochisura-card-back.webp')));
check('土台に画像を使っていない', !/character-selector-stage::before[\s\S]*?url\(/.test(css));
check('物体を持たない発光体がある', /character-selector-stage::before[\s\S]*?width:\s*180px[\s\S]*?border:\s*0[\s\S]*?transparent 72%/.test(css));
check('発光体の下に影を置いていない', /character-selector-stage::after[\s\S]*?content:\s*none/.test(css));
check('カードに表面と裏面がある', /mochi-portal-face-front/.test(script) && /mochi-portal-face-back/.test(script));
check('表面も完成画像を使っている', /cardFront:\s*'assets\/link-characters\/night-card-front\.webp\?v=20260814-alpha1'/.test(script));
check('カード内をCSSテキストで組んでいない', !/mochi-portal-card h3|mochi-portal-copy|mochi-portal-cta/.test(css));
check('画像カード全体に浮遊モーションがある', /portal-card-float/.test(css) && /mochi-portal-card-motion/.test(script));
check('会うボタンをカードの近くに置いている', /mochi-portal-stage-link/.test(script) && /mochi-portal-stage-link/.test(css));
check('奥へ移動したカードの会うボタンを隠す', /mochi-portal-stage-link\[hidden\]/.test(css));
check('下部説明に重複リンクがない', !/character-selector-detail-link/.test(script));
check('カードを180度回転する', /rotateY\(180deg\)/.test(css));
check('5体の完成カードで構成している', /id:\s*'night'/.test(script) && /id:\s*'money'/.test(script) && /id:\s*'compatibility'/.test(script) && /id:\s*'dokuzetsu'/.test(script) && /id:\s*'oracle'/.test(script));
check('ダミーカードが残っていない', !/dummy-|COMING SOON|placeholder:\s*true/.test(script));
check('非選択カードも各キャラの表面を見せる', !/!isActive && !character\.placeholder/.test(script));
check('円卓の左右操作がある', /character-ring-controls/.test(script) && /character-ring-button/.test(css));
check('カードを左右へスワイプできる', /enableSwipe/.test(script) && /pointerdown/.test(script) && /pointermove/.test(script) && /pointerup/.test(script));
check('スワイプ中も回転軸をスライドさせない', !/swipe-shift/.test(script) && !/swipe-shift/.test(css) && !/trackedDistance/.test(script));
check('縦スクロールと横スワイプを判定する', /Math\.abs\(deltaX\) > Math\.abs\(deltaY\) \* 1\.15/.test(script));
check('長押し中はカードの軸を固定する', /is-pointer-down/.test(script) && /animation-play-state:\s*paused/.test(css));
check('長押しをスワイプやタップに誤変換しない', /longPressed/.test(script) && /holdTimer/.test(script) && /wasLongPress/.test(script));
check('カードの長押しメニューを抑止する', /contextmenu/.test(script) && /-webkit-touch-callout:\s*none/.test(css));
check('スワイプ後の誤クリックを防ぐ', /suppressCardClick/.test(script));
check('指を離した速度から慣性を計算する', /releaseVelocity/.test(script) && /velocityDecay/.test(script) && /projectedDistance/.test(script));
check('瞬間的な速度ノイズを平均速度で抑える', /averageVelocity/.test(script) && /stableReleaseVelocity/.test(script) && /averageVelocity \* 2\.4/.test(script));
check('短い操作は複数枚フリックにしない', /canCoast/.test(script) && /swipeDistance >= 90/.test(script));
check('強いフリックで最大3枚進める', /Math\.min\(3, steps\)/.test(script) && /swipeDistance >= 165/.test(script) && /projectedDistance >= 285/.test(script));
check('慣性移動は毎フレーム連続描画する', /drawOrbit/.test(script) && /requestAnimationFrame\(animate\)/.test(script) && /Math\.pow\(1 - progress, 3\.2\)/.test(script));
check('連続軌道は通常の5配置と同じ停止位置を通る', /poseStops/.test(script) && /poseAt/.test(script) && /lerp\('dx'\)/.test(script));
check('慣性中はCSS段階遷移を止める', /is-coasting[\s\S]*?transition:\s*none/.test(css));
check('軸を動かさず傾きだけ指へ追従する', /--swipe-tilt/.test(script) && /rotateZ\(var\(--swipe-tilt/.test(css));
check('前後関係をスロットで切り替える', /data-slot="front"/.test(css) && /z-index:\s*10/.test(css));
check('主役カードを発光球の手前へ配置する', /data-slot="front"[\s\S]*?top:\s*104px/.test(css));
check('すべてのカードを縦向きで配置する', !/data-slot="left"[\s\S]*?scaleY\(/.test(css));
check('カードを逆扇形に傾ける', /data-slot="left"[\s\S]*?rotate\(4deg\)/.test(css) && /data-slot="right"[\s\S]*?rotate\(-4deg\)/.test(css));
check('回転時パーティクルを生成する', /portal-flip-particle/.test(script) && /portal-flip-burst/.test(css));
check('円周回転でも前後のカードから粒子を生成する', /\[previousIndex, activeIndex\]/.test(script) && /createParticles\(particleLayer, 10, 150\)/.test(script));
check('回転完了後にパーティクルを消す', /layer\.textContent\s*=\s*''/.test(script));
check('画像カードのボタンに説明がある', /setAttribute\('aria-label'/.test(script));
check('既存の汎用cardクラスを使っていない', !/className\s*=\s*['"]card['"]/.test(script));
check('reduced-motion対応がある', /prefers-reduced-motion:\s*reduce/.test(css));
check('フォーカス表示がある', /focus-visible/.test(css));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('character selector test passed');
