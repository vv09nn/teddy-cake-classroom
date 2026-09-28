const INGREDIENTS = [
  { id: 'egg', visual: '🥚', word: 'egg', chinese: '鸡蛋' },
  { id: 'milk', visual: '🥛', word: 'milk', chinese: '牛奶' },
  { id: 'flour', visual: '🌾', word: 'flour', chinese: '面粉' },
];

const COLOURS = [
  { id: 'red', word: 'red', chinese: '红色', hex: '#ef6f64' },
  { id: 'blue', word: 'blue', chinese: '蓝色', hex: '#69a9df' },
  { id: 'yellow', word: 'yellow', chinese: '黄色', hex: '#f4c95d' },
  { id: 'pink', word: 'pink', chinese: '粉色', hex: '#f3a6bf' },
  { id: 'orange', word: 'orange', chinese: '橘色', hex: '#f4a24b' },
];

const NUMBERS = [
  { value: 1, word: 'one' }, { value: 2, word: 'two' }, { value: 3, word: 'three' },
  { value: 4, word: 'four' }, { value: 5, word: 'five' },
];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MATCH_LETTERS = ['A', 'M', 'S', 'T', 'B', 'C'];
const STIR_GOAL = 6;

export function cakeProgress(items) {
  return new Set(items.filter((item) => INGREDIENTS.some((ingredient) => ingredient.id === item))).size;
}
export function canMix(items) { return cakeProgress(items) === INGREDIENTS.length; }
export function normaliseNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}
export function letterMatches(uppercase, lowercase) { return String(uppercase).toUpperCase() === String(lowercase).toUpperCase(); }
export function nextPrompt({ ingredients, mixed, decorated }) {
  if (!canMix(ingredients)) return 'ingredients';
  if (!mixed) return 'mix';
  return decorated ? 'celebrate' : 'decorate';
}
export function isMixReady(stirs) { return Number(stirs) >= STIR_GOAL; }
export function canDecorate({ mixed, slices }) { return Boolean(mixed) && Number(slices) >= 3; }
export function canCelebrate({ colours, colors, candles, number }) {
  return (colours ?? colors ?? []).length > 0 && Number(candles) >= normaliseNumber(number);
}

const state = {
  stage: 'intro', ingredients: [], wordsVisible: false, stirs: 0, slices: [], tool: null,
  colours: [], number: 1, candleColour: 'pink', candles: [], activeLetter: null,
  matchedLetters: new Set(), stirActive: false, stirPoint: null, message: 'Teddy is waiting for a helper!',
};

function colourById(id) { return COLOURS.find((colour) => colour.id === id) ?? COLOURS[0]; }
function numberByValue(value) { return NUMBERS.find((item) => item.value === value) ?? NUMBERS[0]; }

