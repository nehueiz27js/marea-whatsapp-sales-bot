// Máquina de estados de la conversación de venta.
// START → SERVICE → GROUP → DAYS → PRICE → NAME → EMAIL → DNI → CONFIRM → DONE
import {
  SERVICES,
  DISCOUNT,
  tierForPeople,
  unitPrice,
  serviceById,
  tierById,
  formatARS,
} from './catalog.js';
import * as store from './store.js';

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const YES = /^(si|sii+|dale|ok|okey|okay|claro|confirmo|confirmar|listo|perfecto|me sirve|de una|va)\b/;
const NO = /^(no|nop|nope|cancelar|cancelo)\b/;
const EXPENSIVE = /(caro|costoso|descuento|rebaja|barato|promo)/;
const HANDOFF = /(asesor|humano|persona real|hablar con alguien|operador)/;
const RESTART = /^(reiniciar|menu|empezar de nuevo)$/;
const WORDS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };

function parseCount(t) {
  const m = t.match(/\d+/);
  let n = m ? Number(m[0]) : null;
  if (n === null) {
    const w = t.split(/\s+/).find((x) => WORDS[x]);
    n = w ? WORDS[w] : null;
  }
  if (n !== null && /(mas de|mas que)/.test(t)) n += 1;
  return n;
}

export function quote(d) {
  const unit = unitPrice(d.service, d.tier);
  const subtotal = unit * d.days;
  const total = Math.round(subtotal * (1 - (d.discount || 0)));
  return { unit, subtotal, total };
}

function quoteText(d) {
  const { unit, total } = quote(d);
  const s = serviceById(d.service);
  const t = tierById(d.tier);
  const dias = d.days === 1 ? '1 día' : `${d.days} días`;
  const off = d.discount ? ` (con ${Math.round(d.discount * 100)}% de descuento)` : '';
  return `${s.name} para ${t.label}: ${formatARS(unit)} por día × ${dias} = ${formatARS(total)}${off}`;
}

const serviceMenu = () =>
  'Elegí qué querés reservar:\n' +
  SERVICES.map((s, i) => `${i + 1}. ${s.name} (${s.desc})`).join('\n');

function go(conv, state) {
  conv.state = state;
  if (!conv.reached.includes(state)) conv.reached.push(state);
}

function reset(conv) {
  conv.state = 'START';
  conv.data = {};
  conv.outcome = null;
}

function greet(conv) {
  reset(conv);
  go(conv, 'SERVICE');
  const who = conv.name ? `, ${conv.name.split(' ')[0]}` : '';
  return [`¡Hola${who}! 👋 Soy el asistente de reservas. Te ayudo a reservar en un minuto.`, serviceMenu()];
}

