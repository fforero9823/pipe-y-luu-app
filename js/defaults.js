// Datos con los que arranca la app la primera vez (salen del Excel de Luu).

export const CATEGORIAS_GASTO = [
  'Mercado', 'Comida', 'Casa', 'Servicios públicos', 'Internet', 'Plan de datos',
  'Administración', 'Gasolina', 'Transporte', 'Plataformas', 'Ocio', 'Para vestir',
  'Regalos', 'Salud', 'Gimnasio', 'Seguridad social', 'Lua', 'Deudas', 'Préstamo',
  'Otras compras', 'Ahorro', 'Transferencia', 'Otros',
];
export const CATEGORIAS_INGRESO = ['Salario', 'Ventas', 'Préstamo recibido', 'Otros ingresos'];

// Las 8 que salen primero al registrar (el resto queda en "Más…")
export const CATEGORIAS_RAPIDAS = ['Mercado', 'Comida', 'Casa', 'Servicios públicos', 'Gasolina', 'Plataformas', 'Ocio'];

export const ESPACIOS = [
  { id: 'casa', nombre: 'Casa', icono: 'casa', tipo: 'hogar', desc: 'Hogar, mercado y servicios', orden: 1 },
  { id: 'matitas', nombre: 'Matitas', icono: 'hoja', tipo: 'hogar', desc: 'Hidropónico y en tierra', orden: 2 },
  { id: 'neru', nombre: 'Neru', icono: 'carro', tipo: 'hogar', desc: 'Cuota, gasolina y taller', orden: 3 },
  {
    id: 'zerenta', nombre: 'Zerenta', icono: 'logo', tipo: 'negocio', desc: 'Empresa', orden: 4,
    logo: 'img/zerenta.png', logoClaro: 'img/zerenta-claro.png',
    marca: { fondo: '#53142F', acento: '#EAA7C5', claro: '#FFF6EE', texto: '#FFF6EE' },
  },
  {
    id: 'tdp', nombre: 'TDP', icono: 'logo', tipo: 'negocio', desc: 'Tuft da Process', orden: 5,
    logo: 'img/tdp.png', logoClaro: 'img/tdp-claro.png',
    marca: { fondo: '#043A34', acento: '#FF7401', claro: '#F0F0EE', texto: '#F0F0EE' },
  },
];

export const CUENTAS = [
  { id: 'nequi-pipe', nombre: 'Nequi Pipe', dueno: 'pipe', saldoInicial: 0, orden: 1 },
  { id: 'nu-pipe', nombre: 'CA Nu Pipe', dueno: 'pipe', saldoInicial: 0, orden: 2 },
  { id: 'dvv-pipe', nombre: 'CA DVV Pipe', dueno: 'pipe', saldoInicial: 0, orden: 3 },
  { id: 'cash-pipe', nombre: 'Cash Pipe', dueno: 'pipe', saldoInicial: 0, orden: 4 },
  { id: 'nequi-luu', nombre: 'Nequi Luu', dueno: 'luu', saldoInicial: 0, orden: 5 },
  { id: 'nu-luu', nombre: 'CA Nu Luu', dueno: 'luu', saldoInicial: 0, orden: 6 },
  { id: 'rappi-luu', nombre: 'Rappicuenta Luu', dueno: 'luu', saldoInicial: 0, orden: 7 },
  { id: 'cash-luu', nombre: 'Cash Luu', dueno: 'luu', saldoInicial: 0, orden: 8 },
];

export function ajustesIniciales() {
  return {
    categorias: [...CATEGORIAS_GASTO],
    categoriasIngreso: [...CATEGORIAS_INGRESO],
    presupuestos: {},
    sembrado: true,
  };
}
