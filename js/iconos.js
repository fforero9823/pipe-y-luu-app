// Íconos de línea (SVG). Todos usan "currentColor", así toman el color del texto.
const svg = (d, w = 20, sw = 1.7) =>
  `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const I = {
  casa: (w) => svg('<path d="M3 11 12 4l9 7v9H3z"/><path d="M10 20v-5h4v5"/>', w),
  hoja: (w) => svg('<path d="M12 21v-8"/><path d="M12 13C12 8 9 5 4 5c0 5 3 8 8 8z"/><path d="M12 13c0-4 3-7 8-7 0 4-3 7-8 7z"/>', w),
  carro: (w) => svg('<path d="M5 16V11l2-5h10l2 5v5z"/><path d="M5 11h14"/><circle cx="8" cy="16" r="2"/><circle cx="16" cy="16" r="2"/>', w),
  lista: (w) => svg('<path d="M4 7h16M4 12h16M4 17h10"/>', w),
  espacios: (w) => svg('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>', w),
  meta: (w) => svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>', w),
  tarjeta: (w) => svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>', w),
  mas: (w = 24) => svg('<path d="M12 5v14M5 12h14"/>', w, 2),
  x: (w = 16) => svg('<path d="M6 6l12 12M18 6 6 18"/>', w, 1.8),
  atras: (w = 16) => svg('<path d="M15 5 8 12l7 7"/>', w, 1.8),
  adelante: (w = 16) => svg('<path d="m9 5 7 7-7 7"/>', w, 1.8),
  sol: (w = 18) => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', w),
  luna: (w = 18) => svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', w),
  ajustes: (w = 18) => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', w, 1.5),
  carrito: (w) => svg('<path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/>', w),
  plato: (w) => svg('<circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3.5"/><path d="M4 3v5M2.5 3v3.5a1.5 1.5 0 0 0 3 0V3M20 3c-1.5 0-2 2-2 4s1 3 2 3V3zM20 10v11"/>', w, 1.5),
  bombillo: (w) => svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>', w),
  wifi: (w) => svg('<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>', w),
  surtidor: (w) => svg('<path d="M4 20V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14"/><path d="M3 20h12"/><path d="M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M7 8h4"/>', w),
  bus: (w) => svg('<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 21v-3M16 21v-3"/><circle cx="8.5" cy="14.5" r="1"/><circle cx="15.5" cy="14.5" r="1"/>', w),
  tv: (w) => svg('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>', w),
  estrella: (w) => svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', w),
  corazon: (w) => svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>', w),
  pesa: (w) => svg('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>', w),
  regalo: (w) => svg('<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z"/>', w, 1.5),
  camisa: (w) => svg('<path d="M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0z"/>', w, 1.5),
  gato: (w) => svg('<path d="M5 20v-9l-1-7 4 3h8l4-3-1 7v9z"/><circle cx="9.5" cy="12" r=".6"/><circle cx="14.5" cy="12" r=".6"/><path d="M11 15h2l-1 1z"/>', w, 1.5),
  billete: (w) => svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>', w),
  entra: (w) => svg('<path d="M12 4v14M6 12l6 6 6-6"/>', w),
  mover: (w) => svg('<path d="M4 8h14l-3-3M20 16H6l3 3"/>', w),
  alcancia: (w) => svg('<path d="M5 11a7 6 0 0 1 12-3l3-1-1 4a6 6 0 0 1 0 4l-2 1v3h-3v-2H9v2H6v-3.5A6 6 0 0 1 5 11z"/><circle cx="15" cy="11" r=".6"/>', w, 1.5),
  manos: (w) => svg('<path d="M4 12h5l3 3 3-3h5"/><path d="M8 8h8M8 16h8"/>', w),
  punto: (w) => svg('<circle cx="12" cy="12" r="3"/>', w),
  buscar: (w = 18) => svg('<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>', w),
  subir: (w = 18) => svg('<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>', w),
  bajar: (w = 18) => svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>', w),
  check: (w = 18) => svg('<path d="M5 12.5 10 17 19 7"/>', w, 2),
  google: () => `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`,
};

const PORCATEGORIA = {
  'Mercado': 'carrito', 'Comida': 'plato', 'Casa': 'casa', 'Administración': 'casa', 'Servicios públicos': 'bombillo',
  'Internet': 'wifi', 'Plan de datos': 'wifi', 'Gasolina': 'surtidor', 'Transporte': 'bus', 'Plataformas': 'tv',
  'Ocio': 'estrella', 'Salud': 'corazon', 'Seguridad social': 'corazon', 'Gimnasio': 'pesa', 'Regalos': 'regalo',
  'Para vestir': 'camisa', 'Lua': 'gato', 'Deudas': 'tarjeta', 'Préstamo': 'billete', 'Ahorro': 'alcancia',
  'Transferencia': 'mover', 'Matitas': 'hoja', 'Huerta': 'hoja', 'Flores': 'hoja', 'Neru': 'carro',
  'Salario': 'entra', 'Ventas': 'entra', 'Otros ingresos': 'entra',
};

export function iconoMov(m) {
  if (m.tipo === 'transferencia') return I.mover();
  if (m.tipo === 'ahorro') return I.alcancia();
  if (m.tipo === 'saldo') return I.manos();
  if (m.tipo === 'ingreso' && !PORCATEGORIA[m.categoria]) return I.entra();
  const k = PORCATEGORIA[m.categoria];
  return k ? I[k]() : I.punto();
}
