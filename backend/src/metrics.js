const FUNNEL = [
  ['START', 'Escribió al WhatsApp'],
  ['GROUP', 'Eligió un servicio'],
  ['PRICE', 'Vio el precio'],
  ['NAME', 'Aceptó el precio'],
  ['CONFIRM', 'Dejó sus datos'],
];

export function computeMetrics(db) {
  const convs = Object.values(db.conversations);
  const leads = db.leads;
  const active = leads.filter((l) => l.status !== 'lost');
  const sum = (arr) => arr.reduce((a, l) => a + l.total, 0);

  const funnel = FUNNEL.map(([stage, label]) => ({
    stage,
    label,
    count: convs.filter((c) => c.reached.includes(stage)).length,
  }));
  funnel.push({ stage: 'WON', label: 'Confirmó la reserva', count: convs.filter((c) => c.outcome === 'won').length });

  const byService = {};
  for (const l of active) byService[l.service] = (byService[l.service] ?? 0) + 1;

  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    daily.push({ day, leads: leads.filter((l) => l.createdAt.startsWith(day)).length });
  }

  return {
    conversations: convs.length,
    leads: leads.length,
    conversion: convs.length ? leads.length / convs.length : 0,
    collected: sum(leads.filter((l) => l.status === 'paid')),
    pending: sum(leads.filter((l) => l.status === 'new')),
    avgTicket: active.length ? sum(active) / active.length : 0,
    handoffs: convs.filter((c) => c.handoff).length,
    funnel,
    byService,
    daily,
  };
}
