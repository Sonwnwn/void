import { sessions, seats, money } from './data.js';
import { loadTickets, saveTickets, clearTickets, STORAGE_KEY } from './storage.js';
const $ = selector => document.querySelector(selector);
const loaded = loadTickets();
// Один state — источник выбранного сеанса, кресел и занятости.
const state = { sessionId: null, selected: new Set(), tickets: loaded.tickets, guests: 1, maxPrice: Infinity, validFilters: true, completed: false, storageError: loaded.error };
const current = () => sessions.find(session => session.id === state.sessionId);
const occupied = session => new Set([...session.occupied, ...state.tickets.filter(ticket => ticket.sessionId === session.id).flatMap(ticket => ticket.seats)]);
const available = session => state.validFilters && session.price <= state.maxPrice && 24 - occupied(session).size >= state.guests;
function message(text) { $('#notice').textContent = text; }
function restoreFocus(action) {
  const focusId = document.activeElement?.id;
  action();
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}
function renderSessions() {
  $('#sessions').replaceChildren();
  const visible = sessions.filter(available);
  if (!visible.length) { $('#sessions').textContent = 'Нет подходящих сеансов. Уменьшите число зрителей или увеличьте максимальную цену.'; return; }
  visible.forEach(session => {
    const button = document.createElement('button');
    button.type = 'button'; button.id = `session-${session.id}`; button.className = `session ${session.theme}`;
    button.setAttribute('aria-pressed', String(state.sessionId === session.id));
    button.innerHTML = `<span class="session-index">${session.time} / ${session.age}</span><span class="film-art" aria-hidden="true"><img src="${session.image}" alt=""></span><span class="session-info"><strong>${session.title}</strong><span>${session.genre} · ${session.duration}</span><span>${money(session.price)} / место · свободно ${24 - occupied(session).size}</span></span><span class="session-arrow" aria-hidden="true">↗</span>`;
    button.addEventListener('click', () => { state.completed = false; state.sessionId = session.id; state.selected.clear(); $('#form-error').textContent = ''; message('Сеанс выбран. Отметьте свободные места в зале.'); render(); });
    $('#sessions').append(button);
  });
}
function renderSeats() {
  const session = current();
  const busy = session ? occupied(session) : new Set();
  $('#seats').replaceChildren();
  for (let row = 1; row <= 4; row++) {
    const label = document.createElement('span'); label.className = 'row-label'; label.textContent = row; label.setAttribute('aria-label', `Ряд ${row}`); $('#seats').append(label);
    seats.filter(seat => seat.row === row).forEach(seat => {
      const selected = state.selected.has(seat.id);
      const taken = busy.has(seat.id);
      const status = taken ? 'Занято' : selected ? 'Выбрано' : session ? 'Свободно' : 'Выберите сеанс';
      const button = document.createElement('button'); button.type = 'button'; button.id = `seat-${seat.id}`; button.className = `seat ${taken ? 'busy' : selected ? 'chosen' : ''}`; button.disabled = !session || taken;
      button.setAttribute('aria-pressed', String(selected)); button.setAttribute('aria-label', `Ряд ${seat.row}, место ${seat.number}. ${status}`);
      button.innerHTML = `<strong>${seat.number}</strong><small>${status}</small>`;
      button.addEventListener('click', () => { selected ? state.selected.delete(seat.id) : state.selected.add(seat.id); $('#form-error').textContent = ''; render(); }); $('#seats').append(button);
    });
  }
}
function seatLabel(id) { const seat = seats.find(item => item.id === id); return `ряд ${seat.row}, место ${seat.number}`; }
function renderSummary() {
  $('#confirm').disabled = state.completed;
  const session = current();
  $('#film-title').textContent = session?.title || 'Выберите сеанс';
  $('#film-meta').textContent = session ? `${session.time} · ${session.duration} · ${session.age}` : 'Затем отметьте места на схеме зала.';
  $('#film-description').textContent = session?.description || '';
  $('#selected-seats').textContent = state.selected.size ? [...state.selected].sort((a,b) => a-b).map(seatLabel).join('; ') : 'Пока не выбраны';
  $('#total').textContent = money((session?.price || 0) * state.selected.size);
}
function renderTickets() {
  const list = $('#ticket-list'); list.replaceChildren();
  $('#ticket-count').textContent = state.tickets.length;
  if (!state.tickets.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Здесь появятся ваши билеты. Выберите сеанс и места — вечер уже почти спланирован.'; list.append(p); }
  state.tickets.forEach(ticket => {
    const session = sessions.find(item => item.id === ticket.sessionId);
    const card = document.createElement('article'); card.className = 'ticket';
    const info = document.createElement('div');
    const number = document.createElement('small'); number.textContent = `БИЛЕТ ${ticket.id}`;
    const title = document.createElement('h3'); title.textContent = `${session.title} / ${session.time}`;
    const details = document.createElement('p'); details.textContent = `${ticket.seats.map(seatLabel).join('; ')} · Зрителей: ${ticket.guests}`;
    info.append(number, title, details);
    const total = document.createElement('strong'); total.textContent = money(ticket.total);
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'text-button'; cancel.textContent = 'Отменить ↗'; cancel.id = `cancel-${ticket.id}`;
    cancel.addEventListener('click', () => {
      const next = state.tickets.filter(item => item.id !== ticket.id);
      if (!persist(next)) return;
      message('Билет отменён. Места снова свободны.'); render(); $('#clear-tickets').focus({ preventScroll: true });
    });
    card.append(info, total, cancel); list.append(card);
  });
}
function render() { restoreFocus(() => { renderSessions(); renderSeats(); renderSummary(); renderTickets(); }); }
function persist(tickets) {
  if (!saveTickets(tickets)) { message('Не удалось сохранить изменения. Проверьте доступ браузера к хранилищу. Билеты не изменены.'); return false; }
  state.tickets = tickets; state.storageError = ''; return true;
}
function filter() {
  const guests = Number($('#guests').value); const rawPrice = $('#max-price').value; const price = rawPrice === '' ? Infinity : Number(rawPrice);
  state.validFilters = Number.isInteger(guests) && guests >= 1 && guests <= 24 && (price === Infinity || (Number.isInteger(price) && price >= 0));
  state.guests = guests; state.maxPrice = price;
  $('#filter-error').textContent = state.validFilters ? '' : 'Укажите целое число зрителей от 1 до 24 и целую цену от 0 ₽.';
  if (current() && !available(current())) { state.sessionId = null; state.selected.clear(); message('Фильтр скрыл выбранный сеанс. Выбор мест сброшен; ваши билеты сохранены.'); }
  render();
}
$('#guests').addEventListener('input', filter); $('#max-price').addEventListener('input', filter);
$('#reset-filters').addEventListener('click', () => { $('#guests').value = 1; $('#max-price').value = ''; filter(); message('Фильтры сброшены.'); });
$('#booking-form').addEventListener('submit', event => {
  event.preventDefault(); const error = $('#form-error'); const session = current();
  if (!session) { error.textContent = 'Сначала выберите сеанс.'; return; }
  if (!state.validFilters) { error.textContent = 'Исправьте значения фильтров.'; return; }
  if (state.selected.size < 1 || state.selected.size > 24) { error.textContent = 'Выберите хотя бы одно свободное место.'; return; }
  // Повторно читаем хранилище: другая вкладка могла занять места.
  const latest = loadTickets();
  if (latest.error) { message(latest.error); return; }
  state.tickets = latest.tickets;
  if ([...state.selected].some(id => !Number.isInteger(id) || id < 1 || id > 24 || occupied(session).has(id))) { state.selected.clear(); render(); error.textContent = 'Некоторые места уже заняты. Выберите другие.'; return; }
  const ticket = { id: `VOID-${crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`, sessionId: session.id, seats: [...state.selected].sort((a,b) => a-b), guests: state.selected.size, total: session.price * state.selected.size };
  if (!persist([...state.tickets, ticket])) return;
  state.completed = true; state.selected.clear(); state.sessionId = null; error.textContent = ''; render(); message('Билет подтверждён! Он появился в разделе «Мои билеты».'); $('#tickets').scrollIntoView({ behavior: 'smooth' }); $('#clear-tickets').focus({ preventScroll: true });
});
$('#clear-tickets').addEventListener('click', () => {
  if (!confirm('Отменить все ваши билеты и удалить сохранённые данные VOID?')) return;
  if (!clearTickets()) { message('Браузер запретил удаление данных. Билеты не изменены.'); return; }
  state.tickets = []; state.storageError = ''; render(); message('Ваши билеты сброшены. Исходно занятые места остались заняты.');
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  const latest = loadTickets();
  if (latest.error) { message(latest.error); return; }
  state.tickets = latest.tickets;
  if (current()) state.selected = new Set([...state.selected].filter(id => !occupied(current()).has(id)));
  render(); message('Билеты обновлены из другой вкладки. Проверьте выбранные места.');
});
render(); if (loaded.error) message(loaded.error);


// Искажение фонового изображения вокруг курсора, без сторонних библиотек.
const hero = document.querySelector('.hero');
const canvas = document.querySelector('#hero-canvas');
const context = canvas.getContext('2d');
const background = new Image();
background.src = 'images/hero-angel.jpg';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mouse = { x: -1000, y: -1000, force: 0, target: 0 };
let animation = 0;
let canvasWidth = 0;
let canvasHeight = 0;
function drawBackground() {
  animation = 0;
  if (!context || !background.complete || !background.naturalWidth) return;
  mouse.force += (mouse.target - mouse.force) * 0.12;
  const scale = Math.max(canvasWidth / background.naturalWidth, canvasHeight / background.naturalHeight);
  const sourceWidth = canvasWidth / scale;
  const sourceHeight = canvasHeight / scale;
  const offsetX = (background.naturalWidth - sourceWidth) / 2;
  const offsetY = (background.naturalHeight - sourceHeight) / 2;
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  const tile = 22;
  const radius = Math.min(canvasWidth * 0.35, 240);
  for (let y = 0; y < canvasHeight; y += tile) {
    for (let x = 0; x < canvasWidth; x += tile) {
      const width = Math.min(tile + 1, canvasWidth - x);
      const height = Math.min(tile + 1, canvasHeight - y);
      const dx = x + width / 2 - mouse.x;
      const dy = y + height / 2 - mouse.y;
      const distance = Math.hypot(dx, dy);
      const falloff = Math.max(0, 1 - distance / radius);
      const ripple = Math.sin(distance * 0.035 - mouse.force * 2) * falloff * falloff * 35 * mouse.force;
      const shiftX = distance ? dx / distance * ripple : 0;
      const shiftY = distance ? dy / distance * ripple : 0;
      const sx = Math.max(0, Math.min(background.naturalWidth - width / scale, offsetX + (x + shiftX) / scale));
      const sy = Math.max(0, Math.min(background.naturalHeight - height / scale, offsetY + (y + shiftY) / scale));
      context.drawImage(background, sx, sy, width / scale, height / scale, x, y, width, height);
    }
  }
  if (Math.abs(mouse.target - mouse.force) > 0.002) requestDraw();
}
function requestDraw() {
  if (!animation) animation = requestAnimationFrame(drawBackground);
}
function resizeBackground() {
  const bounds = hero.getBoundingClientRect();
  canvasWidth = Math.round(bounds.width);
  canvasHeight = Math.round(bounds.height);
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(canvasWidth * ratio);
  canvas.height = Math.round(canvasHeight * ratio);
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  requestDraw();
}
hero.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType === 'touch') return;
  const bounds = hero.getBoundingClientRect();
  mouse.x = event.clientX - bounds.left;
  mouse.y = event.clientY - bounds.top;
  mouse.target = 1;
  requestDraw();
});
hero.addEventListener('pointerleave', () => { mouse.target = 0; requestDraw(); });
reducedMotion.addEventListener('change', () => { mouse.target = 0; mouse.force = 0; requestDraw(); });
background.addEventListener('load', resizeBackground);
window.addEventListener('resize', resizeBackground);
resizeBackground();