function say(text) {
  if (!('speechSynthesis' in window)) { setMessage(`一起读一读：${text}`); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = window.speechSynthesis.getVoices().find((item) => /^en-AU/i.test(item.lang))
    ?? window.speechSynthesis.getVoices().find((item) => /^en/i.test(item.lang));
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'en-AU'; utterance.rate = 0.72; utterance.pitch = 1.08;
  window.speechSynthesis.speak(utterance);
}

function setMessage(message) {
  state.message = message;
  const target = document.querySelector('#game-message');
  if (target) target.textContent = message;
}

function wordMarkup(word, chinese) {
  return state.wordsVisible
    ? `<span class="word-reveal"><strong>${word}</strong><small>${chinese}</small></span>`
    : `<span class="word-reveal is-hidden" aria-hidden="true"><strong>${word}</strong><small>${chinese}</small></span>`;
}

function cakeMarkup(cakeId, targetLabel) {
  const palette = state.colours.length ? state.colours.map((id) => colourById(id).hex) : ['#fff3da'];
  const frosting = palette.length === 1 ? palette[0] : `linear-gradient(112deg, ${palette.join(', ')})`;
  const candles = state.candles.map((id, index) => {
    const colour = colourById(id);
    const position = 28 + ((index + 1) / (state.candles.length + 1)) * 44;
    return `<span class="placed-candle" style="--candle:${colour.hex};left:${position}%" aria-label="${colour.word} candle">🕯</span>`;
  }).join('');
  return `<div id="${cakeId}" class="cake-art" data-cake-target data-drop-target="${cakeId}" tabindex="0" aria-label="${targetLabel}">
    <img src="cake-base.png" alt="plain sponge cake on a plate" />
    <span class="frosting" style="--frosting:${frosting}"></span><span class="sprinkle-layer" aria-hidden="true">✦　•　✦　•</span>
    <span class="placed-candles">${candles}</span></div>`;
}

function renderIngredientStage() {
  document.querySelector('#ingredient-list').innerHTML = INGREDIENTS.map((ingredient) => {
    const chosen = state.ingredients.includes(ingredient.id);
    return `<article class="ingredient-card ${chosen ? 'is-chosen' : ''}">
      <button type="button" class="ingredient-pick" data-ingredient="${ingredient.id}" aria-pressed="${chosen}">
        <span class="ingredient-picture" aria-hidden="true">${ingredient.visual}</span>${wordMarkup(ingredient.word, ingredient.chinese)}
        <span class="picked-tick" aria-hidden="true">${chosen ? '✓' : ''}</span></button>
      <button class="listen-button" type="button" data-speak="${ingredient.word}" aria-label="听 ${ingredient.word}">🔊</button></article>`;
  }).join('');
  const ready = canMix(state.ingredients);
  document.querySelector('#ingredient-count').textContent = `${state.ingredients.length} / 3`;
  document.querySelector('#to-mix').disabled = !ready;
  document.querySelector('#ingredient-hint').textContent = ready ? 'All ready! 你找到了所有食材。' : '看一看，选一个食材。';
}

function renderMixStage() {
  const bowl = document.querySelector('#batter-bowl');
  bowl.style.setProperty('--mix-level', `${20 + (state.stirs / STIR_GOAL) * 68}%`);
  bowl.classList.toggle('is-swirling', state.stirActive || state.stirs > 0);
  document.querySelector('#stir-count').textContent = `${Math.min(state.stirs, STIR_GOAL)} / ${STIR_GOAL}`;
  document.querySelector('#stir-dots').innerHTML = Array.from({ length: STIR_GOAL }, (_, index) => `<span class="${index < state.stirs ? 'is-filled' : ''}">●</span>`).join('');
  document.querySelector('#to-slice').disabled = !isMixReady(state.stirs);
}

function renderSliceStage() {
  document.querySelector('#slice-count').textContent = `${state.slices.length} / 3`;
  document.querySelector('#knife').classList.toggle('is-selected', state.tool === 'knife');
  document.querySelector('#fruit-board').innerHTML = [0, 1, 2].map((index) => {
    const done = state.slices.includes(index);
    return `<button class="fruit-piece ${done ? 'is-sliced' : ''}" type="button" data-slice="${index}" data-drop-target="fruit:${index}" aria-pressed="${done}">
      <span aria-hidden="true">🍓</span><small>${done ? 'cut!' : 'slice'}</small></button>`;
  }).join('');
  document.querySelector('#to-colours').disabled = state.slices.length < 3;
}

function renderColourStage() {
  document.querySelector('#colour-palette').innerHTML = COLOURS.map((colour) => {
    const used = state.colours.includes(colour.id);
    return `<article class="colour-pot ${used ? 'is-used' : ''}">
      <button type="button" class="colour-pick" draggable="true" data-draggable="colour:${colour.id}" data-colour="${colour.id}" style="--paint:${colour.hex}" aria-pressed="${used}">
      <span class="paint-dot" aria-hidden="true"></span>${wordMarkup(colour.word, colour.chinese)}<span class="pot-tick" aria-hidden="true">${used ? '✓' : ''}</span></button>
      <button type="button" class="pot-listen" data-speak="${colour.word}" aria-label="听 ${colour.word}">🔊</button></article>`;
  }).join('');
  document.querySelector('#colour-count').textContent = state.colours.length ? `${state.colours.length} colour${state.colours.length > 1 ? 's' : ''} on the cake` : 'Choose a colour';
  document.querySelector('#colour-cake-wrap').innerHTML = cakeMarkup('colour-cake', 'Cake. Put a colour here.');
  document.querySelector('#to-candles').disabled = state.colours.length === 0;
}

function renderCandleStage() {
  const selected = colourById(state.candleColour);
  document.querySelector('#number-palette').innerHTML = NUMBERS.map((number) => `<article class="number-card ${number.value === state.number ? 'is-picked' : ''}"><button type="button" class="number-choice" data-number="${number.value}" aria-pressed="${number.value === state.number}"><strong>${number.value}</strong>${wordMarkup(number.word, number.value)}</button><button type="button" class="number-listen" data-speak="${number.word}" aria-label="听 ${number.word}">🔊</button></article>`).join('');
  document.querySelector('#candle-colours').innerHTML = COLOURS.map((colour) => `<button type="button" class="candle-colour ${colour.id === state.candleColour ? 'is-picked' : ''}" data-candle-colour="${colour.id}" style="--paint:${colour.hex}" aria-label="${colour.word} candle"><span aria-hidden="true">🕯</span>${state.wordsVisible ? `<small>${colour.word}</small>` : ''}</button>`).join('');
  const candle = document.querySelector('#drag-candle');
  candle.style.setProperty('--candle', selected.hex); candle.classList.toggle('is-selected', state.tool === 'candle');
  document.querySelector('#chosen-candle-word').textContent = state.wordsVisible ? `${selected.word} candle` : 'candle';
  document.querySelector('#candle-count').textContent = `${state.candles.length} / ${state.number}`;
  document.querySelector('#candle-cake-wrap').innerHTML = cakeMarkup('candle-cake', 'Cake. Put candles here.');
  document.querySelector('#to-celebrate').disabled = !canCelebrate({ colours: state.colours, candles: state.candles.length, number: state.number });
}

function renderAlphabet() {
  document.querySelector('#letter-picker').innerHTML = LETTERS.map((letter) => `<button class="letter-picker-button" data-letter-say="${letter}" type="button" aria-label="${letter} ${letter.toLowerCase()}"><strong>${letter}</strong><small>${letter.toLowerCase()}</small><span>🔊</span></button>`).join('');
  document.querySelector('#upper-letters').innerHTML = MATCH_LETTERS.map((letter) => `<button type="button" class="letter-card ${state.activeLetter === letter ? 'is-picked' : ''} ${state.matchedLetters.has(letter) ? 'is-matched' : ''}" data-letter-upper="${letter}"><strong>${letter}</strong><small>capital ${letter}</small><span data-speak="${letter}" class="letter-sound" role="button" tabindex="0">🔊</span></button>`).join('');
  const shuffled = [...MATCH_LETTERS].sort((left, right) => (left > right ? -1 : 1));
  document.querySelector('#lower-letters').innerHTML = shuffled.map((letter) => `<button type="button" class="letter-card ${state.matchedLetters.has(letter) ? 'is-matched' : ''}" data-letter-lower="${letter.toLowerCase()}"><strong>${letter.toLowerCase()}</strong><small>small ${letter.toLowerCase()}</small><span data-speak="${letter}" class="letter-sound" role="button" tabindex="0">🔊</span></button>`).join('');
  document.querySelector('#letter-score').textContent = `${state.matchedLetters.size} / ${MATCH_LETTERS.length}`;
}

function renderFinal() {
  document.querySelector('#final-cake-wrap').innerHTML = cakeMarkup('final-cake', 'Finished cake');
}

function render() {
  document.body.dataset.stage = state.stage;
  const stageIds = { ingredients: 'ingredient-stage', candles: 'candle-stage', celebrate: 'celebration-stage' };
  const activeStageId = stageIds[state.stage] ?? `${state.stage}-stage`;
  document.querySelectorAll('.game-stage').forEach((stage) => { stage.hidden = stage.id !== activeStageId; });
  document.querySelector('#words-toggle').hidden = ['intro', 'celebrate'].includes(state.stage);
  document.querySelector('#words-toggle').textContent = state.wordsVisible ? 'Hide English 隐藏英文' : 'Show English 显示英文';
  document.querySelector('#reset-button').hidden = state.stage === 'intro';
  document.querySelector('#game-message').textContent = state.message;
  renderIngredientStage(); renderMixStage(); renderSliceStage(); renderColourStage(); renderCandleStage(); renderAlphabet(); renderFinal();
}

function setStage(stage) {
  if (stage === 'mix' && !canMix(state.ingredients)) return;
  if (stage === 'slice' && !isMixReady(state.stirs)) return;
  if (stage === 'colours' && !canDecorate({ mixed: isMixReady(state.stirs), slices: state.slices.length })) return;
  if (stage === 'candles' && !state.colours.length) return;
  if (stage === 'celebrate' && !canCelebrate({ colours: state.colours, candles: state.candles.length, number: state.number })) return;
  state.stage = stage; state.tool = null;
  const labels = { intro: 'Teddy is waiting for a helper!', ingredients: 'Choose an ingredient. 选一个食材。', mix: 'Move the whisk in circles — or tap it gently. 搅一搅！', slice: 'Choose the knife, then cut each strawberry. 选小刀，再切草莓。', colours: 'Tap a paint pot, or drag it onto the cake. 选一种颜色。', candles: 'Choose a number and a candle colour. 数一数，再拖到蛋糕上。', celebrate: 'You did it! Teddy is so proud of you!' };
  setMessage(labels[stage]); render();
}

function addIngredient(id) {
  if (state.ingredients.includes(id)) { setMessage('You already found that one. Try another ingredient!'); return; }
  state.ingredients.push(id); const ingredient = INGREDIENTS.find((item) => item.id === id);
  setMessage(`Nice finding! ${ingredient.word}.`); say(ingredient.word); renderIngredientStage();
}
function addStir(count = 1) {
  state.stirs = Math.min(STIR_GOAL, state.stirs + count);
  if (isMixReady(state.stirs)) { state.stirActive = false; setMessage('The batter is smooth! Great stirring.'); say('Mix, mix, mix!'); }
  renderMixStage();
}
function sliceFruit(index) {
  if (state.tool !== 'knife') { setMessage('First choose the little knife. 先选小刀。'); return; }
  if (!state.slices.includes(index)) { state.slices.push(index); setMessage(state.slices.length === 3 ? 'All sliced! Strawberry pieces are ready.' : 'Slice! Nice careful cutting.'); }
  state.tool = null; renderSliceStage();
}
function addColour(id) {
  if (state.colours.includes(id)) return;
  state.colours.push(id); const colour = colourById(id); setMessage(`${colour.word}! You put it on the cake.`); say(colour.word); renderColourStage();
}
function addCandle() {
  if (state.candles.length >= state.number) { setMessage(`We have ${state.number} candles. Let’s count them!`); return; }
  state.candles.push(state.candleColour); state.tool = null; const number = numberByValue(state.candles.length);
  setMessage(state.candles.length === state.number ? `Wonderful! ${number.word} candles. The cake is ready!` : `${number.word} candle. Keep going!`); renderCandleStage();
}
function handleDrop(payload, target) {
  if (payload?.startsWith('colour:') && target === 'colour-cake') { addColour(payload.split(':')[1]); return; }
  if (payload === 'candle' && target === 'candle-cake') { addCandle(); return; }
  if (payload === 'knife' && target.startsWith('fruit:')) { state.tool = 'knife'; sliceFruit(Number(target.split(':')[1])); }
}
function resetGame() {
  Object.assign(state, { stage: 'intro', ingredients: [], wordsVisible: false, stirs: 0, slices: [], tool: null, colours: [], number: 1, candleColour: 'pink', candles: [], stirActive: false, stirPoint: null, message: 'A new cake adventure is waiting!' });
  render();
}

function initialise() {
  document.querySelector('#start-button').addEventListener('click', () => setStage('ingredients'));
  document.querySelector('#celebrate-again').addEventListener('click', resetGame);
  document.querySelector('#reset-button').addEventListener('click', resetGame);
  document.querySelector('#words-toggle').addEventListener('click', () => { state.wordsVisible = !state.wordsVisible; render(); });
  document.querySelector('#alphabet-button').addEventListener('click', () => document.querySelector('#alphabet-dialog').showModal());
  document.querySelector('#close-alphabet').addEventListener('click', () => document.querySelector('#alphabet-dialog').close());
  document.addEventListener('dragstart', (event) => { const item = event.target.closest('[data-draggable]'); if (!item) return; event.dataTransfer.setData('text/plain', item.dataset.draggable); event.dataTransfer.effectAllowed = 'copy'; });
  document.addEventListener('dragover', (event) => { if (event.target.closest('[data-drop-target]')) event.preventDefault(); });
  document.addEventListener('drop', (event) => { const target = event.target.closest('[data-drop-target]'); if (!target) return; event.preventDefault(); handleDrop(event.dataTransfer.getData('text/plain'), target.dataset.dropTarget); });
  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('#whisk') && state.stage === 'mix' && !isMixReady(state.stirs)) { state.stirActive = true; state.stirPoint = { x: event.clientX, y: event.clientY }; event.target.closest('#whisk').setPointerCapture?.(event.pointerId); renderMixStage(); }
  });
  document.addEventListener('pointermove', (event) => {
    if (!state.stirActive || !state.stirPoint || state.stage !== 'mix') return;
    const distance = Math.hypot(event.clientX - state.stirPoint.x, event.clientY - state.stirPoint.y);
    if (distance >= 24) { state.stirPoint = { x: event.clientX, y: event.clientY }; addStir(Math.max(1, Math.floor(distance / 32))); }
  });
  document.addEventListener('pointerup', () => { if (state.stirActive) { state.stirActive = false; state.stirPoint = null; renderMixStage(); } });
  document.addEventListener('click', (event) => {
    const speak = event.target.closest('[data-speak]'); if (speak) { event.stopPropagation(); say(speak.dataset.speak); setMessage(`Listen: ${speak.dataset.speak}. 你可以跟读，也可以只听一听。`); return; }
    const ingredient = event.target.closest('[data-ingredient]'); if (ingredient) { addIngredient(ingredient.dataset.ingredient); return; }
    const next = event.target.closest('[data-next]'); if (next) { setStage(next.dataset.next); return; }
    if (event.target.closest('#whisk')) { if (!isMixReady(state.stirs)) addStir(); return; }
    if (event.target.closest('#knife')) { state.tool = state.tool === 'knife' ? null : 'knife'; setMessage(state.tool ? 'Knife is ready. Now cut one strawberry!' : 'Knife put down.'); renderSliceStage(); return; }
    const fruit = event.target.closest('[data-slice]'); if (fruit) { sliceFruit(Number(fruit.dataset.slice)); return; }
    const colour = event.target.closest('[data-colour]'); if (colour) { addColour(colour.dataset.colour); return; }
    const number = event.target.closest('[data-number]'); if (number) { state.number = normaliseNumber(number.dataset.number); state.candles = []; setMessage(`Let’s make ${numberByValue(state.number).word} candles.`); renderCandleStage(); return; }
    const candleColour = event.target.closest('[data-candle-colour]'); if (candleColour) { state.candleColour = candleColour.dataset.candleColour; state.tool = null; say(colourById(state.candleColour).word); renderCandleStage(); return; }
    if (event.target.closest('#drag-candle')) { state.tool = state.tool === 'candle' ? null : 'candle'; setMessage(state.tool ? 'Candle selected. Now tap the cake!' : 'Candle put down.'); renderCandleStage(); return; }
    const cake = event.target.closest('[data-cake-target]'); if (cake && state.stage === 'candles' && state.tool === 'candle') { addCandle(); return; }
    const pickedLetter = event.target.closest('[data-letter-say]'); if (pickedLetter) { const letter = pickedLetter.dataset.letterSay; say(letter); setMessage(`${letter} is capital ${letter}; ${letter.toLowerCase()} is small ${letter.toLowerCase()}.`); return; }
    const upper = event.target.closest('[data-letter-upper]'); if (upper) { state.activeLetter = upper.dataset.letterUpper; say(state.activeLetter); renderAlphabet(); return; }
    const lower = event.target.closest('[data-letter-lower]'); if (lower) {
      if (!state.activeLetter) { setMessage('First choose a capital letter. 先选一个大写字母。'); return; }
      if (letterMatches(state.activeLetter, lower.dataset.letterLower)) { state.matchedLetters.add(state.activeLetter); setMessage(`Yes! ${state.activeLetter} and ${lower.dataset.letterLower} are a pair. ⭐`); state.activeLetter = null; } else setMessage('Almost. Try another small letter.');
      renderAlphabet();
    }
  });
  render();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, { once: true });
  else initialise();
}
