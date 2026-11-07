import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_FILE = path.join(os.tmpdir(), `marea-test-${process.pid}.json`);
const { handleMessage } = await import('../src/bot.js');
const store = await import('../src/store.js');

const say = (phone, ...msgs) => msgs.map((m) => handleMessage(phone, m));

test('flujo completo: crea la reserva con el total correcto', () => {
  store.resetAll();
  say('sim-a', 'hola', '1', '2', '3', 'sí', 'Juan Pérez', 'juan@mail.com', '30.123.456', 'sí');
  const [lead] = store.listLeads();
  assert.equal(lead.name, 'Juan Pérez');
  assert.equal(lead.dni, '30123456');
  assert.equal(lead.total, 26000 * 3); // carpa, 2 personas, 3 días
  assert.equal(store.getConversation('sim-a').outcome, 'won');
});

test('si dice que es caro ofrece 10% una sola vez', () => {
  store.resetAll();
  say('sim-b', 'hola', '1', '2', '3');
  const first = handleMessage('sim-b', 'es caro');
  assert.match(first[0], /10% de descuento/);
  const second = handleMessage('sim-b', 'sigue siendo caro');
  assert.match(second[0], /mejor precio/);
  say('sim-b', 'sí', 'Ana Gómez', 'ana@mail.com', '12345678', 'sí');
  assert.equal(store.listLeads()[0].total, Math.round(26000 * 3 * 0.9));
});

test('valida correo y DNI antes de avanzar', () => {
  store.resetAll();
  say('sim-c', 'hola', '1', '1', '1', 'sí', 'Ana Gómez');
  handleMessage('sim-c', 'esto-no-es-un-mail');
  assert.equal(store.getConversation('sim-c').state, 'EMAIL');
  say('sim-c', 'ana@mail.com');
  handleMessage('sim-c', '123');
  assert.equal(store.getConversation('sim-c').state, 'DNI');
});

test('"más de 6 personas" usa el tramo 7+', () => {
  store.resetAll();
  say('sim-d', 'hola', 'carpa', 'más de 6');
  assert.equal(store.getConversation('sim-d').data.tier, '7+');
});

test('cuando pide un asesor el bot deja de responder', () => {
  store.resetAll();
  say('sim-e', 'hola');
  handleMessage('sim-e', 'quiero hablar con un asesor');
  assert.equal(store.getConversation('sim-e').handoff, true);
  assert.deepEqual(handleMessage('sim-e', 'hola?'), []);
});
