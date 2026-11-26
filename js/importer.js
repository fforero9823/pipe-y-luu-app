// importer.js — Lee el Excel de presupuesto de Luu TAL CUAL y lo convierte a datos de la app.
//
// Paso 1 (leerLibro): abre el archivo con la librería SheetJS y lo pasa a una forma simple:
//   { hojas: [ { nombre, filas: [ [ {v, f, w}, ... ], ... ] } ] }
// Paso 2 (analizar): busca movimientos, cuentas, saldos iniciales, presupuesto y deudas.
// Paso 3 (construirOperaciones): arma la lista de cosas a guardar según lo que respondieron.

import { hashMov, leerPesos, uid } from './calc.js';

const SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

// ---------------- Paso 1 ----------------
export async function leerLibro(file) {
  const XLSX = await import(SHEETJS);
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellFormula: true, cellDates: false, cellNF: true });
  const hojas = wb.SheetNames.map((nombre) => {
    const ws = wb.Sheets[nombre];
    const filas = [];
    if (ws['!ref']) {
      const r = XLSX.utils.decode_range(ws['!ref']);
      const maxR = Math.min(r.e.r, 20000), maxC = Math.min(r.e.c, 60);
      for (let R = 0; R <= maxR; R++) {
        const fila = [];
        for (let Cc = 0; Cc <= maxC; Cc++) {
          const cel = ws[XLSX.utils.encode_cell({ r: R, c: Cc })];
          fila.push(cel ? { v: cel.v, f: cel.f || null, w: cel.w || null, t: cel.t, z: cel.z || null } : null);
        }
        filas.push(fila);
      }
    }
    return { nombre, filas };
  });
  return { hojas };
}

// ---------------- utilidades ----------------
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const valor = (c) => (c ? c.v : null);
const texto = (c) => (c == null || c.v == null ? '' : String(c.v).trim());

function numero(c) {
  if (!c) return 0;
  if (typeof c.v === 'number') return c.v;
  if (c.v == null || c.v === '') return c.f ? evaluarSuma(c.f) : 0;
  return leerPesos(c.v);
}
// "=60000+41514" → 101514 (solo sumas y restas de números)
export function evaluarSuma(f) {
  const s = String(f || '').replace(/^=/, '').replace(/\s/g, '');
  if (!/^[-+]?[\d.]+([-+][\d.]+)*$/.test(s)) return 0;
  return (s.match(/[-+]?[\d.]+/g) || []).reduce((t, x) => t + parseFloat(x), 0);
}
// "=150000+2500.50+SUMIFS(...)" → 152500.5 (los números "quemados" al principio)
export function constantesIniciales(f) {
  const s = String(f || '').replace(/^=/, '').replace(/\s/g, '');
  let total = 0, m;
  const re = /^([-+]?[\d.]+)(?=[-+])/;
  let resto = s;
  while ((m = resto.match(re))) {
    total += parseFloat(m[1]);
    resto = resto.slice(m[1].length);
    if (resto[0] === '+') resto = resto.slice(1);
    else if (resto[0] !== '-') break;
  }
  return total;
}

function fechaDeExcel(serial) {
  const ms = Math.round((serial - 25569) * 864e5); // 25569 = días entre 1899-12-30 y 1970-01-01
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function fechaDeTexto(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); // dd/mm/aaaa (Colombia)
  if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return null;
}
function leerFecha(c) {
  if (!c || c.v == null || c.v === '') return null;
  if (typeof c.v === 'number' && c.v > 20000 && c.v < 80000) return fechaDeExcel(c.v);
  if (c.v instanceof Date) return fechaDeExcel(c.v.getTime() / 864e5 + 25569);
  return fechaDeTexto(c.v) || fechaDeTexto(c.w);
}

function duenoDe(nombre) {
  const n = norm(nombre);
  if (/\bluu\b/.test(n) || n.includes('luu')) return 'luu';
  if (/\bpipe\b/.test(n) || n.includes('pipe')) return 'pipe';
  return 'conjunto';
}
const colLetra = (i) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function buscarEncabezado(hoja, requeridos, maxFilas = 6) {
  for (let r = 0; r < Math.min(hoja.filas.length, maxFilas); r++) {
    const fila = hoja.filas[r] || [];
    const mapa = {};
    fila.forEach((c, i) => { const n = norm(texto(c)); if (n && !(n in mapa)) mapa[n] = i; });
    if (requeridos.every((k) => k in mapa)) return { fila: r, mapa };
  }
  return null;
}

