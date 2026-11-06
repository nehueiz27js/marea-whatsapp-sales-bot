'use client';
import { useState } from 'react';
import { useApi, send } from '../../lib/useApi';
import { when, STATE_LABELS } from '../../lib/format';

export default function Chats() {
  const list = useApi('/conversations', 3000);
  const [phone, setPhone] = useState(null);
  const detail = useApi(phone ? `/conversations/${encodeURIComponent(phone)}` : null, 2500);
  const conv = detail.data;

  async function toggleHandoff() {
    await send(`/conversations/${encodeURIComponent(phone)}`, 'PATCH', { handoff: !conv.handoff });
    detail.reload();
    list.reload();
  }

  return (
    <section className="page chats">
      <aside aria-label="Lista de conversaciones">
        <h1>Conversaciones</h1>
        {list.data?.length ? (
          <ul>
            {list.data.map((c) => (
              <li key={c.phone}>
                <button onClick={() => setPhone(c.phone)} aria-pressed={phone === c.phone}>
                  <strong>{c.name || c.phone}</strong>
                  <span>{c.lastMessage.slice(0, 60)}</span>
                  <small>
                    {c.handoff ? 'Atiende una persona' : STATE_LABELS[c.state]} · {when(c.updatedAt)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no hay conversaciones.</p>
        )}
      </aside>

      <div className="thread">
        {!conv ? (
          <p className="muted">Elegí una conversación para ver el chat completo.</p>
        ) : (
          <>
            <div className="thread-head">
              <div>
                <h2>{conv.name || conv.data.name || conv.phone}</h2>
                <small>{conv.phone}</small>
              </div>
              <button onClick={toggleHandoff} className={conv.handoff ? 'primary' : ''}>
                {conv.handoff ? 'Devolver al bot' : 'Tomar la conversación'}
              </button>
            </div>
            {conv.handoff && <p className="notice">Una persona está atendiendo: el bot no responde hasta que se lo devuelvas.</p>}
            <div className="bubbles">
              {conv.messages.map((m, i) => (
                <p key={i} className={`bubble ${m.direction}`}>{m.text}<time>{when(m.at)}</time></p>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
