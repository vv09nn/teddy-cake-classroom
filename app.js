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
const TOPPINGS = [
  { id: 'strawberry', visual: '🍓', word: 'strawberry', chinese: '草莓' },
  { id: 'banana', visual: '🍌', word: 'banana', chinese: '香蕉' },
  { id: 'blueberry', visual: '🫐', word: 'blueberry', chinese: '蓝莓' },
];
const ORDER_CARDS = [
  { id: 'teddy', customer: 'Teddy', visual: '🧸', colour: 'pink', number: 2 },
  { id: 'bunny', customer: 'Bunny', visual: '🐰', colour: 'blue', number: 3 },
  { id: 'kitty', customer: 'Kitty', visual: '🐱', colour: 'yellow', number: 1 },
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
export function normaliseAlphabetLetter(value) {
  const letter = String(value ?? '').trim().slice(0, 1).toUpperCase();
  return LETTERS.includes(letter) ? letter : 'A';
}
export function letterPair(letter) {
  const upper = normaliseAlphabetLetter(letter);
  return { upper, lower: upper.toLowerCase() };
}
export function nextAlphabetLetter(letter, direction = 1) {
  const current = LETTERS.indexOf(normaliseAlphabetLetter(letter));
  const offset = Number(direction) < 0 ? -1 : 1;
  return LETTERS[(current + offset + LETTERS.length) % LETTERS.length];
}
export function handwritingLowercaseGlyph(letter) {
  const lowercase = normaliseAlphabetLetter(letter).toLowerCase();
  return ({ a: 'ɑ', g: 'ɡ' })[lowercase] ?? lowercase;
}
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
export function orderForId(id) { return ORDER_CARDS.find((order) => order.id === id) ?? null; }
export function toppingProgress(items) {
  return new Set(items.filter((item) => TOPPINGS.some((topping) => topping.id === item))).size;
}
export function isOrderComplete({ order, colours, colors, candles }) {
  if (!order) return false;
  return (colours ?? colors ?? []).includes(order.colour) && Number(candles) === order.number;
}

const state = {
  stage: 'intro', order: null, ingredients: [], wordsVisible: false, stirs: 0, slices: [], toppings: [], tool: null,
  colours: [], number: 1, candleColour: 'pink', candles: [], activeLetter: null, traceLetter: 'A', traceMode: 'both',
  matchedLetters: new Set(), stirActive: false, stirPoint: null, message: 'Teddy is waiting for a helper!',
};

function colourById(id) { return COLOURS.find((colour) => colour.id === id) ?? COLOURS[0]; }
function numberByValue(value) { return NUMBERS.find((item) => item.value === value) ?? NUMBERS[0]; }
function toppingById(id) { return TOPPINGS.find((topping) => topping.id === id) ?? TOPPINGS[0]; }
function orderText(order) {
  if (!order) return 'Choose a customer card first.';
  return `${order.customer} says: A ${order.colour} cake. ${numberByValue(order.number).word} candles, please!`;
}

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
  const toppings = state.toppings.map((id, index) => {
    const topping = toppingById(id);
    const position = 34 + index * 18;
    return `<span class="placed-topping" style="left:${position}%" aria-label="${topping.word}">${topping.visual}</span>`;
  }).join('');
  return `<div id="${cakeId}" class="cake-art" data-cake-target data-drop-target="${cakeId}" tabindex="0" aria-label="${targetLabel}">
    <img src="cake-base.png" alt="plain sponge cake on a plate" />
    <span class="frosting" style="--frosting:${frosting}"></span><span class="sprinkle-layer" aria-hidden="true">✦　•　✦　•</span>
    <span class="placed-toppings">${toppings}</span><span class="placed-candles">${candles}</span></div>`;
}

