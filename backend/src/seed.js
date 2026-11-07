// Genera conversaciones y reservas de ejemplo para ver el panel con datos.
// Uso: npm run seed
import * as store from './store.js';
import { handleMessage } from './bot.js';

store.resetAll();

const names = ['Lucía Fernández', 'Martín Gómez', 'Sofía Ruiz', 'Tomás Acosta', 'Camila Díaz', 'Joaquín Pérez', 'Valentina Sosa', 'Nicolás Romero', 'Julieta Castro', 'Franco Molina', 'Agustina Ríos', 'Bruno Herrera'];
const people = [1, 2, 4, 6, 8, 3, 2];
const days = [1, 2, 3, 5, 7];

names.forEach((full, i) => {
  const phone = `sim-seed-${i}`;
  const say = (t) => handleMessage(phone, t, full);
  const start = ['hola', String(1 + (i % 2)), String(people[i % people.length]), String(days[i % days.length])];
  start.forEach(say);

  const mode = i % 6;
  if (mode === 0) return; // abandonó después de ver el precio
  if (mode === 1) { say('es caro'); say('sí'); }
  else if (mode === 2) { say('no'); return; }
  else say('sí');

  say(full);
  say(`${full.split(' ')[0].toLowerCase()}@mail.com`);
  say(String(30000000 + i * 1234567));
  if (mode === 3 && i > 5) { say('no'); return; }
  say('sí');
});

store.raw().conversations['sim-seed-4'].handoff = true;

// Repartimos la actividad en los últimos 7 días
const { conversations, leads } = store.raw();
Object.values(conversations).forEach((c, i) => {
  const t = new Date(Date.now() - (i % 7) * 86400000 - i * 3600000).toISOString();
  c.createdAt = t;
  c.updatedAt = t;
});
leads.forEach((l, i) => {
  l.createdAt = new Date(Date.now() - (i % 7) * 86400000 - i * 3600000).toISOString();
  if (i % 3 === 0) l.status = 'paid';
});
store.save();
console.log(`Listo: ${Object.keys(conversations).length} conversaciones y ${leads.length} reservas de ejemplo.`);
