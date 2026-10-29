import { sessions } from './data.js';
export const STORAGE_KEY = 'void-cinema-tickets-v1';
// Проверяем весь массив: чужие или повреждённые записи не попадают в приложение.
export function validateTickets(value) {
  if (!Array.isArray(value)) throw new Error('Ожидался список билетов');
  const used = new Set();
  const ids = new Set();
  return value.map(ticket => {
    const session = sessions.find(item => item.id === ticket?.sessionId);
    if (!session || typeof ticket.id !== 'string' || !/^VOID-[A-Za-z0-9-]{1,80}$/.test(ticket.id) || ids.has(ticket.id) || !Array.isArray(ticket.seats) || !ticket.seats.length || ticket.seats.length > 24 || ticket.guests !== ticket.seats.length || ticket.total !== session.price * ticket.seats.length) throw new Error('Неверный билет');
    ids.add(ticket.id);
    const seatIds = ticket.seats.map(seat => {
      const key = `${session.id}:${seat}`;
      if (!Number.isInteger(seat) || seat < 1 || seat > 24 || session.occupied.includes(seat) || used.has(key)) throw new Error('Неверные или повторяющиеся места');
      used.add(key);
      return seat;
    });
    return { id: ticket.id, sessionId: session.id, seats: seatIds, guests: seatIds.length, total: ticket.total };
  });
}
export function loadTickets() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return { tickets: raw === null ? [] : validateTickets(JSON.parse(raw)), error: '' }; }
  catch { return { tickets: [], error: 'Не удалось прочитать билеты: данные повреждены или хранилище недоступно. Можно сбросить мои билеты и попробовать снова.' }; }
}
export function saveTickets(tickets) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(validateTickets(tickets))); return true; } catch { return false; }
}
export function clearTickets() {
  try { localStorage.removeItem(STORAGE_KEY); return true; } catch { return false; }
}