function renderOrderStage() {
  document.querySelector('#order-list').innerHTML = ORDER_CARDS.map((order) => {
    const selected = state.order?.id === order.id;
    return `<button type="button" class="order-card ${selected ? 'is-chosen' : ''}" data-order="${order.id}" aria-pressed="${selected}">
      <span class="customer-emoji" aria-hidden="true">${order.visual}</span><span><strong>${order.customer}</strong><small>${orderText(order)}</small></span><span class="order-listen" data-speak="${orderText(order)}" role="button" tabindex="0">🔊</span>
    </button>`;
  }).join('');
  document.querySelector('#order-reminder').textContent = state.order ? orderText(state.order) : 'Pick a customer. Then we will make their cake.';
  document.querySelector('#to-ingredients').disabled = !state.order;
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
  document.querySelector('#to-toppings').disabled = state.slices.length < 3;
}

function renderToppingStage() {
  document.querySelector('#topping-list').innerHTML = TOPPINGS.map((topping) => {
    const chosen = state.toppings.includes(topping.id);
    return `<article class="topping-card ${chosen ? 'is-chosen' : ''}"><button type="button" class="topping-pick" data-topping="${topping.id}" aria-pressed="${chosen}"><span class="topping-picture" aria-hidden="true">${topping.visual}</span>${wordMarkup(topping.word, topping.chinese)}<span class="picked-tick" aria-hidden="true">${chosen ? '✓' : ''}</span></button><button class="listen-button" type="button" data-speak="${topping.word}" aria-label="听 ${topping.word}">🔊</button></article>`;
  }).join('');
  const count = toppingProgress(state.toppings);
  document.querySelector('#topping-count').textContent = `${count} / 2`;
  document.querySelector('#topping-sentence').textContent = count ? `I like ${toppingById(state.toppings.at(-1)).word}.` : 'Which topping do you like?';
  document.querySelector('#to-colours').disabled = count < 2;
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
  const cakeReady = canCelebrate({ colours: state.colours, candles: state.candles.length, number: state.number });
  const orderReady = !state.order || isOrderComplete({ order: state.order, colours: state.colours, candles: state.candles.length });
  document.querySelector('#to-celebrate').disabled = !cakeReady || !orderReady;
  document.querySelector('#candle-order-hint').textContent = orderReady ? 'Check the order card. Is it ready?' : `Check Teddy’s order: ${state.order.colour}, ${numberByValue(state.order.number).word} candles.`;
}

function setTraceMessage(message) {
  const target = document.querySelector('#trace-message');
  if (target) target.textContent = message;
}

