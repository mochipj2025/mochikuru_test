// ヒーロー／ロード画面／星雫あつめ の静的検査。
// 実行: node tests/test-hero-experience.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const expect = (ok, message) => { if (!ok) failures.push(message); };

/* 1. ローダーがHTMLに即時表示の形で埋まっている */
const index = read('index.html');
expect(index.includes('id="mochisuraLoader"'), 'index.html: ローダー要素がありません');
expect(index.includes('role="progressbar"'), 'index.html: progressbar がありません');
expect(index.includes('aria-valuemin') && index.includes('aria-valuemax') && index.includes('aria-valuenow'),
  'index.html: 進捗のaria属性が揃っていません');
expect(/<noscript><style>#mochisuraLoader\{display:none\}/.test(index),
  'index.html: JS無効時にローダーを隠すnoscriptがありません');
expect(/__mochisuraBoot\.failsafe\s*=\s*setTimeout/.test(index) && index.includes('4000'),
  'index.html: 4秒の失敗脱出タイマーがありません');
expect(index.indexOf('id="mochisuraLoader"') < index.indexOf('class="ambient"'),
  'index.html: ローダーはbodyの先頭にありません');

/* 2. manifest が5キャラ揃い、リンク先が character-selector.js と一致する */
const manifest = JSON.parse(read('assets/hero-pets/manifest.json'));
const ids = Object.keys(manifest.characters);
expect(ids.length === 5, `manifest: キャラクターが5体ではありません (${ids.length})`);
const selectorSource = read('assets/character-selector.js');
const selectorHrefs = {};
for (const match of selectorSource.matchAll(/id:\s*'([^']+)'[\s\S]*?href:\s*'([^']+)'/g)) {
  selectorHrefs[match[1]] = match[2];
}
for (const id of ids) {
  expect(selectorHrefs[id] === manifest.characters[id].href,
    `manifest: ${id} のhref (${manifest.characters[id].href}) がカルーセル定義 (${selectorHrefs[id]}) と一致しません`);
}

/* 3. 軽量シートが実在し、容量予算内 (ゲスト≦250KB / ベース≦180KB) */
for (const id of ids) {
  const rel = `assets/hero-pets/${manifest.characters[id].sheet}`;
  const file = path.join(root, rel);
  expect(fs.existsSync(file), `${rel} がありません`);
  if (fs.existsSync(file)) {
    const kb = fs.statSync(file).size / 1024;
    expect(kb <= 250, `${rel} が容量予算250KBを超えています (${kb.toFixed(1)}KB)`);
  }
}
const baseSheet = path.join(root, 'assets/hero-pets/base-idle-walk.webp');
expect(fs.existsSync(baseSheet), 'assets/hero-pets/base-idle-walk.webp がありません');
if (fs.existsSync(baseSheet)) {
  const kb = fs.statSync(baseSheet).size / 1024;
  expect(kb <= 180, `base-idle-walk.webp が容量予算180KBを超えています (${kb.toFixed(1)}KB)`);
}
expect(read('assets/site.css').includes('hero-pets/base-idle-walk.webp'),
  'site.css: ベースPetが軽量版を参照していません');

/* 4. v2原本(pet-runs)をどのHTMLも参照・preloadしていない */
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '_boneyard' || entry.name === 'pet-runs' || entry.name === 'node_modules'
        ? [] : walk(full);
    }
    return entry.name.endsWith('.html') ? [full] : [];
  });
}
for (const file of walk(root)) {
  const html = fs.readFileSync(file, 'utf8');
  expect(!html.includes('pet-runs/'), `${path.relative(root, file)}: v2原本(pet-runs)を参照しています`);
  expect(!/rel=["']preload["'][^>]*hero-pets/.test(html),
    `${path.relative(root, file)}: hero-petsをpreloadしています(選出後の遅延ロードにする)`);
}

/* 5. 新規CSSに reduced-motion 対応がある */
for (const rel of ['assets/loading-experience.css', 'assets/hero-experience.css']) {
  expect(read(rel).includes('prefers-reduced-motion'), `${rel}: reduced-motion対応がありません`);
}

/* 6. 新規JSが既存のlocalStorage(育成・昼夜)へ書き込まない */
for (const rel of ['assets/loading-experience.js', 'assets/hero-experience.js', 'assets/hero-pet-runtime.js']) {
  const source = read(rel);
  expect(!source.includes('localStorage'), `${rel}: localStorageに触れています(sessionStorageを使う)`);
}

/* 7. manifestのアニメ定義がシートの範囲(8列3行)に収まっている */
for (const [name, anim] of Object.entries(manifest.anims)) {
  expect(anim.row >= 0 && anim.row <= 2, `manifest: ${name} のrowが範囲外です`);
  expect((anim.col || 0) + anim.frames <= 8, `manifest: ${name} が8列を超えています`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('hero experience test passed');
