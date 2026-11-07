'use client';
import { useEffect, useRef, useState } from 'react';
import { send } from '../../lib/useApi';

const newSession = () => `sim-${Math.random().toString(36).slice(2, 10)}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Simulator() {
  const [phone, setPhone] = useState(null);
  const [log, setLog] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => setPhone(newSession()), []);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [log]);

  async function submit(e) {
    e.preventDefault();
    const msg = text.trim();
    if (!msg || busy || !phone) return;
    setText('');
    setBusy(true);
    setLog((l) => [...l, { from: 'in', text: msg }]);
    try {
      const { replies } = await send('/simulate', 'POST', { phone, text: msg, name: 'Visitante' });
      for (const r of replies) {
        await wait(450);
        setLog((l) => [...l, { from: 'out', text: r }]);
      }
    } catch {
      setLog((l) => [...l, { from: 'out', text: 'No se pudo conectar con el backend.' }]);
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setPhone(newSession());
    setLog([]);
  }

  return (
    <section className="page sim">
      <div>
        <h1>Probar el bot</h1>
        <p className="muted">
          Es el mismo bot que responde en WhatsApp. Escribí “hola” para empezar. Cada prueba aparece
          en Conversaciones y las reservas confirmadas en el Resumen.
        </p>
        <button onClick={restart}>Empezar otra conversación</button>
      </div>
      <div className="phone">
        <div className="bubbles" aria-live="polite">
          {log.length === 0 && <p className="muted center">Escribí “hola”</p>}
          {log.map((m, i) => <p key={i} className={`bubble ${m.from}`}>{m.text}</p>)}
          <div ref={end} />
        </div>
        <form onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribí un mensaje" aria-label="Mensaje" autoFocus />
          <button className="primary" disabled={busy || !text.trim()}>Enviar</button>
        </form>
      </div>
    </section>
  );
}
