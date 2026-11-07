// Catálogo y precios. Los valores son de ejemplo: cambialos por los del negocio.
export const DISCOUNT = 0.1;

export const SERVICES = [
  { id: 'carpa', name: 'Carpa del día', desc: 'carpa con mesa y sillas, cerca del mar' },
  { id: 'sombrilla', name: 'Sombrilla y reposeras', desc: 'sombrilla grande con reposeras' },
];

export const TIERS = [
  { id: '1', label: '1 persona', min: 1, max: 1 },
  { id: '2', label: '2 personas', min: 2, max: 2 },
  { id: '3-4', label: '3 o 4 personas', min: 3, max: 4 },
  { id: '5-6', label: '5 o 6 personas', min: 5, max: 6 },
  { id: '7+', label: 'más de 6 personas', min: 7, max: Infinity },
];

// Precio por día en ARS, por servicio y tamaño de grupo
const PRICES = {
  carpa: { '1': 18000, '2': 26000, '3-4': 38000, '5-6': 50000, '7+': 68000 },
  sombrilla: { '1': 9000, '2': 13000, '3-4': 19000, '5-6': 25000, '7+': 34000 },
};

export const serviceById = (id) => SERVICES.find((s) => s.id === id);
export const tierById = (id) => TIERS.find((t) => t.id === id);
export const tierForPeople = (n) => TIERS.find((t) => n >= t.min && n <= t.max);
export const unitPrice = (serviceId, tierId) => PRICES[serviceId][tierId];

export const formatARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