// ---------------- Paso 2 ----------------
export function analizar(libro, ctx) {
  const datos = ctx.datos || {};
  const espaciosApp = datos.espacios || [];
  const catsApp = new Set((datos.ajustes?.categorias || []).map(norm));
  const espPorNombre = Object.fromEntries(espaciosApp.map((x) => [norm(x.nombre), x.id]));
  const hashesExistentes = new Set((datos.movimientos || []).map((m) => m.hashImport || hashMov({ ...m, cuentaNombre: '' })));

  // --- 2.1 Movimientos ---
  let hojaMov = libro.hojas.find((h) => norm(h.nombre) === 'gastos e ingresos');
  let enc = hojaMov && buscarEncabezado(hojaMov, ['monto']);
  if (!enc) {
    for (const h of libro.hojas) { const x = buscarEncabezado(h, ['monto', 'tipo']); if (x) { hojaMov = h; enc = x; break; } }
  }
  const movimientos = [];
  const nombresCuentas = new Set();
  const conteoCat = {};
  let duplicados = 0;
  if (enc) {
    const col = (fila, ...nombres) => { for (const n of nombres) if (n in enc.mapa) return fila[enc.mapa[n]]; return null; };
    for (let r = enc.fila + 1; r < hojaMov.filas.length; r++) {
      const f = hojaMov.filas[r] || [];
      const monto = Math.round(Math.abs(numero(col(f, 'monto'))));
      if (!monto) continue;
      let fecha = leerFecha(col(f, 'fecha'));
      if (!fecha) {
        const d = numero(col(f, 'dia')), m = numero(col(f, 'mes')), a = numero(col(f, 'ano', 'año'));
        if (d && m && a) fecha = `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      if (!fecha) fecha = leerFecha(col(f, 'marca temporal'));
      if (!fecha) continue;
      const tipoRaw = norm(texto(col(f, 'tipo')));
      const categoria = texto(col(f, 'categoria'));
      const grupo = texto(col(f, 'grupo'));
      const origen = texto(col(f, 'cuenta origen', 'cuenta'));
      const destino = texto(col(f, 'cuenta destino'));
      const divRaw = norm(texto(col(f, 'division')));
      const pPipe = numero(col(f, 'pipe')), pLuu = numero(col(f, 'luu'));
      const desc = texto(col(f, 'descripcion'));
      if (origen) nombresCuentas.add(origen);
      if (destino) nombresCuentas.add(destino);

      let tipo = tipoRaw.startsWith('ingres') ? 'ingreso' : 'gasto';
      const catN = norm(categoria);
      if (tipo === 'gasto' && destino && (catN === 'transferencia' || catN === 'ahorro' || tipoRaw.startsWith('transf'))) tipo = 'transferencia';

      // ¿Quién pagó? 1) columnas Pipe/Luu  2) nombre de la cuenta  3) "Solo X"
      let pagador = null;
      if (pPipe && !pLuu) pagador = 'pipe'; else if (pLuu && !pPipe) pagador = 'luu'; else if (pPipe && pLuu) pagador = pPipe >= pLuu ? 'pipe' : 'luu';
      if (!pagador && origen) { const d = duenoDe(origen); if (d !== 'conjunto') pagador = d; }
      if (!pagador && divRaw.includes('pipe')) pagador = 'pipe';
      if (!pagador && divRaw.includes('luu')) pagador = 'luu';
      if (!pagador) pagador = ctx.yo || 'pipe';

      let division = { pipe: 50, luu: 50 };
      if (divRaw.includes('solo pipe') || divRaw === 'pipe') division = { pipe: 100, luu: 0 };
      else if (divRaw.includes('solo luu') || divRaw === 'luu') division = { pipe: 0, luu: 100 };

      // Espacio
      const grupoN = norm(grupo);
      let espacioId = espPorNombre[grupoN] || espPorNombre[catN] || 'casa'; // "Casita" = Casa

      let cat = categoria || 'Otros';
      if (espPorNombre[catN]) cat = tipo === 'ingreso' ? (espaciosApp.find((x) => x.id === espPorNombre[catN])?.tipo === 'negocio' ? 'Ventas' : 'Otros ingresos') : 'Otros';
      if (tipo === 'ingreso' && /^salario/.test(catN)) cat = 'Salario';
      if (tipo === 'transferencia') cat = 'Transferencia';
      conteoCat[catN] = (conteoCat[catN] || 0) + 1;

      const mov = { tipo, monto, fecha, desc, categoria: cat, categoriaOriginal: categoria, espacioId, pagador, division, cuentaNombre: origen, cuentaDestinoNombre: destino, importado: true };
      mov.hashImport = hashMov(mov);
      if (hashesExistentes.has(mov.hashImport)) { duplicados++; continue; }
      movimientos.push(mov);
    }
  }

  // --- 2.2 Saldos iniciales "escondidos" en las fórmulas ---
  // Busca celdas con SUMIFS(...Cuenta origen...) y toma el nombre de la cuenta de la celda de la izquierda.
  const saldos = {}; // nombre → { valor, prioridad }
  for (const h of libro.hojas) {
    const n = norm(h.nombre);
    const prioridad = n === 'pipe' || n === 'luu' ? 2 : 1; // las hojas personales están más al día
    h.filas.forEach((fila, r) => (fila || []).forEach((c, i) => {
      if (!c || !c.f || !/sumifs/i.test(c.f) || i < 1) return;
      // La fórmula debe filtrar por la cuenta escrita en la celda de la izquierda: [Cuenta origen],A8
      const re = new RegExp('cuenta origen\\]\\s*,\\s*\\$?' + colLetra(i - 1) + '\\$?' + (r + 1) + '(?!\\d)', 'i');
      if (!re.test(c.f)) return;
      const etiqueta = texto(fila[i - 1]);
      if (!etiqueta || /^(total|disponible|gastos?|ingresos?)\b/i.test(etiqueta)) return;
      nombresCuentas.add(etiqueta);
      if (/\[mes\]/i.test(c.f)) return; // fórmula del mes: solo nos dice que la cuenta existe
      const v = constantesIniciales(c.f);
      const prev = saldos[etiqueta];
      if (!prev || prioridad > prev.prioridad) saldos[etiqueta] = { valor: Math.round(v), prioridad };
      nombresCuentas.add(etiqueta);
    }));
  }

  // --- 2.3 Presupuesto mensual y deudas ---
  const presupuestos = {};
  const creditos = [];
  const hojaPres = libro.hojas.find((h) => norm(h.nombre).startsWith('presupuesto'));
  const encP = hojaPres && buscarEncabezado(hojaPres, ['categoria', 'presupuestado']);
  if (encP) {
    for (let r = encP.fila + 1; r < hojaPres.filas.length; r++) {
      const f = hojaPres.filas[r] || [];
      const cat = texto(f[encP.mapa['categoria']]);
      if (!cat) continue;
      const desc = 'descripcion' in encP.mapa ? texto(f[encP.mapa['descripcion']]) : '';
      const monto = Math.round(numero(f[encP.mapa['presupuestado']]));
      const paga = 'paga' in encP.mapa ? norm(texto(f[encP.mapa['paga']])) : '';
      const origen = 'origen' in encP.mapa ? texto(f[encP.mapa['origen']]) : '';
      if (origen) nombresCuentas.add(origen);
      if (!monto) continue;
      if (norm(cat) === 'deudas') {
        const responsable = paga.includes('pipe') && paga.includes('luu') ? 'conjunto' : paga.includes('luu') ? 'luu' : paga.includes('pipe') ? 'pipe' : 'conjunto';
        const plazos = desc.match(/(\d+)\s*\/\s*(\d+)/);
        const nombre = desc.replace(/\s*\d+\s*\/\s*\d+\s*/, '').trim() || 'Deuda';
        creditos.push({
          nombre, cuota: monto, responsable,
          tipo: plazos ? 'plazos' : 'fija',
          plazo: plazos ? Number(plazos[2]) : 0,
          cuotasPagadasInicial: plazos ? Math.max(0, Number(plazos[1]) - 1) : 0,
          montoInicial: plazos ? monto * Number(plazos[2]) : 0,
          diaPago: 1, tasaMensual: 0,
          espacioId: espPorNombre[norm(nombre)] || 'casa',
        });
      } else {
        presupuestos[cat] = (presupuestos[cat] || 0) + monto;
        conteoCat[norm(cat)] = conteoCat[norm(cat)] || 0;
      }
    }
  }

  // --- 2.4 Cuentas ---
  const cuentasApp = datos.cuentas || [];
  const cuentas = [...nombresCuentas].filter(Boolean).map((nombre) => {
    const existe = cuentasApp.find((c) => norm(c.nombre) === norm(nombre));
    return {
      nombre, dueno: existe?.dueno || duenoDe(nombre),
      tipo: existe?.tipo || (/rappicard|\btc\b|tarjeta|visa|master|amex|cr[eé]dito/i.test(nombre) ? 'tarjeta' : 'normal'),
      saldoInicial: saldos[nombre]?.valor || 0,
      id: existe?.id || 'imp-' + slug(nombre),
      existe: Boolean(existe),
    };
  }).sort((a, b) => a.dueno.localeCompare(b.dueno) || a.nombre.localeCompare(b.nombre));

  // --- 2.5 Categorías nuevas ---
  const todas = new Set();
  for (const m of movimientos) if (m.tipo === 'gasto') todas.add(m.categoria);
  for (const c of Object.keys(presupuestos)) todas.add(c);
  const categoriasNuevas = [...todas].filter((c) => c && !catsApp.has(norm(c)) && !espPorNombre[norm(c)]);

  // --- 2.6 Preguntas (solo si aplican) ---
  const preguntas = [];
  const cuenta = (...cats) => movimientos.filter((m) => cats.includes(norm(m.categoriaOriginal))).length + cats.filter((c) => Object.keys(presupuestos).some((p) => norm(p) === c)).length;
  const nMat = cuenta('huerta', 'flores');
  if (nMat && espPorNombre['matitas']) preguntas.push({ id: 'matitas', texto: `«Huerta» y «Flores»: ¿van al espacio Matitas?`, sugerida: true });
  const nGas = movimientos.filter((m) => norm(m.categoriaOriginal) === 'gasolina').length;
  if (nGas && espPorNombre['neru']) preguntas.push({ id: 'gasolina', texto: `«Gasolina» (${nGas} ${nGas === 1 ? 'movimiento' : 'movimientos'}): ¿la cuento dentro de Neru?`, sugerida: true });
  const sinPagador = movimientos.filter((m) => !m.cuentaNombre).length;
  if (sinPagador) preguntas.push({ id: 'info-pagador', texto: `${sinPagador} movimientos no dicen de qué cuenta salieron. Los asigno a quien está importando, ¿está bien?`, sugerida: true });

  const fechas = movimientos.map((m) => m.fecha).sort();
  return {
    hojas: libro.hojas.length,
    movimientos, duplicados, cuentas, presupuestos, creditos, categoriasNuevas, preguntas,
    rango: [fechas[0], fechas[fechas.length - 1]],
  };
}

// ---------------- Paso 3 ----------------
export function construirOperaciones(res, respuestas, opts = {}) {
  const datos = opts.datos || {};
  const lote = [];
  const idPorNombre = {};
  let nCuentas = 0;
  for (const c of res.cuentas) {
    idPorNombre[norm(c.nombre)] = c.id;
    if (c.existe) {
      if (opts.usarSaldos && c.saldoInicial) { lote.push({ col: 'cuentas', obj: { id: c.id, saldoInicial: c.saldoInicial } }); nCuentas++; }
    } else {
      lote.push({ col: 'cuentas', obj: { id: c.id, nombre: c.nombre, dueno: c.dueno, tipo: c.tipo, saldoInicial: opts.usarSaldos ? c.saldoInicial : 0, orden: 50 } });
      nCuentas++;
    }
  }
  const nombresCred = new Set((datos.creditos || []).map((c) => norm(c.nombre)));
  let nCred = 0;
  for (const cr of res.creditos) {
    if (nombresCred.has(norm(cr.nombre))) continue;
    lote.push({ col: 'creditos', obj: { ...cr, id: 'imp-' + slug(cr.nombre) } });
    nCred++;
  }
  let nMov = 0;
  for (const m of res.movimientos) {
    const o = norm(m.categoriaOriginal);
    let espacioId = m.espacioId;
    if (respuestas.matitas && (o === 'huerta' || o === 'flores')) espacioId = 'matitas';
    if (respuestas.gasolina && o === 'gasolina') espacioId = 'neru';
    const obj = {
      id: 'imp-' + m.hashImport + '-' + uid().slice(-4),
      tipo: m.tipo, monto: m.monto, fecha: m.fecha, desc: m.desc, categoria: m.categoria, espacioId,
      pagador: m.pagador, division: m.division,
      cuentaId: m.cuentaNombre ? idPorNombre[norm(m.cuentaNombre)] || null : null,
      cuentaDestinoId: m.cuentaDestinoNombre ? idPorNombre[norm(m.cuentaDestinoNombre)] || null : null,
      importado: true, hashImport: m.hashImport,
    };
    lote.push({ col: 'movimientos', obj });
    nMov++;
  }
  const aj = datos.ajustes || {};
  const categorias = [...(aj.categorias || [])];
  for (const c of res.categoriasNuevas) if (!categorias.some((x) => norm(x) === norm(c))) categorias.splice(Math.max(0, categorias.length - 3), 0, c);
  const presupuestos = { ...(aj.presupuestos || {}) };
  for (const [k, v] of Object.entries(res.presupuestos)) if (!presupuestos[k]) presupuestos[k] = v;
  return {
    lote,
    ajustes: { categorias, presupuestos },
    resumen: { movimientos: nMov, cuentas: nCuentas, creditos: nCred, presupuestos: Object.keys(res.presupuestos).length },
  };
}
