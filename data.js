// Все сведения о сеансах и исходная занятость находятся здесь.
export const sessions = [
  { id: 'orbit', title: 'Американский психопат (2000)', time: '18:30', genre: 'Психологический триллер', duration: '102 минуты', age: '18+', price: 450, description: 'За безупречным образом успешного финансиста Патрика Бэйтмана скрывается пугающая двойная жизнь. Сатирический триллер Мэри Хэррон по роману Брета Истона Эллиса.', occupied: [2, 3, 10, 17, 22], theme: 'orbit-film', image: 'images/american-psycho.jpg' },
  { id: 'night', title: 'Бойцовский клуб (1999)', time: '21:15', genre: 'Психологический триллер', duration: '139 минут', age: '18+', price: 600, description: 'Измученный бессонницей офисный сотрудник знакомится с Тайлером Дёрденом. Вместе они создают подпольный бойцовский клуб, который постепенно выходит из-под контроля. Фильм Дэвида Финчера по роману Чака Паланика.', occupied: [1, 6, 8, 9, 15, 20], theme: 'night-film', image: 'images/fight-club.jpg' }
];
export const seats = Array.from({ length: 24 }, (_, index) => ({ id: index + 1, row: Math.floor(index / 6) + 1, number: index % 6 + 1 }));
export const money = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
