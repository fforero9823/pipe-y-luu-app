// calc.js — Toda la matemática de la app, sin nada de pantalla.
// Regla de oro: el dinero SIEMPRE se guarda en pesos enteros (sin decimales),
// y las fechas como texto 'AAAA-MM-DD' en hora de Colombia (nada de UTC).

export const PERSONAS = ['pipe', 'luu'];

// ---------- Dinero ----------
export function pesos(n) {
  const v = Math.round(Number(n) || 0);
  const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '−$' : '$') + s;
}

// Convierte lo que la persona escribe ("42.300", "$ 1.200.000", "42300,50") a pesos enteros.
export function leerPesos(texto) {
  if (typeof texto === 'number') return Math.round(texto);
  let t = String(texto || '').replace(/[^\d.,-]/g, '');
  if (!t) return 0;
  const comas = (t.match(/,/g) || []).length;
  const puntos = (t.match(/\./g) || []).length;
  if (comas && puntos) {
    // El último separador es el decimal
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (comas) {
    t = comas === 1 && /,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  } else if (puntos) {
    t = puntos === 1 && /\.\d{1,2}$/.test(t) ? t : t.replace(/\./g, '');
  }
  return Math.round(parseFloat(t) || 0);
}

// ---------- Fechas (siempre locales) ----------
const pad = (n) => String(n).padStart(2, '0');
export function hoy(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function mesDe(fecha) { return String(fecha || '').slice(0, 7); } // 'AAAA-MM'
export function mesActual(d = new Date()) { return hoy(d).slice(0, 7); }
export function moverMes(mes, delta) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function nombreMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  const n = MESES[m - 1];
  return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + a;
}
export function fechaCorta(fecha, ref = hoy()) {
  if (!fecha) return '';
  if (fecha === ref) return 'hoy';
  const [a, m, d] = fecha.split('-').map(Number);
  const ayer = hoy(new Date(new Date(ref + 'T12:00:00').getTime() - 864e5));
  if (fecha === ayer) return 'ayer';
  return `${d} ${MESES_CORTOS[m - 1]}` + (a !== Number(ref.slice(0, 4)) ? ` ${a}` : '');
}
export function diasEntre(desde, hasta) {
  const a = new Date(desde + 'T12:00:00'), b = new Date(hasta + 'T12:00:00');
  return Math.round((b - a) / 864e5);
}
export function haceRato(ms, ahora = Date.now()) {
  const s = Math.max(0, (ahora - ms) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

// ---------- División entre los dos ----------
// division = { pipe: %, luu: % } (enteros que suman 100)
export function partes(monto, division) {
  const pp = division && Number.isFinite(division.pipe) ? division.pipe : 50;
  const pipe = Math.round((monto * pp) / 100);
  return { pipe, luu: monto - pipe };
}

// Categorías que NO cuentan como "gasto del mes" (son movimientos de plata, no consumo)
export const CATEGORIAS_NO_GASTO = ['Transferencia', 'Ahorro'];

export function esGastoReal(m) {
  return m.tipo === 'gasto' && !CATEGORIAS_NO_GASTO.includes(m.categoria);
}

// Saldo entre los dos. Positivo => Luu le debe a Pipe. Negativo => Pipe le debe a Luu.
export function saldoEntreDos(movs) {
  let neto = 0;
  for (const m of movs) {
    const monto = m.monto || 0;
    if (m.tipo === 'gasto') {
      const p = partes(monto, m.division);
      if (m.pagador === 'pipe') neto += p.luu;
      else if (m.pagador === 'luu') neto -= p.pipe;
    } else if (m.tipo === 'ingreso') {
      // Plata compartida que recibió uno: le debe al otro su parte
      const p = partes(monto, m.division);
      if (m.pagador === 'luu') neto += p.pipe;
      else if (m.pagador === 'pipe') neto -= p.luu;
    } else if (m.tipo === 'saldo') {
      // Pago para saldar cuentas: pagador le entrega 'monto' al otro
      if (m.pagador === 'luu') neto -= monto;
      else if (m.pagador === 'pipe') neto += monto;
    }
  }
  return neto;
}

export function textoDeuda(neto, quienSoy, nombres = { pipe: 'Pipe', luu: 'Luu' }) {
  if (Math.abs(neto) < 1) return { claro: true, texto: 'Cuentas claras', deudor: null, monto: 0 };
  const deudor = neto > 0 ? 'luu' : 'pipe';
  const acreedor = deudor === 'luu' ? 'pipe' : 'luu';
  const monto = Math.abs(Math.round(neto));
  let texto;
  if (quienSoy === deudor) texto = `Le debes a ${nombres[acreedor]}`;
  else if (quienSoy === acreedor) texto = `${nombres[deudor]} te debe`;
  else texto = `${nombres[deudor]} le debe a ${nombres[acreedor]}`;
  return { claro: false, texto, deudor, acreedor, monto };
}

// ---------- Cuentas ----------
export function saldoCuenta(cuenta, movs) {
  let s = cuenta.saldoInicial || 0;
  for (const m of movs) {
    const v = m.monto || 0;
    if (m.cuentaId === cuenta.id) {
      if (m.tipo === 'ingreso') s += v;
      else s -= v; // gasto, transferencia, ahorro, saldo: sale de esta cuenta
    }
    if (m.cuentaDestinoId === cuenta.id && m.tipo !== 'ingreso') s += v;
  }
  return s;
}

// ---------- Resumen de un mes ----------
export function resumenMes(movs, mes, filtro = () => true) {
  let gastos = 0, ingresos = 0;
  const porCategoria = {};
  for (const m of movs) {
    if (mesDe(m.fecha) !== mes || !filtro(m)) continue;
    if (esGastoReal(m)) {
      gastos += m.monto;
      porCategoria[m.categoria || 'Otros'] = (porCategoria[m.categoria || 'Otros'] || 0) + m.monto;
    } else if (m.tipo === 'ingreso') ingresos += m.monto;
  }
  return { gastos, ingresos, balance: ingresos - gastos, porCategoria };
}

// ---------- Créditos ----------
// Colombia: los bancos anuncian tasa E.A. (efectiva anual) y cobran mensual (M.V.)
export function eaAMensual(eaPct) { return (Math.pow(1 + eaPct / 100, 1 / 12) - 1) * 100; }
export function mensualAEa(mPct) { return (Math.pow(1 + mPct / 100, 12) - 1) * 100; }

export function cuotaFija(principal, tasaMensualPct, n) {
  const r = tasaMensualPct / 100;
  if (!n) return 0;
  if (!r) return Math.round(principal / n);
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}
export function saldoTrasPagos(principal, tasaMensualPct, n, k) {
  const r = tasaMensualPct / 100;
  if (k >= n) return 0;
  if (!r) return Math.max(0, Math.round(principal - (principal / n) * k));
  return Math.max(0, Math.round((principal * (Math.pow(1 + r, n) - Math.pow(1 + r, k))) / (Math.pow(1 + r, n) - 1)));
}

export function estadoCredito(cr, movs, ref = hoy()) {
  const pagosApp = movs.filter((m) => m.creditoId === cr.id && m.tipo === 'gasto');
  const pagadas = (cr.cuotasPagadasInicial || 0) + pagosApp.length;
  const plazo = cr.plazo || 0;
  const mesRef = mesDe(ref);
  const pagadaEsteMes = pagosApp.some((m) => mesDe(m.fecha) === mesRef);
  const terminado = plazo > 0 && pagadas >= plazo;
  // Próxima fecha de pago
  const dia = Math.min(Math.max(cr.diaPago || 1, 1), 28);
  let mesPago = pagadaEsteMes ? moverMes(mesRef, 1) : mesRef;
  let proxima = `${mesPago}-${pad(dia)}`;
  const diasFaltan = diasEntre(ref, proxima);
  const saldo = cr.tipo === 'banco'
    ? saldoTrasPagos(cr.montoInicial || 0, cr.tasaMensual || 0, plazo, pagadas)
    : cr.tipo === 'plazos' ? Math.max(0, (plazo - pagadas) * (cr.cuota || 0)) : null;
  return { pagadas, plazo, pagadaEsteMes, terminado, proxima, diasFaltan, saldo, vencida: diasFaltan < 0 };
}

// ---------- Metas ----------
export function estadoMeta(meta, movs, ref = hoy()) {
  const aportes = movs.filter((m) => m.metaId === meta.id && m.tipo === 'ahorro').reduce((s, m) => s + m.monto, 0);
  const ahorrado = (meta.inicial || 0) + aportes;
  const falta = Math.max(0, (meta.objetivo || 0) - ahorrado);
  const pct = meta.objetivo ? Math.min(100, Math.round((ahorrado / meta.objetivo) * 100)) : 0;
  let porQuincena = null, quincenas = null;
  if (meta.fechaLimite && falta > 0) {
    const fin = meta.fechaLimite.length === 7 ? meta.fechaLimite + '-28' : meta.fechaLimite;
    const dias = diasEntre(ref, fin);
    quincenas = Math.max(1, Math.ceil(dias / 15.2));
    porQuincena = Math.ceil(falta / quincenas / 100) * 100; // redondeado a $100
  }
  return { ahorrado, falta, pct, porQuincena, quincenas, lista: falta === 0 };
}

// ---------- Utilidades ----------
export function hashMov(m) {
  const s = [m.fecha, m.monto, (m.desc || '').trim().toLowerCase(), m.tipo, m.cuentaNombre || m.cuentaId || ''].join('|');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