// Пространственная карусель: фотографии вращаются по трём орбитам.
const gallery = document.querySelector('.cinema-carousel');
const stage = document.querySelector('#carousel-stage');
const originalSlides = [...stage.querySelectorAll('.cinema-slide')];
// Все 11 фотографий используются ровно один раз.
const gallerySlides = [...stage.querySelectorAll('.cinema-slide')];
let galleryAngle = 0;
let galleryPaused = reducedMotion.matches;
let galleryHover = false;
let galleryFocus = false;
let galleryVisible = false;
let galleryFrame = 0;
let galleryLastTime = 0;
function renderGallery() {
  const mobile = window.innerWidth <= 700;
  const radius = mobile ? 290 : Math.min(window.innerWidth * .43, 620);
  gallerySlides.forEach((slide, index) => {
    const row = index % 3;
    const column = Math.floor(index / 3);
    const count = Math.ceil((gallerySlides.length - row) / 3);
    const angle = galleryAngle + column * Math.PI * 2 / count + row * .6;
    const x = Math.sin(angle) * radius;
    const depth = Math.cos(angle);
    const y = (row - 1) * (mobile ? 175 : 230) + Math.sin(angle * 2 + row) * 25;
    const scale = .65 + (depth + 1) * .23;
    slide.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${depth * 180}px) rotateY(${-Math.sin(angle) * 32}deg) scale(${scale})`;
    slide.style.zIndex = String(Math.round((depth + 1) * 100) + row);
    slide.style.opacity = String(.25 + (depth + 1) * .375);
    slide.style.filter = `brightness(${.35 + (depth + 1) * .325})`;
    slide.removeAttribute('aria-current');
  });
}
function animateGallery(time) {
  galleryFrame = 0;
  const delta = galleryLastTime ? Math.min(time - galleryLastTime, 50) : 0;
  galleryLastTime = time;
  galleryAngle += delta * .000085;
  renderGallery();
  startGallery();
}
function startGallery() {
  if (!galleryPaused && !galleryHover && !galleryFocus && galleryVisible && !document.hidden && !galleryFrame) galleryFrame = requestAnimationFrame(animateGallery);
  else galleryLastTime = 0;
}
function stopGallery() { cancelAnimationFrame(galleryFrame); galleryFrame = 0; galleryLastTime = 0; }
const pauseButton = document.createElement('button');
pauseButton.type = 'button'; pauseButton.id = 'gallery-pause';
function updatePause() { pauseButton.textContent = galleryPaused ? 'Продолжить ↻' : 'Пауза Ⅱ'; pauseButton.setAttribute('aria-pressed', String(galleryPaused)); }
pauseButton.addEventListener('click', () => { galleryPaused = !galleryPaused; updatePause(); stopGallery(); startGallery(); });
document.querySelector('.carousel-controls').append(pauseButton);
document.querySelector('#gallery-counter').textContent = 'ВНУТРИ VOID';
document.querySelector('#gallery-counter').removeAttribute('aria-live');
function turnGallery(direction) { galleryAngle += direction * Math.PI / 2; renderGallery(); }
document.querySelector('#gallery-prev').addEventListener('click', () => turnGallery(-1));
document.querySelector('#gallery-next').addEventListener('click', () => turnGallery(1));
gallery.addEventListener('pointerenter', () => { galleryHover = true; stopGallery(); });
gallery.addEventListener('pointerleave', () => { galleryHover = false; startGallery(); });
gallery.addEventListener('focusin', () => { galleryFocus = true; stopGallery(); });
gallery.addEventListener('focusout', event => { if (!gallery.contains(event.relatedTarget)) { galleryFocus = false; startGallery(); } });
gallery.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); turnGallery(event.key === 'ArrowRight' ? 1 : -1); }
});
let swipeStart = null;
stage.addEventListener('pointerdown', event => { swipeStart = event.clientX; });
stage.addEventListener('pointerup', event => { if (swipeStart !== null && Math.abs(event.clientX - swipeStart) > 35) turnGallery(event.clientX < swipeStart ? 1 : -1); swipeStart = null; });
stage.addEventListener('pointercancel', () => { swipeStart = null; });
new IntersectionObserver(entries => { galleryVisible = entries[0].isIntersecting; stopGallery(); startGallery(); }, { threshold: .05 }).observe(stage);
document.addEventListener('visibilitychange', () => { stopGallery(); startGallery(); });
reducedMotion.addEventListener('change', () => { galleryPaused = reducedMotion.matches; updatePause(); stopGallery(); startGallery(); });
window.addEventListener('resize', renderGallery);
updatePause(); renderGallery();
