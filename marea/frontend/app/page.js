'use client';
import { useApi, send } from '../lib/useApi';
import { ars, pct, when, SERVICE_NAMES } from '../lib/format';

const STATUS = { new: 'Por cobrar', paid: 'Cobrada', lost: 'Perdida' };

export default function Dashboard() {
  const metrics = useApi('/metrics');
  const leads = useApi('/leads');
  const m = metrics.data;

  if (metrics.error && !m) {
    return (
      <section className="page">
        <h1>Resumen</h1>
        <p className="notice">No se pudo conectar con el backend. Verificá que esté corriendo en el puerto 4000 y que BACKEND_URL esté bien configurada.</p>
      </section>
    );
  }
  if (!m) return <section className="page"><p className="muted">Cargando…</p></section>;

  const top = m.funnel[0].count || 1;
  const maxDay = Math.max(1, ...m.daily.map((d) => d.leads));

  async function setStatus(id, status) {
    await send(`/leads/${id}`, 'PATCH', { status });
    leads.reload();
    metrics.reload();
  }

  return (
    <section className="page">
      <h1>Resumen de ventas</h1>

      <dl className="stats">
        <div><dt>Conversaciones</dt><dd>{m.conversations}</dd></div>
        <div><dt>Reservas</dt><dd>{m.leads}</dd></div>
        <div><dt>Conversión</dt><dd>{pct(m.conversion)}</dd></div>
        <div><dt>Cobrado</dt><dd>{ars(m.collected)}</dd></div>
        <div><dt>Por cobrar</dt><dd>{ars(m.pending)}</dd></div>
      </dl>

      <div className="split">
        <div>
          <h2>Dónde se queda la gente</h2>
          <ol className="tide">
            {m.funnel.map((f, i) => (
              <li key={f.stage}>
                <span className="tide-label">{f.label}</span>
                <span className="tide-bar" data-last={i === m.funnel.length - 1} style={{ width: `${Math.max(4, (f.count / top) * 100)}%` }} />
                <span className="tide-count">{f.count}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2>Reservas de los últimos 7 días</h2>
          <div className="days" role="img" aria-label="Reservas por día">
            {m.daily.map((d) => (
              <div key={d.day} className="day">
                <span className="day-n">{d.leads}</span>
                <span className="day-bar" style={{ height: `${(d.leads / maxDay) * 100}%` }} />
                <span className="day-l">{d.day.slice(8)}/{d.day.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2>Reservas</h2>
      {leads.data?.length ? (
        <div className="scroll">
          <table>
            <thead>
              <tr><th>Cliente</th><th>Servicio</th><th>Personas</th><th>Días</th><th>Total</th><th>Fecha</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {leads.data.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.name}</strong>
                    <small>{l.email}</small>
                  </td>
                  <td>{SERVICE_NAMES[l.service] ?? l.service}</td>
                  <td>{l.people}</td>
                  <td>{l.days}</td>
                  <td>{ars(l.total)}{l.discount ? <small>con {Math.round(l.discount * 100)}% off</small> : null}</td>
                  <td>{when(l.createdAt)}</td>
                  <td>
                    <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value)} data-status={l.status} aria-label={`Estado de la reserva de ${l.name}`}>
                      {Object.entries(STATUS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Todavía no hay reservas. Probá el bot desde “Probar el bot” y confirmá una.</p>
      )}
    </section>
  );
}