function step(conv, raw) {
  const t = norm(raw);
  const d = conv.data;

  if (RESTART.test(t)) return greet(conv);
  if (HANDOFF.test(t)) {
    conv.handoff = true;
    return ['Listo, ya avisé a una persona del equipo. Te escribe en breve. 🙌'];
  }

  switch (conv.state) {
    case 'START':
    case 'DONE':
      return greet(conv);

    case 'SERVICE': {
      const n = Number(t);
      const byNumber = Number.isInteger(n) ? SERVICES[n - 1] : null;
      const byWord = SERVICES.find((s) => t.includes(s.id) || (s.id === 'sombrilla' && t.includes('reposera')));
      const chosen = byNumber || byWord;
      if (!chosen) return ['No llegué a entender 😅', serviceMenu()];
      d.service = chosen.id;
      go(conv, 'GROUP');
      return [`Perfecto: ${chosen.name}. ¿Cuántas personas son?`];
    }

    case 'GROUP': {
      const n = parseCount(t);
      if (!n || n < 1) return ['Decime con un número cuántas personas son (por ejemplo: 4).'];
      d.people = n;
      d.tier = tierForPeople(n).id;
      go(conv, 'DAYS');
      return ['¿Cuántos días querés reservar?'];
    }

    case 'DAYS': {
      const n = parseCount(t);
      if (!n || n < 1 || n > 30) return ['Decime cuántos días (entre 1 y 30).'];
      d.days = n;
      go(conv, 'PRICE');
      return [quoteText(d), '¿Te sirve el precio? (sí / no / es caro)'];
    }

    case 'PRICE': {
      if (EXPENSIVE.test(t)) {
        if (!d.discount) {
          d.discount = DISCOUNT;
          return [
            `Te entiendo. Por haber consultado hoy te hago un ${Math.round(DISCOUNT * 100)}% de descuento.`,
            quoteText(d),
            '¿Te sirve así? (sí / no)',
          ];
        }
        return ['Es el mejor precio que puedo ofrecerte por este canal. ¿Avanzamos? (sí / no)'];
      }
      if (YES.test(t)) {
        go(conv, 'NAME');
        return ['¡Genial! Necesito unos datos para reservar. ¿Cuál es tu nombre y apellido?'];
      }
      if (NO.test(t)) {
        conv.outcome = 'lost';
        go(conv, 'DONE');
        return ['Sin problema, gracias por consultar. Si cambiás de idea, escribime "hola". 🌊'];
      }
      return ['¿Te sirve el precio? Respondé "sí", "no" o "es caro" si querés que veamos un descuento.'];
    }

    case 'NAME': {
      const name = raw.trim();
      if (name.length < 3 || !name.includes(' ')) return ['Necesito nombre y apellido, por favor.'];
      d.name = name;
      go(conv, 'EMAIL');
      return ['Gracias. ¿Cuál es tu correo electrónico?'];
    }

    case 'EMAIL': {
      const email = raw.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ['Ese correo no parece válido. ¿Me lo pasás de nuevo?'];
      d.email = email;
      go(conv, 'DNI');
      return ['¿Y tu DNI? (solo números)'];
    }

    case 'DNI': {
      const dni = raw.replace(/[.\s]/g, '');
      if (!/^\d{7,8}$/.test(dni)) return ['El DNI debe tener 7 u 8 números. ¿Me lo pasás de nuevo?'];
      d.dni = dni;
      go(conv, 'CONFIRM');
      return [
        `Revisemos tu reserva:\n• ${quoteText(d)}\n• Nombre: ${d.name}\n• Correo: ${d.email}\n• DNI: ${d.dni}`,
        '¿Confirmo la reserva? (sí / no)',
      ];
    }

    case 'CONFIRM': {
      if (YES.test(t)) {
        const { unit, total } = quote(d);
        const lead = store.createLead({
          phone: conv.phone,
          name: d.name,
          email: d.email,
          dni: d.dni,
          service: d.service,
          people: d.people,
          tier: d.tier,
          days: d.days,
          unitPrice: unit,
          discount: d.discount || 0,
          total,
        });
        conv.outcome = 'won';
        go(conv, 'DONE');
        const base = process.env.PAYMENT_URL;
        const pay = base
          ? `Podés abonar acá: ${base}${base.includes('?') ? '&' : '?'}ref=${lead.id}`
          : 'En unos minutos te llegan los datos de pago por correo.';
        return [`¡Reserva confirmada! 🎉 Tu código es ${lead.id}.`, pay];
      }
      if (NO.test(t)) {
        reset(conv);
        conv.outcome = 'lost';
        return ['Listo, cancelé la reserva. Cuando quieras retomarla, escribime "hola".'];
      }
      return ['Respondé "sí" para confirmar o "no" para cancelar.'];
    }

    default:
      return greet(conv);
  }
}

export function handleMessage(phone, rawText, profileName = '') {
  const text = (rawText ?? '').trim();
  const conv = store.getOrCreateConversation(phone, profileName);
  store.addMessage(phone, 'in', text);
  if (conv.handoff) return []; // una persona tomó la conversación
  const replies = step(conv, text);
  for (const r of replies) store.addMessage(phone, 'out', r);
  store.save();
  return replies;
}