function drawTraceGuide(canvas, letter, handwriting = false) {
  if (!canvas?.getContext || !canvas.getBoundingClientRect) return;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const density = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * density);
  canvas.height = Math.round(bounds.height * density);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform?.(density, 0, 0, density, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  const size = Math.min(bounds.width * 0.72, bounds.height * 0.79);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = handwriting
    ? `900 ${size}px "Comic Sans MS", "Segoe Print", cursive`
    : `900 ${size}px "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
  context.fillStyle = 'rgba(244, 195, 125, .18)';
  context.fillText(letter, bounds.width / 2, bounds.height / 2 + size * 0.04);
  context.setLineDash?.([3, 13]);
  context.lineWidth = Math.max(2, size / 36);
  context.strokeStyle = 'rgba(184, 125, 79, .55)';
  context.strokeText(letter, bounds.width / 2, bounds.height / 2 + size * 0.04);
  context.setLineDash?.([]);
  context.beginPath();
  context.arc(Math.max(19, bounds.width * 0.12), Math.max(19, bounds.height * 0.14), 12, 0, Math.PI * 2);
  context.fillStyle = '#ed8b6d';
  context.fill();
  context.fillStyle = '#fffdf5';
  context.font = '900 13px "Arial Rounded MT Bold", sans-serif';
  context.fillText('1', Math.max(19, bounds.width * 0.12), Math.max(19, bounds.height * 0.14));
}

function drawTraceLine(canvas, from, to) {
  const context = canvas?.getContext?.('2d');
  if (!context) return;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.strokeStyle = '#de7862';
  context.lineWidth = 12;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.stroke();
}

function tracePoint(event, canvas) {
  const bounds = canvas.getBoundingClientRect?.();
  if (!bounds) return null;
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function setUpTraceCanvas(canvas) {
  if (!canvas || canvas.dataset.traceReady === 'true') return;
  canvas.dataset.traceReady = 'true';
  canvas.addEventListener('pointerdown', (event) => {
    const point = tracePoint(event, canvas);
    if (!point) return;
    event.preventDefault();
    canvas.traceLastPoint = point;
    canvas.traceMoved = false;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!canvas.traceLastPoint) return;
    const point = tracePoint(event, canvas);
    if (!point) return;
    event.preventDefault();
    drawTraceLine(canvas, canvas.traceLastPoint, point);
    canvas.traceLastPoint = point;
    canvas.traceMoved = true;
  });
  const finishTrace = () => {
    if (!canvas.traceLastPoint) return;
    canvas.traceLastPoint = null;
    if (canvas.traceMoved) setTraceMessage(`Careful writing! You traced ${state.traceLetter} ${state.traceLetter.toLowerCase()}. 真认真，写得很棒！`);
  };
  canvas.addEventListener('pointerup', finishTrace);
  canvas.addEventListener('pointercancel', finishTrace);
}

function refreshTraceCanvases() {
  const pair = letterPair(state.traceLetter);
  [['#upper-trace-canvas', pair.upper, false], ['#lower-trace-canvas', handwritingLowercaseGlyph(pair.lower), true]].forEach(([selector, letter, handwriting]) => {
    const canvas = document.querySelector(selector);
    if (!canvas) return;
    setUpTraceCanvas(canvas);
    drawTraceGuide(canvas, letter, handwriting);
  });
}

function requestTraceCanvasRefresh() {
  if (typeof window === 'undefined') return;
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(refreshTraceCanvases);
  else refreshTraceCanvases();
}

function chooseTraceLetter(letter, shouldSpeak = true) {
  const pair = letterPair(letter);
  state.traceLetter = pair.upper;
  renderAlphabet();
  setTraceMessage(`This is ${pair.upper}, and this is ${pair.lower}. 点一下 🔊，再慢慢描一描。`);
  if (shouldSpeak) say(pair.upper);
}

function renderAlphabet() {
  const pair = letterPair(state.traceLetter);
  const lowercaseGlyph = handwritingLowercaseGlyph(pair.lower);
  document.querySelector('#letter-picker').innerHTML = LETTERS.map((letter) => `<button class="letter-picker-button ${pair.upper === letter ? 'is-current' : ''}" data-trace-letter="${letter}" data-letter-say="${letter}" type="button" aria-label="选择字母 ${letter} ${letter.toLowerCase()}" aria-pressed="${pair.upper === letter}"><strong>${letter}</strong><small>${letter.toLowerCase()}</small></button>`).join('');
  document.querySelector('#trace-uppercase').textContent = pair.upper;
  document.querySelector('#trace-lowercase').textContent = lowercaseGlyph;
  document.querySelector('#trace-uppercase-card').hidden = state.traceMode === 'lower';
  document.querySelector('#trace-lowercase-card').hidden = state.traceMode === 'upper';
  document.querySelector('#trace-letter-display').dataset.traceMode = state.traceMode;
  [['#trace-mode-both', 'both'], ['#trace-mode-upper', 'upper'], ['#trace-mode-lower', 'lower']].forEach(([selector, mode]) => {
    document.querySelector(selector).setAttribute?.('aria-pressed', String(state.traceMode === mode));
  });
  document.querySelector('#trace-letter-display').setAttribute?.('aria-label', `大写 ${pair.upper} 和小写 ${pair.lower}`);
  document.querySelector('#trace-speak').setAttribute?.('aria-label', `听字母 ${pair.upper}`);
  document.querySelector('#trace-speak-word').textContent = `Hear ${pair.upper}`;
  document.querySelector('#upper-trace-canvas').setAttribute?.('aria-label', `描写大写字母 ${pair.upper}`);
  document.querySelector('#lower-trace-canvas').setAttribute?.('aria-label', `描写小写字母 ${pair.lower}`);
  const printNote = document.querySelector('#trace-print-note');
  const handwritingNotes = {
    a: '先认识印刷体 a；描写时跟着单层手写体 ɑ。',
    g: '先认识印刷体 g；描写时跟着单层手写体 ɡ。',
  };
  printNote.hidden = !handwritingNotes[pair.lower];
  if (handwritingNotes[pair.lower]) printNote.textContent = handwritingNotes[pair.lower];
  document.querySelector('#upper-letters').innerHTML = MATCH_LETTERS.map((letter) => `<button type="button" class="letter-card ${state.activeLetter === letter ? 'is-picked' : ''} ${state.matchedLetters.has(letter) ? 'is-matched' : ''}" data-letter-upper="${letter}"><strong>${letter}</strong><small>capital ${letter}</small><span data-speak="${letter}" class="letter-sound" role="button" tabindex="0">🔊</span></button>`).join('');
  const shuffled = [...MATCH_LETTERS].sort((left, right) => (left > right ? -1 : 1));
  document.querySelector('#lower-letters').innerHTML = shuffled.map((letter) => `<button type="button" class="letter-card ${state.matchedLetters.has(letter) ? 'is-matched' : ''}" data-letter-lower="${letter.toLowerCase()}"><strong>${letter.toLowerCase()}</strong><small>small ${letter.toLowerCase()}</small><span data-speak="${letter}" class="letter-sound" role="button" tabindex="0">🔊</span></button>`).join('');
  document.querySelector('#letter-score').textContent = `${state.matchedLetters.size} / ${MATCH_LETTERS.length}`;
  requestTraceCanvasRefresh();
}

function renderFinal() {
  document.querySelector('#final-cake-wrap').innerHTML = cakeMarkup('final-cake', 'Finished cake');
  document.querySelector('#final-order-message').textContent = state.order ? `You made ${state.order.customer}’s order!` : 'You made a beautiful cake!';
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
  renderOrderStage(); renderIngredientStage(); renderMixStage(); renderSliceStage(); renderToppingStage(); renderColourStage(); renderCandleStage(); renderAlphabet(); renderFinal();
}

function setStage(stage) {
  if (stage === 'ingredients' && !state.order) return;
  if (stage === 'mix' && !canMix(state.ingredients)) return;
  if (stage === 'slice' && !isMixReady(state.stirs)) return;
  if (stage === 'toppings' && state.slices.length < 3) return;
  if (stage === 'colours' && (toppingProgress(state.toppings) < 2 || !canDecorate({ mixed: isMixReady(state.stirs), slices: state.slices.length }))) return;
  if (stage === 'candles' && !state.colours.length) return;
  if (stage === 'celebrate' && (!canCelebrate({ colours: state.colours, candles: state.candles.length, number: state.number }) || (state.order && !isOrderComplete({ order: state.order, colours: state.colours, candles: state.candles.length })))) return;
  state.stage = stage; state.tool = null;
  const labels = { intro: 'Teddy is waiting for a helper!', order: 'A customer is waiting. Choose an order card.', ingredients: 'Choose an ingredient. 选一个食材。', mix: 'Move the whisk in circles — or tap it gently. 搅一搅！', slice: 'Choose the knife, then cut each strawberry. 选小刀，再切草莓。', toppings: 'Choose two toppings and say which you like.', colours: 'Tap a paint pot, or drag it onto the cake. 选一种颜色。', candles: 'Choose a number and a candle colour. 数一数，再拖到蛋糕上。', celebrate: 'You did it! Teddy is so proud of you!' };
  setMessage(labels[stage]); render();
}

function addIngredient(id) {
  if (state.ingredients.includes(id)) { setMessage('You already found that one. Try another ingredient!'); return; }
  state.ingredients.push(id); const ingredient = INGREDIENTS.find((item) => item.id === id);
  setMessage(`Nice finding! ${ingredient.word}.`); say(ingredient.word); renderIngredientStage();
}
function chooseOrder(id) {
  const order = orderForId(id);
  if (!order) return;
  state.order = order;
  setMessage(orderText(order));
  say(orderText(order));
  renderOrderStage();
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
function addTopping(id) {
  if (state.toppings.includes(id)) { setMessage('You chose that one already. Try another topping!'); return; }
  state.toppings.push(id);
  const topping = toppingById(id);
  setMessage(`I like ${topping.word}. Nice choice!`);
  say(`I like ${topping.word}.`);
  renderToppingStage();
}
function addColour(id) {
  if (state.colours.includes(id)) return;
  state.colours.push(id); const colour = colourById(id);
  const matchedOrder = state.order?.colour === id;
  setMessage(matchedOrder ? `Yes! ${colour.word} matches the order.` : `${colour.word}! You put it on the cake.`);
  say(colour.word); renderColourStage();
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
  Object.assign(state, { stage: 'intro', order: null, ingredients: [], wordsVisible: false, stirs: 0, slices: [], toppings: [], tool: null, colours: [], number: 1, candleColour: 'pink', candles: [], stirActive: false, stirPoint: null, message: 'A new cake adventure is waiting!' });
  render();
}

function initialise() {
  document.querySelector('#start-button').addEventListener('click', () => setStage('order'));
  document.querySelector('#celebrate-again').addEventListener('click', resetGame);
  document.querySelector('#reset-button').addEventListener('click', resetGame);
  document.querySelector('#words-toggle').addEventListener('click', () => { state.wordsVisible = !state.wordsVisible; render(); });
  document.querySelector('#alphabet-button').addEventListener('click', () => { document.querySelector('#alphabet-dialog').showModal(); requestTraceCanvasRefresh(); });
  document.querySelector('#close-alphabet').addEventListener('click', () => document.querySelector('#alphabet-dialog').close());
  window.addEventListener?.('resize', requestTraceCanvasRefresh);
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
    const traceLetter = event.target.closest('[data-trace-letter]'); if (traceLetter) { chooseTraceLetter(traceLetter.dataset.traceLetter); return; }
    const traceMode = event.target.closest('[data-trace-mode]'); if (traceMode) { state.traceMode = ['both', 'upper', 'lower'].includes(traceMode.dataset.traceMode) ? traceMode.dataset.traceMode : 'both'; renderAlphabet(); setTraceMessage(state.traceMode === 'both' ? 'Let’s look at capital and small letters together.' : state.traceMode === 'upper' ? 'Capital letter practice. 只练大写。' : 'Small letter handwriting practice. 只练小写手写体。'); return; }
    if (event.target.closest('#trace-speak')) { say(state.traceLetter); setTraceMessage(`Listen: ${state.traceLetter}. You can say it, or just listen. 听一听就很好。`); return; }
    if (event.target.closest('[data-trace-previous]')) { chooseTraceLetter(nextAlphabetLetter(state.traceLetter, -1)); return; }
    if (event.target.closest('[data-trace-next]')) { chooseTraceLetter(nextAlphabetLetter(state.traceLetter, 1)); return; }
    if (event.target.closest('#trace-reset')) { refreshTraceCanvases(); setTraceMessage(`Fresh page! Trace ${state.traceLetter} one more time. 重新慢慢写一次。`); return; }
    const speak = event.target.closest('[data-speak]'); if (speak) { event.stopPropagation(); say(speak.dataset.speak); setMessage(`Listen: ${speak.dataset.speak}. 你可以跟读，也可以只听一听。`); return; }
    const ingredient = event.target.closest('[data-ingredient]'); if (ingredient) { addIngredient(ingredient.dataset.ingredient); return; }
    const order = event.target.closest('[data-order]'); if (order) { chooseOrder(order.dataset.order); return; }
    const next = event.target.closest('[data-next]'); if (next) { setStage(next.dataset.next); return; }
    if (event.target.closest('#whisk')) { if (!isMixReady(state.stirs)) addStir(); return; }
    if (event.target.closest('#knife')) { state.tool = state.tool === 'knife' ? null : 'knife'; setMessage(state.tool ? 'Knife is ready. Now cut one strawberry!' : 'Knife put down.'); renderSliceStage(); return; }
    const fruit = event.target.closest('[data-slice]'); if (fruit) { sliceFruit(Number(fruit.dataset.slice)); return; }
    const topping = event.target.closest('[data-topping]'); if (topping) { addTopping(topping.dataset.topping); return; }
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
