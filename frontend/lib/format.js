export const ars = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export const pct = (n) => `${Math.round((n || 0) * 100)}%`;

export const when = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const SERVICE_NAMES = { carpa: 'Carpa del día', sombrilla: 'Sombrilla y reposeras' };

export const STATE_LABELS = {
  START: 'Inicio', SERVICE: 'Eligiendo servicio', GROUP: 'Cantidad de personas', DAYS: 'Cantidad de días',
  PRICE: 'Evaluando precio', NAME: 'Dejando nombre', EMAIL: 'Dejando correo', DNI: 'Dejando DNI',
  CONFIRM: 'Por confirmar', DONE: 'Finalizada',
};
