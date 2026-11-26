// app.js — Las pantallas. Cada pantalla es una función que devuelve HTML.
// Cuando algo cambia (un gasto nuevo, el otro registró algo), se vuelve a dibujar.

import * as C from './calc.js';
import { crearStore, hayNube } from './store.js';
import { CONFIG } from './config.js';
import { CATEGORIAS_RAPIDAS } from './defaults.js';
import { I, iconoMov } from './iconos.js';

const store = crearStore();
window.__store = store; // útil para revisar en la consola

// ---------------- utilidades ----------------
const $ = (s, r = document) => r.querySelector(s);
const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = (p) => (p === 'conjunto' ? 'Los dos' : CONFIG.personas[p]?.nombre || p || '');
const otro = (p) => (p === 'pipe' ? 'luu' : 'pipe');
const ls = {
  get(k, d = null) { try { const v = localStorage.getItem('pyl:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pyl:' + k, JSON.stringify(v)); } catch {} },
};
const D = () => store.datos;
const cuenta = (id) => D().cuentas.find((c) => c.id === id);
const espacio = (id) => D().espacios.find((x) => x.id === id);
const espaciosHogar = () => new Set(D().espacios.filter((x) => x.tipo !== 'negocio').map((x) => x.id));
const temaOscuro = () => document.documentElement.dataset.theme === 'dark';

let vistoAntes = 0; // para marcar lo nuevo que registró el otro

const estado = {
  mesMov: C.mesActual(),
  mesEsp: C.mesActual(),
  filtroEsp: 'todos',
  busqueda: '',
  hoja: null,
  F: {},
  confirmar: null,
  importacion: null,
};

// ---------------- tema ----------------
function aplicarTema() {
  const t = ls.get('tema', 'auto');
  const oscuro = t === 'oscuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = oscuro ? '#14130F' : '#EFEDE7';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', aplicarTema);

// ---------------- toast ----------------
let toastT;
function toast(msg, accion) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<span>${e(msg)}</span>` + (accion ? `<button type="button">${e(accion.texto)}</button>` : '');
  if (accion) t.querySelector('button').onclick = () => { accion.fn(); t.classList.remove('ver'); };
  requestAnimationFrame(() => t.classList.add('ver'));
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('ver'), accion ? 5000 : 2600);
}

// ---------------- piezas reutilizables ----------------
function logoEspacio(x, claro = false, w = 20) {
  if (!x) return I.punto(w);
  if (x.icono === 'logo' && x.logo) return `<img src="${e(claro && x.logoClaro ? x.logoClaro : x.logo)}" alt="" width="${w}" height="${w}">`;
  return (I[x.icono] || I.punto)(w);
}
function tileEspacio(x, size = 48) {
  const bg = x.marca ? x.marca.claro : 'var(--chip)';
  return `<span class="logo" style="background:${e(bg)};width:${size}px;height:${size}px">${logoEspacio(x, false, Math.round(size * 0.62))}</span>`;
}

function filaMov(m, opts = {}) {
  const c = cuenta(m.cuentaId);
  const esp = espacio(m.espacioId);
  const quien = m.tipo === 'ingreso' ? `cobró ${N(m.pagador)}` : N(m.pagador);
  let meta;
  if (m.tipo === 'transferencia') meta = `${c ? c.nombre : '¿?'} → ${cuenta(m.cuentaDestinoId)?.nombre || '¿?'}`;
  else if (m.tipo === 'saldo') meta = `${N(m.pagador)} le pagó a ${N(otro(m.pagador))}`;
  else {
    const div = m.division ? (m.division.pipe === 50 ? '50/50' : m.division.pipe === 100 ? 'solo ' + N('pipe') : m.division.pipe === 0 ? 'solo ' + N('luu') : `${m.division.pipe}/${m.division.luu}`) : '';
    meta = [quien, opts.cuando || C.fechaCorta(m.fecha), div, esp && esp.id !== 'casa' && !opts.sinEspacio ? esp.nombre : ''].filter(Boolean).join(' · ');
  }
  const signo = m.tipo === 'ingreso' ? '+' : m.tipo === 'gasto' ? '−' : '';
  const clase = m.tipo === 'ingreso' ? 'entra' : m.tipo === 'gasto' ? '' : 'neutro';
  const nuevo = opts.marcarNuevos && m.creadoPor && m.creadoPor !== store.yo && (m.creadoEn || 0) > vistoAntes;
  const titulo = m.desc || m.categoria || (m.tipo === 'transferencia' ? 'Movimiento entre cuentas' : 'Sin descripción');
  return `<button type="button" class="mov" data-a="editarMov" data-id="${e(m.id)}">
    <span class="ico">${iconoMov(m)}${nuevo ? '<i class="nuevo-punto" aria-label="nuevo"></i>' : ''}</span>
    <span class="txt"><b>${e(titulo)}</b><span>${e(meta)}</span></span>
    <span class="val ${clase}">${signo}${e(C.pesos(m.monto))}</span>
  </button>`;
}

function nav(ruta) {
  const it = (r, icono, txt) => `<a href="#/${r}" class="${ruta === r ? 'on' : ''}" aria-label="${txt}">${icono}<span>${txt}</span></a>`;
  return `<nav class="nav" aria-label="Principal"><div class="in">
    ${it('inicio', I.casa(22), 'Inicio')}
    ${it('espacios', I.espacios(22), 'Espacios')}
    <button class="mas" data-a="nuevoMov" aria-label="Registrar">${I.mas(24)}</button>
    ${it('metas', I.meta(22), 'Metas')}
    ${it('creditos', I.tarjeta(22), 'Créditos')}
  </div></nav>`;
}

function botonTema() {
  return `<button class="btn-icono" data-a="tema" aria-label="${temaOscuro() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}">${temaOscuro() ? I.sol() : I.luna()}</button>`;
}

function deudaGlobal(filtro = () => true) {
  return C.textoDeuda(C.saldoEntreDos(D().movimientos.filter(filtro)), store.yo, { pipe: N('pipe'), luu: N('luu') });
}

function tarjetaEntre(d, espacioId) {
  return `<div class="tarjeta tarjeta-fila entre">
    <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
      <span class="etiqueta">Entre nosotros</span>
      ${d.claro ? `<span style="font-size:16px;font-weight:500">Cuentas claras ✓</span>`
        : `<span style="font-size:16px;font-weight:500">${e(d.texto)} <span class="monto num">${C.pesos(d.monto)}</span></span>`}
    </div>
    ${d.claro ? '' : `<button class="btn" data-a="saldar" data-esp="${e(espacioId || '')}">Saldar</button>`}
  </div>`;
}

// ================= PANTALLAS =================

function vInicio() {
  const mes = C.mesActual();
  const hogar = espaciosHogar();
  const r = C.resumenMes(D().movimientos, mes, (m) => hogar.has(m.espacioId || 'casa'));
  const pres = D().ajustes?.presupuestos || {};
  const totalPres = Object.values(pres).reduce((s, v) => s + (Number(v) || 0), 0);
  const pct = totalPres ? Math.round((r.gastos / totalPres) * 100) : 0;
  const deuda = deudaGlobal();
  const recientes = [...D().movimientos].sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0)).slice(0, 8);

  // Pagos que vencen pronto
  const proximos = D().creditos.map((cr) => ({ cr, st: C.estadoCredito(cr, D().movimientos) }))
    .filter(({ st }) => !st.terminado && !st.pagadaEsteMes && st.diasFaltan <= 7)
    .sort((a, b) => a.st.diasFaltan - b.st.diasFaltan);

  // Top categorías con presupuesto
  const cats = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return `<main class="vista">
    <div class="top">
      <div class="titulo"><span class="eyebrow">${e(C.nombreMes(mes))}</span><span class="h1">Hola, ${e(N(store.yo))}</span></div>
      <div style="display:flex;align-items:center;gap:10px">${botonTema()}
        <a href="#/mas" class="avatares" aria-label="Ajustes"><span class="avatar pipe">${e(N('pipe')[0])}</span><span class="avatar luu">${e(N('luu')[0])}</span></a></div>
    </div>

    <section class="cifra" aria-label="Gastado este mes">
      <span class="eyebrow">Gastado este mes</span>
      <span class="valor num">${C.pesos(r.gastos)}</span>
      ${totalPres ? `<div class="barra ${pct > 100 ? 'pasada' : ''}"><i style="width:${Math.min(100, pct)}%"></i></div>
        <div class="fila-sub"><span>${pct}% del presupuesto</span><span class="num">${r.gastos <= totalPres ? 'Quedan ' + C.pesos(totalPres - r.gastos) : 'Pasados ' + C.pesos(r.gastos - totalPres)}</span></div>`
        : `<div class="fila-sub" style="margin-top:6px"><span>Ingresos ${C.pesos(r.ingresos)}</span><button class="link" data-a="presupuestos">Ponerle presupuesto →</button></div>`}
    </section>

    ${tarjetaEntre(deuda)}

    ${proximos.length ? `<div class="tarjeta" style="margin-top:12px">
      <span class="etiqueta">Pagos que vienen</span>
      ${proximos.map(({ cr, st }) => `<div class="tarjeta-fila" style="margin-top:12px">
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0"><b style="font-weight:600">${e(cr.nombre)}</b>
        <span style="font-size:12px" class="${st.diasFaltan <= 3 ? 'vence-pronto' : 'muted'}">${st.vencida ? 'Vencida hace ' + -st.diasFaltan + ' días' : st.diasFaltan === 0 ? 'Vence hoy' : 'En ' + st.diasFaltan + ' días'} · ${C.pesos(cr.cuota)}</span></div>
        <button class="btn btn-chico btn-lleno" data-a="pagarCuota" data-id="${e(cr.id)}">Pagar</button></div>`).join('')}
    </div>` : ''}

    ${cats.length ? `<div class="seccion"><h2>En qué se va</h2><button class="link" data-a="presupuestos">Presupuestos</button></div>
    <div class="lista">${cats.map(([cat, v]) => {
      const lim = Number(pres[cat]) || 0; const p = lim ? Math.round((v / lim) * 100) : 0;
      return `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
        <div class="fila-sub" style="color:var(--text);font-size:14px"><span>${e(cat)}</span><span class="num">${C.pesos(v)}${lim ? `<span class="muted"> / ${C.pesos(lim)}</span>` : ''}</span></div>
        ${lim ? `<div class="barra ${p > 100 ? 'pasada' : ''}" style="margin-top:8px"><i style="width:${Math.min(100, p)}%"></i></div>` : ''}
      </div>`;
    }).join('')}</div>` : ''}

    <div class="seccion"><h2>Actividad</h2><a href="#/movimientos">Ver todo</a></div>
    ${recientes.length ? `<div class="lista">${recientes.map((m) => filaMov(m, { marcarNuevos: true, cuando: m.creadoEn ? C.haceRato(m.creadoEn) : null })).join('')}</div>`
      : `<div class="vacio"><b>Aquí aparecerá todo lo que registren</b>Toca el botón + para anotar el primer gasto. Lo que registre ${e(N(otro(store.yo)))} también saldrá aquí.</div>`}
  </main>`;
}

function vMovimientos() {
  const mes = estado.mesMov;
  const q = estado.busqueda.trim().toLowerCase();
  const movs = D().movimientos.filter((m) => C.mesDe(m.fecha) === mes
    && (estado.filtroEsp === 'todos' || (m.espacioId || 'casa') === estado.filtroEsp)
    && (!q || `${m.desc} ${m.categoria} ${cuenta(m.cuentaId)?.nombre || ''}`.toLowerCase().includes(q)));
  const r = C.resumenMes(movs, mes);
  const porDia = {};
  for (const m of movs) (porDia[m.fecha] ||= []).push(m);
  const dias = Object.keys(porDia).sort().reverse();

  return `<main class="vista">
    <div class="top">
      <a href="#/inicio" class="btn-icono" aria-label="Volver">${I.atras()}</a>
      <span class="h1">Movimientos</span>
      <span style="width:44px"></span>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px">
      <button class="btn-icono" data-a="mes" data-d="-1" data-k="mesMov" aria-label="Mes anterior">${I.atras()}</button>
      <span style="font-weight:600">${e(C.nombreMes(mes))}</span>
      <button class="btn-icono" data-a="mes" data-d="1" data-k="mesMov" aria-label="Mes siguiente">${I.adelante()}</button>
    </div>
    <div class="grid3" style="margin-top:18px">
      <div><span class="eyebrow">Gastos</span><span class="v num">${C.pesos(r.gastos)}</span></div>
      <div><span class="eyebrow">Ingresos</span><span class="v num">${C.pesos(r.ingresos)}</span></div>
      <div><span class="eyebrow">Balance</span><span class="v num">${C.pesos(r.balance)}</span></div>
    </div>
    <div style="margin-top:20px;position:relative">
      <span style="position:absolute;left:14px;top:15px;color:var(--muted)">${I.buscar()}</span>
      <input class="input" style="padding-left:42px" type="search" placeholder="Buscar" value="${e(estado.busqueda)}" data-buscar aria-label="Buscar movimientos">
    </div>
    <div class="scroll-x" style="margin-top:12px">
      ${[{ id: 'todos', nombre: 'Todos' }, ...D().espacios].map((x) => `<button class="chip ${estado.filtroEsp === x.id ? 'on' : ''}" data-a="filtroEsp" data-id="${e(x.id)}">${e(x.nombre)}</button>`).join('')}
    </div>
    ${dias.length ? dias.map((d) => {
      const tot = porDia[d].filter(C.esGastoReal).reduce((s, m) => s + m.monto, 0);
      return `<div class="dia"><span>${e(C.fechaCorta(d))}</span><span class="num">${tot ? C.pesos(tot) : ''}</span></div>
      <div class="lista">${porDia[d].map((m) => filaMov(m)).join('')}</div>`;
    }).join('') : `<div class="vacio"><b>Nada por aquí</b>No hay movimientos ${q ? 'que coincidan' : 'en este mes'}.</div>`}
  </main>`;
}

function vEspacios() {
  const mes = C.mesActual();
  return `<main class="vista">
    <div class="top"><div class="titulo"><span class="eyebrow">${e(C.nombreMes(mes))}</span><span class="h-grande">Espacios</span></div>${botonTema()}</div>
    <p class="muted" style="margin:6px 0 22px;font-size:14px;line-height:1.45">Cada espacio lleva sus cuentas aparte y sabe quién le debe a quién.</p>
    ${D().espacios.map((x) => {
      const movs = D().movimientos.filter((m) => (m.espacioId || 'casa') === x.id);
      const r = C.resumenMes(movs, mes);
      const d = C.textoDeuda(C.saldoEntreDos(movs), store.yo, { pipe: N('pipe'), luu: N('luu') });
      const neg = x.tipo === 'negocio';
      const valor = neg ? r.ingresos - r.gastos : r.gastos;
      return `<a class="tarjeta esp" href="#/espacio/${e(x.id)}">
        ${tileEspacio(x)}
        <span class="txt"><b>${e(x.nombre)}</b><span>${e(x.desc || '')}${neg ? ' · ganancia' : ''}</span></span>
        <span class="der"><b class="${neg && valor > 0 ? 'ganancia' : ''}">${neg && valor > 0 ? '+' : ''}${C.pesos(valor)}</b><span>${e(d.claro ? 'Cuentas claras' : d.texto + ' ' + C.pesos(d.monto))}</span></span>
      </a>`;
    }).join('')}
    <button class="btn-linea" style="margin-top:14px" data-a="nuevoEspacio">+ Nuevo espacio</button>
  </main>`;
}

function vEspacio(id) {
  const x = espacio(id);
  if (!x) return `<main class="vista"><div class="vacio"><b>Ese espacio no existe</b><a href="#/espacios">Volver</a></div></main>`;
  const mes = estado.mesEsp;
  const todos = D().movimientos.filter((m) => (m.espacioId || 'casa') === id);
  const delMes = todos.filter((m) => C.mesDe(m.fecha) === mes);
  const r = C.resumenMes(todos, mes);
  const neg = x.tipo === 'negocio';
  const d = C.textoDeuda(C.saldoEntreDos(todos), store.yo, { pipe: N('pipe'), luu: N('luu') });
  const ganancia = r.ingresos - r.gastos;
  const m = x.marca;
  const heroStyle = m ? `background:${m.fondo};color:${m.texto}` : '';
  const selMes = `<div style="display:flex;align-items:center;gap:4px">
      <button class="btn-icono" data-a="mes" data-d="-1" data-k="mesEsp" aria-label="Mes anterior" style="${m ? 'border-color:rgba(255,255,255,.22);color:inherit' : ''}">${I.atras()}</button>
      <button class="btn-icono" data-a="mes" data-d="1" data-k="mesEsp" aria-label="Mes siguiente" style="${m ? 'border-color:rgba(255,255,255,.22);color:inherit' : ''}">${I.adelante()}</button></div>`;
  const cats = Object.entries(r.porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return `<main class="vista">
    <div class="${m ? 'marca-hero' : ''}" style="${heroStyle}">
      <div class="top">
        <a href="#/espacios" class="btn-icono" aria-label="Volver a espacios">${I.atras()}</a>
        <span style="display:flex;align-items:center;justify-content:center">${m ? logoEspacio(x, true, 44) : ''}</span>
        ${selMes}
      </div>
      <div class="cifra" style="margin-top:18px">
        <span class="${m ? 'sub' : 'eyebrow'}">${e(x.nombre)} · ${neg ? 'ganancia de ' : 'gastado en '}${e(C.nombreMes(mes).toLowerCase())}</span>
        <span class="valor mediano num" style="${m ? `color:${m.acento}` : ''}">${neg ? (ganancia > 0 ? '+' : '') + C.pesos(ganancia) : C.pesos(r.gastos)}</span>
      </div>
      ${neg ? `<div class="grid3" style="${m ? '' : ''}">
        <div><span class="${m ? 'sub' : 'eyebrow'}">Ventas</span><span class="v num">${C.pesos(r.ingresos)}</span></div>
        <div><span class="${m ? 'sub' : 'eyebrow'}">Costos</span><span class="v num">${C.pesos(r.gastos)}</span></div>
        <div><span class="${m ? 'sub' : 'eyebrow'}">Margen</span><span class="v">${r.ingresos ? Math.round((ganancia / r.ingresos) * 100) + '%' : '—'}</span></div>
      </div>` : ''}
    </div>

    ${neg && ganancia > 0 ? `<div class="tarjeta tarjeta-fila" style="margin-top:18px"><div style="display:flex;flex-direction:column;gap:3px"><span class="etiqueta">Si se reparte 50/50</span><span style="font-size:15px">${C.pesos(Math.round(ganancia / 2))} para cada uno</span></div></div>` : ''}
    ${tarjetaEntre(d, id)}

    ${!neg && cats.length ? `<div class="seccion"><h2>Por categoría</h2></div><div class="lista">${cats.map(([c, v]) => `<div class="fila-sub" style="color:var(--text);font-size:14px;padding:10px 0;border-bottom:1px solid var(--line)"><span>${e(c)}</span><span class="num">${C.pesos(v)}</span></div>`).join('')}</div>` : ''}

    <div class="seccion"><h2>Movimientos</h2><span class="muted" style="font-size:13px">${e(C.nombreMes(mes))}</span></div>
    ${delMes.length ? `<div class="lista">${delMes.map((mv) => filaMov(mv, { sinEspacio: true })).join('')}</div>` : `<div class="vacio">Sin movimientos este mes.</div>`}

    <div class="chips c2" style="margin-top:22px">
      ${neg ? `<button class="btn-primario" data-a="nuevoMov" data-tipo="ingreso" data-esp="${e(id)}" style="${m ? `background:${m.fondo};color:${m.texto}` : ''}">+ Venta</button>
      <button class="btn" style="height:56px;border-radius:28px" data-a="nuevoMov" data-tipo="gasto" data-esp="${e(id)}">+ Costo</button>`
      : `<button class="btn-primario" data-a="nuevoMov" data-tipo="gasto" data-esp="${e(id)}">+ Gasto</button>
      <button class="btn" style="height:56px;border-radius:28px" data-a="editarEspacio" data-id="${e(id)}">Editar espacio</button>`}
    </div>
  </main>`;
}

function vMetas() {
  const metas = D().metas;
  const est = metas.map((mt) => ({ mt, st: C.estadoMeta(mt, D().movimientos) }));
  const total = est.reduce((s, x) => s + x.st.ahorrado, 0);
  const obj = metas.reduce((s, x) => s + (x.objetivo || 0), 0);
  return `<main class="vista">
    <div class="top"><span class="h-grande">Metas</span><button class="btn-icono" data-a="nuevaMeta" aria-label="Nueva meta">${I.mas(18)}</button></div>
    ${metas.length ? `<section class="cifra" style="margin-top:20px"><span class="eyebrow">Ahorrado entre ${metas.length === 1 ? 'la meta' : 'las ' + metas.length + ' metas'}</span>
      <span class="valor mediano num">${C.pesos(total)}</span><span class="eyebrow">de ${C.pesos(obj)} · ${obj ? Math.round((total / obj) * 100) : 0}%</span></section>
    <div style="margin-top:24px">${est.map(({ mt, st }) => `<div class="tarjeta">
      <button class="meta-cab" data-a="editarMeta" data-id="${e(mt.id)}" style="background:none;border:none;padding:0;width:100%;text-align:left"><b>${e(mt.nombre)}</b><span class="muted" style="font-size:13px">${mt.fechaLimite ? e(C.nombreMes(mt.fechaLimite.slice(0, 7))) : ''}</span></button>
      <div class="meta-cab" style="margin-top:8px"><span class="cifra-m num">${C.pesos(st.ahorrado)}</span><span class="muted num" style="font-size:13px">de ${C.pesos(mt.objetivo)}</span></div>
      <div class="barra" style="margin-top:8px"><i style="width:${st.pct}%"></i></div>
      <div class="tarjeta-fila" style="margin-top:10px">
        <span class="muted" style="font-size:12px;line-height:1.35">${st.lista ? '¡Meta cumplida! 🎉' : st.porQuincena ? `Con ${C.pesos(st.porQuincena)} por quincena llegas a tiempo` : `Te faltan ${C.pesos(st.falta)}`}</span>
        ${st.lista ? '' : `<button class="btn btn-chico" data-a="aportar" data-id="${e(mt.id)}" data-monto="${st.porQuincena || ''}">+ Aportar</button>`}
      </div></div>`).join('')}</div>`
      : `<div class="vacio" style="margin-top:40px"><b>Aún no hay metas</b>Crea una para el mini-servidor, el cultivo, un viaje… La app te dice cuánto separar cada quincena.</div>
         <button class="btn-primario" data-a="nuevaMeta">Crear la primera meta</button>`}
  </main>`;
}

function vCreditos() {
  const crs = D().creditos.map((cr) => ({ cr, st: C.estadoCredito(cr, D().movimientos) }));
  const activos = crs.filter((x) => !x.st.terminado);
  const pendiente = activos.filter((x) => !x.st.pagadaEsteMes).reduce((s, x) => s + (x.cr.cuota || 0), 0);
  const pagado = activos.filter((x) => x.st.pagadaEsteMes).reduce((s, x) => s + (x.cr.cuota || 0), 0);
  const cercana = activos.filter((x) => !x.st.pagadaEsteMes).sort((a, b) => a.st.diasFaltan - b.st.diasFaltan)[0];
  return `<main class="vista">
    <div class="top"><span class="h-grande">Créditos</span><button class="btn-icono" data-a="nuevoCredito" aria-label="Nuevo crédito">${I.mas(18)}</button></div>
    ${crs.length ? `<section class="cifra" style="margin-top:20px"><span class="eyebrow">Por pagar en ${e(C.nombreMes(C.mesActual()).split(' ')[0].toLowerCase())}</span>
      <span class="valor mediano num">${C.pesos(pendiente)}</span>
      <span class="eyebrow">${pagado ? 'Ya pagaron ' + C.pesos(pagado) + ' este mes' : cercana ? `${activos.length} cuotas · la más cercana ${cercana.st.diasFaltan <= 0 ? 'es hoy o ya pasó' : 'en ' + cercana.st.diasFaltan + ' días'}` : ''}</span></section>
    <div style="margin-top:24px">${crs.map(({ cr, st }) => {
      const tasa = cr.tipo === 'banco' && cr.tasaMensual ? `${cr.tasaMensual.toFixed(2).replace('.', ',')}% M.V. ≈ ${C.mensualAEa(cr.tasaMensual).toFixed(1).replace('.', ',')}% E.A.` : cr.tipo === 'plazos' ? 'Compra a plazos · sin interés' : cr.tipo === 'fija' ? 'Pago fijo mensual' : '';
      const detalle = [tasa, st.saldo !== null && st.saldo > 0 ? 'debes ' + C.pesos(st.saldo) : '', st.plazo ? `cuota ${Math.min(st.pagadas, st.plazo)} de ${st.plazo}` : ''].filter(Boolean).join(' · ');
      const ticks = st.plazo && st.plazo <= 60 ? `<div class="ticks" style="grid-template-columns:repeat(${st.plazo},minmax(0,1fr))">${Array.from({ length: st.plazo }, (_, k) => `<i class="${k < st.pagadas ? 'si' : ''}"></i>`).join('')}</div>`
        : st.plazo ? `<div class="barra"><i style="width:${Math.round((st.pagadas / st.plazo) * 100)}%"></i></div>` : '';
      const venc = st.terminado ? '¡Pagado por completo! 🎉' : st.pagadaEsteMes ? 'Pagada este mes ✓' : st.vencida ? `Venció hace ${-st.diasFaltan} días` : st.diasFaltan === 0 ? 'Vence hoy' : `Vence el ${C.fechaCorta(st.proxima)} · en ${st.diasFaltan} días`;
      return `<div class="tarjeta">
        <button class="meta-cab" data-a="editarCredito" data-id="${e(cr.id)}" style="background:none;border:none;padding:0;width:100%;text-align:left"><b>${e(cr.nombre)}</b><span class="muted" style="font-size:12px">${e(N(cr.responsable))}</span></button>
        <div class="muted" style="font-size:12px;margin-top:6px">${e(detalle)}</div>
        ${ticks}
        <div class="tarjeta-fila" style="margin-top:8px">
          <div style="display:flex;flex-direction:column;gap:1px"><span class="num" style="font-size:18px;font-weight:600;letter-spacing:-.02em">${C.pesos(cr.cuota)}</span>
          <span style="font-size:12px" class="${!st.pagadaEsteMes && !st.terminado && st.diasFaltan <= 5 ? 'vence-pronto' : 'muted'}">${e(venc)}</span></div>
          ${st.terminado || st.pagadaEsteMes ? '' : `<button class="btn btn-chico btn-lleno" data-a="pagarCuota" data-id="${e(cr.id)}">Pagar cuota</button>`}
        </div></div>`;
    }).join('')}</div>`
      : `<div class="vacio" style="margin-top:40px"><b>Sin créditos registrados</b>Agrega préstamos del banco, compras a plazos o pagos fijos como la cuota de Neru. La app les avisa antes de que venzan.</div>
         <button class="btn-primario" data-a="nuevoCredito">Agregar un crédito</button>`}
  </main>`;
}

function vMas() {
  const saldos = D().cuentas.filter((c) => !c.archivada).map((c) => ({ c, s: C.saldoCuenta(c, D().movimientos) }));
  const total = (p) => saldos.filter((x) => x.c.dueno === p).reduce((s, x) => s + x.s, 0);
  const tema = ls.get('tema', 'auto');
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<main class="vista">
    <div class="top"><a href="#/inicio" class="btn-icono" aria-label="Volver">${I.atras()}</a><span class="h1">Ajustes</span><span style="width:44px"></span></div>

    <div class="tarjeta" style="margin-top:18px">
      <div class="tarjeta-fila"><div style="display:flex;align-items:center;gap:12px"><span class="avatar ${store.yo}" style="margin:0">${e(N(store.yo)[0])}</span>
      <div style="display:flex;flex-direction:column"><b>${e(N(store.yo))}</b><span class="muted" style="font-size:12px">${e(store.usuario?.correo || '')}</span></div></div>
      <button class="btn btn-chico" data-a="salir">Salir</button></div>
    </div>

    <div class="seccion"><h2>Cuentas</h2><button class="link" data-a="nuevaCuenta">+ Agregar</button></div>
    <div class="grid3" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px">
      <div><span class="eyebrow">${e(N('pipe'))}</span><span class="v num">${C.pesos(total('pipe'))}</span></div>
      <div><span class="eyebrow">${e(N('luu'))}</span><span class="v num">${C.pesos(total('luu'))}</span></div>
    </div>
    <div class="lista" style="margin-top:8px">${saldos.map(({ c, s }) => `<button class="ajuste" data-a="editarCuenta" data-id="${e(c.id)}"><span class="izq"><b style="font-weight:500">${e(c.nombre)}</b><span>${e(N(c.dueno))}</span></span><span class="der num" style="color:${s < 0 ? 'var(--danger)' : 'var(--text)'}">${C.pesos(s)}</span></button>`).join('')}</div>

    <div class="seccion"><h2>Preferencias</h2></div>
    <div class="lista">
      <div class="ajuste"><span class="izq"><b style="font-weight:500">Tema</b></span>
        <div class="segmento">${[['auto', 'Auto'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([k, t]) => `<button class="${tema === k ? 'on' : ''}" data-a="setTema" data-t="${k}">${t}</button>`).join('')}</div></div>
      <button class="ajuste" data-a="presupuestos"><span class="izq"><b style="font-weight:500">Presupuestos y categorías</b><span>Cuánto quieren gastar al mes en cada cosa</span></span><span class="der">${I.adelante()}</span></button>
      <a class="ajuste" href="#/movimientos"><span class="izq"><b style="font-weight:500">Todos los movimientos</b><span>Buscar, editar, filtrar por espacio</span></span><span class="der">${I.adelante()}</span></a>
    </div>

    <div class="seccion"><h2>Datos</h2></div>
    <div class="lista">
      <a class="ajuste" href="#/importar"><span class="izq"><b style="font-weight:500">Importar desde Excel</b><span>Sube el archivo de presupuesto tal cual</span></span><span class="der">${I.subir()}</span></a>
      <button class="ajuste" data-a="exportarCSV"><span class="izq"><b style="font-weight:500">Descargar movimientos (CSV)</b><span>Para abrir en Excel o Google Sheets</span></span><span class="der">${I.bajar()}</span></button>
      <button class="ajuste" data-a="respaldo"><span class="izq"><b style="font-weight:500">Descargar copia de seguridad</b><span>Todo en un archivo .json</span></span><span class="der">${I.bajar()}</span></button>
    </div>

    ${!instalada ? `<div class="seccion"><h2>Instalar en el celular</h2></div>
    <div class="aviso">${esIOS ? 'En Safari toca el botón <b>Compartir</b> (el cuadrito con flecha) y luego <b>“Agregar a inicio”</b>.'
      : window.__instalar ? `<button class="btn btn-lleno" data-a="instalar">Instalar la app</button>` : 'En Chrome toca el menú <b>⋮</b> y luego <b>“Instalar app”</b> o <b>“Agregar a pantalla principal”</b>.'}</div>` : ''}

    <p class="ayuda" style="margin-top:30px;text-align:center">${store.modo === 'local' ? 'Modo prueba: los datos viven solo en este celular.' : 'Sincronizado con la nube · funciona sin internet'}</p>
    ${store.modo === 'local' ? `<button class="btn btn-peligro" style="width:100%;margin-top:8px" data-a="borrarTodo">Borrar los datos de prueba</button>` : ''}
  </main>`;
}

// ---------------- Login ----------------
function vLogin(info = {}) {
  const icono = `<img class="logo-app" src="icons/icon-192.png" alt="">`;
  if (store.modo === 'local') {
    return `<div class="login">${icono}<h1>Pipe &amp; Luu</h1>
      <p>Modo prueba: los datos se guardan solo en este celular. Cuando conecten Firebase, se sincronizan entre los dos.</p>
      <span class="etiqueta">¿Quién eres?</span>
      <div class="chips c2"><button class="btn-primario" data-a="soy" data-p="pipe">${e(N('pipe'))}</button><button class="btn-primario" data-a="soy" data-p="luu">${e(N('luu'))}</button></div></div>`;
  }
  if (info.verificar || store.pendienteVerificar) {
    return `<div class="login">${icono}<h1>Revisa tu correo</h1>
      <p>Te enviamos un enlace a <b>${e(store.pendienteVerificar || '')}</b> para confirmar que es tuyo. Ábrelo y luego vuelve aquí.</p>
      <button class="btn-primario" data-a="yaVerifique">Ya lo confirmé</button>
      <button class="btn" data-a="reenviar">Reenviar el correo</button>
      <button class="link" data-a="salir">Usar otra cuenta</button></div>`;
  }
  return `<div class="login">${icono}<h1>Pipe &amp; Luu</h1>
    <p>Las finanzas de los dos, en un solo lugar.</p>
    <button class="btn-google" data-a="google">${I.google()} Entrar con Google</button>
    <div class="separador">o con correo</div>
    <form data-form="login" style="display:flex;flex-direction:column;gap:10px">
      <input class="input" type="email" name="correo" placeholder="Correo" autocomplete="email" required aria-label="Correo">
      <input class="input" type="password" name="clave" placeholder="Contraseña" autocomplete="current-password" required minlength="6" aria-label="Contraseña">
      <div class="chips c2"><button class="btn btn-lleno" type="submit" name="accion" value="entrar" style="height:48px">Entrar</button>
      <button class="btn" type="submit" name="accion" value="crear" style="height:48px">Crear cuenta</button></div>
    </form>
    <div class="error" role="alert">${e(store.errorLogin || info.error || '')}</div>
    <p class="ayuda">Solo los correos de ${e(N('pipe'))} y ${e(N('luu'))} pueden entrar. En iPhone, si Google no abre dentro de la app instalada, usen correo y contraseña.</p></div>`;
}

// ================= HOJAS (formularios que suben desde abajo) =================

const hojas = {};

// ---- Registrar / editar movimiento ----
function cuentasDe(p) { return D().cuentas.filter((c) => !c.archivada && (c.dueno === p || c.dueno === 'conjunto')); }
function opcionesCuentas(sel, preferido) {
  const pref = D().cuentas.filter((c) => !c.archivada && c.dueno === preferido);
  const resto = D().cuentas.filter((c) => !c.archivada && c.dueno !== preferido);
  const op = (c) => `<option value="${e(c.id)}" ${c.id === sel ? 'selected' : ''}>${e(c.nombre)}</option>`;
  return `<option value="">— Ninguna —</option>${pref.map(op).join('')}${resto.length ? `<optgroup label="Otras">${resto.map(op).join('')}</optgroup>` : ''}`;
}
function divisionDe(F) {
  if (F.divModo === 'pipe') return { pipe: 100, luu: 0 };
  if (F.divModo === 'luu') return { pipe: 0, luu: 100 };
  if (F.divModo === 'custom') { const p = Math.min(100, Math.max(0, Math.round(Number(F.pctPipe) || 0))); return { pipe: p, luu: 100 - p }; }
  return { pipe: 50, luu: 50 };
}
function modoDeDivision(d) {
  if (!d || d.pipe === 50) return '5050';
  if (d.pipe === 100) return 'pipe';
  if (d.pipe === 0) return 'luu';
  return 'custom';
}

hojas.mov = {
  html(F) {
    const aj = D().ajustes || {};
    const cats = F.tipo === 'ingreso' ? (aj.categoriasIngreso || []) : (aj.categorias || []);
    const rapidas = F.tipo === 'ingreso' ? cats.slice(0, 4) : CATEGORIAS_RAPIDAS.filter((c) => cats.includes(c));
    const fuera = F.categoria && !rapidas.includes(F.categoria);
    const espacios = D().espacios;
    const monto = C.leerPesos(F.monto);
    let resumen = '';
    if (F.tipo === 'transferencia') {
      resumen = F.cuentaId && F.cuentaDestinoId ? `De ${cuenta(F.cuentaId)?.nombre} a ${cuenta(F.cuentaDestinoId)?.nombre}` : 'Elige las dos cuentas';
    } else if (monto) {
      const p = C.partes(monto, divisionDe(F));
      const parteOtro = p[otro(F.pagador)];
      if (F.tipo === 'gasto') resumen = parteOtro ? `${N(otro(F.pagador))} le debe ${C.pesos(parteOtro)} a ${N(F.pagador)}` : 'Nadie le debe a nadie';
      else resumen = parteOtro ? `${N(F.pagador)} le debe ${C.pesos(parteOtro)} a ${N(otro(F.pagador))} (su parte)` : 'Es todo para quien lo recibió';
      const esp = espacio(F.espacioId); if (esp && esp.id !== 'casa') resumen += ` · en ${esp.nombre}`;
    }
    const pill = (k, v, txt) => `<button type="button" class="pildora ${F[k] === v ? 'on' : ''}" data-set="${k}" data-v="${e(v)}">${e(txt)}</button>`;
    return `<div class="cab">
        <button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button>
        <div class="segmento">${[['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['transferencia', 'Mover']].map(([k, t]) => `<button type="button" class="${F.tipo === k ? 'on' : ''}" data-set="tipo" data-v="${k}">${t}</button>`).join('')}</div>
        <span style="width:44px"></span></div>
      <div class="monto-grande">
        <label for="f-monto" class="eyebrow">${F.tipo === 'ingreso' ? '¿Cuánto entró?' : F.tipo === 'transferencia' ? '¿Cuánto vas a mover?' : '¿Cuánto?'}</label>
        <div class="fila"><span class="signo">$</span><input id="f-monto" inputmode="numeric" autocomplete="off" placeholder="0" value="${e(F.monto)}" data-f="monto" data-pesos></div>
        <input class="desc-input" placeholder="${F.tipo === 'ingreso' ? '¿De qué? (opcional)' : '¿En qué? (opcional)'}" value="${e(F.desc)}" data-f="desc" aria-label="Descripción">
      </div>
      ${F.tipo !== 'transferencia' ? `
      <div class="campo"><span class="etiqueta">Espacio</span>
        <div class="chips c5">${espacios.slice(0, 5).map((x) => `<button type="button" class="chip ${F.espacioId === x.id ? 'on' : ''}" data-set="espacioId" data-v="${e(x.id)}">${x.icono === 'logo' ? `<img src="${e(x.logo)}" alt="" style="background:${e(x.marca?.claro || '#fff')}">` : ''}${e(x.nombre)}</button>`).join('')}</div>
        ${espacios.length > 5 ? `<select class="input" data-f="espacioId" data-re aria-label="Otro espacio">${espacios.map((x) => `<option value="${e(x.id)}" ${x.id === F.espacioId ? 'selected' : ''}>${e(x.nombre)}</option>`).join('')}</select>` : ''}
      </div>
      <div class="campo"><span class="etiqueta">Categoría</span>
        <div class="chips">${rapidas.map((c) => `<button type="button" class="chip ${F.categoria === c ? 'on' : ''}" data-set="categoria" data-v="${e(c)}">${e(c === 'Servicios públicos' ? 'Servicios' : c)}</button>`).join('')}
        ${F.tipo === 'gasto' ? `<button type="button" class="chip ${fuera ? 'on' : ''}" data-set="verMasCat" data-v="1">${fuera ? e(F.categoria) : 'Más…'}</button>` : ''}</div>
        ${F.verMasCat || (fuera && F.tipo === 'gasto') ? `<select class="input" data-f="categoria" data-re aria-label="Categoría">${cats.map((c) => `<option ${c === F.categoria ? 'selected' : ''}>${e(c)}</option>`).join('')}</select>` : ''}
      </div>` : ''}
      <div class="panel">
        ${F.tipo !== 'transferencia' ? `
        <div class="linea"><span>${F.tipo === 'ingreso' ? 'Lo recibió' : 'Pagó'}</span><div class="pildoras">${pill('pagador', 'pipe', N('pipe'))}${pill('pagador', 'luu', N('luu'))}</div></div>
        <div class="linea"><span>${F.tipo === 'ingreso' ? 'Es de' : 'Se divide'}</span><div class="pildoras">${pill('divModo', '5050', '50/50')}${pill('divModo', 'pipe', 'Solo ' + N('pipe'))}${pill('divModo', 'luu', 'Solo ' + N('luu'))}${pill('divModo', 'custom', '%')}</div></div>
        ${F.divModo === 'custom' ? `<div class="linea"><span>Parte de ${e(N('pipe'))}</span><span><input class="chico" type="number" min="0" max="100" inputmode="numeric" value="${e(F.pctPipe)}" data-f="pctPipe" style="width:60px" aria-label="Porcentaje de ${e(N('pipe'))}"><span data-vivo="pct">% · ${e(N('luu'))} ${100 - (Math.min(100, Math.max(0, Number(F.pctPipe) || 0)))}%</span></span></div>` : ''}
        <div class="linea"><span>${F.tipo === 'ingreso' ? 'Entró a' : 'Desde'}</span><select data-f="cuentaId" aria-label="Cuenta">${opcionesCuentas(F.cuentaId, F.pagador)}</select></div>`
        : `<div class="linea"><span>Desde</span><select data-f="cuentaId" data-re aria-label="Cuenta de origen">${opcionesCuentas(F.cuentaId, store.yo)}</select></div>
        <div class="linea"><span>Hacia</span><select data-f="cuentaDestinoId" data-re aria-label="Cuenta de destino">${opcionesCuentas(F.cuentaDestinoId, store.yo)}</select></div>`}
        <div class="linea"><span>Fecha</span><input type="date" value="${e(F.fecha)}" data-f="fecha" aria-label="Fecha"></div>
      </div>
      <div class="resumen-linea" data-resumen data-vivo="resumen">${e(resumen)}</div>
      <div class="error" role="alert">${e(F.error || '')}</div>
      <div class="pie">
        <button type="button" class="btn-primario" data-a="guardarMov">${F.id ? 'Guardar cambios' : F.tipo === 'ingreso' ? 'Guardar ingreso' : F.tipo === 'transferencia' ? 'Guardar movimiento' : 'Guardar gasto'}</button>
        ${F.id ? `<button type="button" class="btn btn-peligro" style="width:100%;margin-top:10px" data-a="borrarMov">${estado.confirmar === 'borrarMov' ? '¿Seguro? Toca otra vez para borrar' : 'Borrar movimiento'}</button>` : ''}
      </div>`;
  },
  set(F, k, v) {
    if (k === 'verMasCat') { F.verMasCat = !F.verMasCat; return; }
    F[k] = v;
    if (k === 'tipo') {
      const aj = D().ajustes || {};
      if (v === 'ingreso') F.categoria = (aj.categoriasIngreso || [])[0] || 'Otros ingresos';
      else if (v === 'gasto') F.categoria = ls.get('ultimaCat', 'Mercado');
      if (v === 'transferencia' && !F.cuentaDestinoId) {
        const otra = D().cuentas.find((c) => c.id !== F.cuentaId && !c.archivada);
        F.cuentaDestinoId = otra?.id || '';
      }
    }
    if (k === 'pagador') {
      const c = cuenta(F.cuentaId);
      if (!c || (c.dueno !== v && c.dueno !== 'conjunto')) F.cuentaId = ls.get('ultimaCuenta:' + v, null) || cuentasDe(v)[0]?.id || '';
    }
    if (k === 'categoria') F.verMasCat = false;
  },
};

function nuevoMovForm(op = {}) {
  const tipo = op.tipo || 'gasto';
  const yo = store.yo;
  const F = {
    tipo, monto: '', desc: '', espacioId: op.espacioId || 'casa',
    categoria: tipo === 'ingreso' ? (D().ajustes?.categoriasIngreso || [])[0] : ls.get('ultimaCat', 'Mercado'),
    pagador: yo, divModo: '5050', pctPipe: 50,
    cuentaId: ls.get('ultimaCuenta:' + yo, null) || cuentasDe(yo)[0]?.id || '',
    cuentaDestinoId: '', fecha: C.hoy(),
  };
  if (!cuenta(F.cuentaId)) F.cuentaId = cuentasDe(yo)[0]?.id || '';
  if (tipo === 'ingreso' && op.espacioId && espacio(op.espacioId)?.tipo === 'negocio') F.categoria = 'Ventas';
  return F;
}
function formDeMov(m) {
  const d = m.division || { pipe: 50, luu: 50 };
  return {
    id: m.id, tipo: m.tipo, monto: C.pesos(m.monto).replace(/[−$]/g, ''), desc: m.desc || '',
    espacioId: m.espacioId || 'casa', categoria: m.categoria || '', pagador: m.pagador || store.yo,
    divModo: modoDeDivision(d), pctPipe: d.pipe, cuentaId: m.cuentaId || '', cuentaDestinoId: m.cuentaDestinoId || '',
    fecha: m.fecha || C.hoy(), creditoId: m.creditoId, metaId: m.metaId, original: m,
  };
}

async function guardarMov() {
  const F = estado.F;
  const monto = C.leerPesos(F.monto);
  if (!monto || monto <= 0) return errorHoja('Escribe cuánto fue.');
  if (F.tipo === 'transferencia' && (!F.cuentaId || !F.cuentaDestinoId || F.cuentaId === F.cuentaDestinoId)) return errorHoja('Elige dos cuentas distintas.');
  if (!F.fecha) return errorHoja('Falta la fecha.');
  const m = {
    tipo: F.tipo, monto, desc: (F.desc || '').trim(), fecha: F.fecha,
    cuentaId: F.cuentaId || null,
  };
  if (F.tipo === 'transferencia') {
    Object.assign(m, { cuentaDestinoId: F.cuentaDestinoId, categoria: 'Transferencia', pagador: cuenta(F.cuentaId)?.dueno === 'luu' ? 'luu' : 'pipe', espacioId: 'casa', division: { pipe: 50, luu: 50 } });
  } else if (F.tipo === 'saldo' || F.tipo === 'ahorro') {
    Object.assign(m, { pagador: F.pagador, cuentaDestinoId: F.cuentaDestinoId || null, espacioId: F.espacioId, categoria: F.categoria });
  } else {
    Object.assign(m, { categoria: F.categoria || 'Otros', espacioId: F.espacioId || 'casa', pagador: F.pagador, division: divisionDe(F) });
    if (F.original && F.original.cuentaDestinoId) m.cuentaDestinoId = F.original.cuentaDestinoId;
  }
  if (F.creditoId) m.creditoId = F.creditoId;
  if (F.metaId) m.metaId = F.metaId;
  try {
    if (F.id) {
      await store.actualizar('movimientos', F.id, m);
      cerrarHoja(); toast('Cambios guardados');
    } else {
      const id = await store.agregar('movimientos', m);
      if (F.tipo === 'gasto') ls.set('ultimaCat', m.categoria);
      if (m.cuentaId) ls.set('ultimaCuenta:' + m.pagador, m.cuentaId);
      cerrarHoja();
      toast(F.tipo === 'ingreso' ? 'Ingreso guardado' : 'Guardado', { texto: 'Deshacer', fn: () => store.borrar('movimientos', id) });
    }
  } catch (err) { errorHoja('No se pudo guardar: ' + err.message); }
}

// ---- Saldar cuentas ----
hojas.saldar = {
  html(F) {
    const deudor = F.pagador, acreedor = otro(F.pagador);
    return `<div class="agarre"></div><div class="cab"><h3>Saldar cuentas</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <p class="muted" style="margin:4px 0 0;font-size:14px">${e(N(deudor))} le paga a ${e(N(acreedor))}. Puedes cambiar el monto si es un pago parcial.</p>
      <div class="monto-grande"><div class="fila"><span class="signo">$</span><input inputmode="numeric" value="${e(F.monto)}" data-f="monto" data-pesos aria-label="Monto"></div></div>
      <div class="panel">
        <div class="linea"><span>Sale de</span><select data-f="cuentaId" aria-label="Cuenta de origen">${opcionesCuentas(F.cuentaId, deudor)}</select></div>
        <div class="linea"><span>Llega a</span><select data-f="cuentaDestinoId" aria-label="Cuenta de destino">${opcionesCuentas(F.cuentaDestinoId, acreedor)}</select></div>
        <div class="linea"><span>Fecha</span><input type="date" value="${e(F.fecha)}" data-f="fecha" aria-label="Fecha"></div>
      </div>
      <div class="error" role="alert">${e(F.error || '')}</div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarSaldo">Registrar pago</button></div>`;
  },
};
async function guardarSaldo() {
  const F = estado.F; const monto = C.leerPesos(F.monto);
  if (!monto) return errorHoja('Escribe el monto.');
  await store.agregar('movimientos', { tipo: 'saldo', monto, pagador: F.pagador, cuentaId: F.cuentaId || null, cuentaDestinoId: F.cuentaDestinoId || null, fecha: F.fecha, categoria: 'Transferencia', desc: 'Saldar cuentas', espacioId: F.espacioId || 'casa' });
  cerrarHoja(); toast('¡Cuentas saldadas!');
}

// ---- Metas ----
hojas.meta = {
  html(F) {
    return `<div class="agarre"></div><div class="cab"><h3>${F.id ? 'Editar meta' : 'Nueva meta'}</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <div class="campo"><label for="m-n">¿Para qué ahorran?</label><input id="m-n" class="input" value="${e(F.nombre)}" data-f="nombre" placeholder="Ej: Mini-servidor"></div>
      <div class="campo"><label for="m-o">¿Cuánto necesitan?</label><input id="m-o" class="input" inputmode="numeric" value="${e(F.objetivo)}" data-f="objetivo" data-pesos placeholder="$0"></div>
      <div class="campo"><label for="m-i">¿Cuánto tienen ya?</label><input id="m-i" class="input" inputmode="numeric" value="${e(F.inicial)}" data-f="inicial" data-pesos placeholder="$0"></div>
      <div class="campo"><label for="m-f">¿Para cuándo? (opcional)</label><input id="m-f" class="input" type="month" value="${e(F.fechaLimite)}" data-f="fechaLimite"></div>
      <div class="campo"><span class="etiqueta">Es de</span><div class="pildoras">${['conjunto', 'pipe', 'luu'].map((p) => `<button type="button" class="pildora ${F.de === p ? 'on' : ''}" data-set="de" data-v="${p}">${e(N(p))}</button>`).join('')}</div></div>
      <div class="error" role="alert">${e(F.error || '')}</div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarMeta">Guardar meta</button>
      ${F.id ? `<button type="button" class="btn btn-peligro" style="width:100%;margin-top:10px" data-a="borrarMeta">${estado.confirmar === 'borrarMeta' ? '¿Seguro? Toca otra vez' : 'Borrar meta'}</button>` : ''}</div>`;
  },
};
async function guardarMeta() {
  const F = estado.F;
  if (!F.nombre.trim()) return errorHoja('Ponle un nombre.');
  const objetivo = C.leerPesos(F.objetivo); if (!objetivo) return errorHoja('¿Cuánto necesitan?');
  const data = { nombre: F.nombre.trim(), objetivo, inicial: C.leerPesos(F.inicial), fechaLimite: F.fechaLimite || '', de: F.de };
  if (F.id) await store.actualizar('metas', F.id, data); else await store.agregar('metas', data);
  cerrarHoja(); toast('Meta guardada');
}
hojas.aporte = {
  html(F) {
    const mt = D().metas.find((x) => x.id === F.metaId);
    return `<div class="agarre"></div><div class="cab"><h3>Aportar a ${e(mt?.nombre || '')}</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <div class="monto-grande"><div class="fila"><span class="signo">$</span><input inputmode="numeric" value="${e(F.monto)}" data-f="monto" data-pesos placeholder="0" aria-label="Monto"></div></div>
      <div class="panel">
        <div class="linea"><span>Lo aporta</span><div class="pildoras">${['pipe', 'luu'].map((p) => `<button type="button" class="pildora ${F.pagador === p ? 'on' : ''}" data-set="pagador" data-v="${p}">${e(N(p))}</button>`).join('')}</div></div>
        <div class="linea"><span>Sale de</span><select data-f="cuentaId" aria-label="Cuenta">${opcionesCuentas(F.cuentaId, F.pagador)}</select></div>
        <div class="linea"><span>Fecha</span><input type="date" value="${e(F.fecha)}" data-f="fecha" aria-label="Fecha"></div>
      </div>
      <p class="ayuda">La plata sale de esa cuenta y queda apartada para la meta. No cuenta como gasto.</p>
      <div class="error" role="alert">${e(F.error || '')}</div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarAporte">Aportar</button></div>`;
  },
  set(F, k, v) { F[k] = v; if (k === 'pagador') F.cuentaId = cuentasDe(v)[0]?.id || ''; },
};
async function guardarAporte() {
  const F = estado.F; const monto = C.leerPesos(F.monto);
  if (!monto) return errorHoja('¿Cuánto vas a aportar?');
  const mt = D().metas.find((x) => x.id === F.metaId);
  await store.agregar('movimientos', { tipo: 'ahorro', monto, metaId: F.metaId, pagador: F.pagador, cuentaId: F.cuentaId || null, fecha: F.fecha, categoria: 'Ahorro', desc: 'Ahorro · ' + (mt?.nombre || ''), espacioId: 'casa' });
  cerrarHoja(); toast('¡Un pasito más cerca!');
}

// ---- Créditos ----
hojas.credito = {
  html(F) {
    const tasaM = F.tasaModo === 'ea' ? C.eaAMensual(Number(String(F.tasa).replace(',', '.')) || 0) : Number(String(F.tasa).replace(',', '.')) || 0;
    const sugerida = F.tipo === 'banco' ? C.cuotaFija(C.leerPesos(F.montoInicial), tasaM, Number(F.plazo) || 0) : F.tipo === 'plazos' && Number(F.plazo) ? Math.round(C.leerPesos(F.montoInicial) / Number(F.plazo)) : 0;
    const conv = tasaM ? (F.tasaModo === 'ea' ? `= ${tasaM.toFixed(3).replace('.', ',')}% mensual` : `= ${C.mensualAEa(tasaM).toFixed(2).replace('.', ',')}% E.A.`) : 'Escribe la tasa';
    return `<div class="agarre"></div><div class="cab"><h3>${F.id ? 'Editar crédito' : 'Nuevo crédito'}</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <div class="campo"><span class="etiqueta">¿Qué tipo es?</span><div class="chips c3">
        ${[['banco', 'Préstamo con interés'], ['plazos', 'Compra a plazos'], ['fija', 'Pago fijo mensual']].map(([k, t]) => `<button type="button" class="chip ${F.tipo === k ? 'on' : ''}" data-set="tipo" data-v="${k}">${t}</button>`).join('')}</div>
        <p class="ayuda">${F.tipo === 'banco' ? 'Un préstamo del banco con tasa de interés (libre inversión, apartamento…).' : F.tipo === 'plazos' ? 'Pagas algo en cuotas iguales, sin interés (el celular, un perfume a 12 cuotas…).' : 'Una cuota que pagan cada mes sin fecha de fin (como la de Neru si no saben el plazo).'}</p></div>
      <div class="campo"><label for="c-n">Nombre</label><input id="c-n" class="input" value="${e(F.nombre)}" data-f="nombre" placeholder="Ej: Crédito Banco Agrario"></div>
      ${F.tipo !== 'fija' ? `<div class="campo"><label for="c-m">${F.tipo === 'banco' ? 'Monto que les prestaron' : 'Precio total'}</label><input id="c-m" class="input" inputmode="numeric" value="${e(F.montoInicial)}" data-f="montoInicial" data-pesos placeholder="$0"></div>` : ''}
      ${F.tipo === 'banco' ? `<div class="campo"><span class="etiqueta">Tasa de interés</span>
        <div style="display:flex;gap:8px;align-items:center"><input class="input" style="flex:1" inputmode="decimal" value="${e(F.tasa)}" data-f="tasa" placeholder="Ej: 23,9" aria-label="Tasa">
        <div class="segmento">${[['ea', 'E.A.'], ['mv', 'Mensual']].map(([k, t]) => `<button type="button" class="${F.tasaModo === k ? 'on' : ''}" data-set="tasaModo" data-v="${k}">${t}</button>`).join('')}</div></div>
        <p class="ayuda"><span data-vivo="conv">${e(conv)}</span> · Los bancos suelen decir la tasa E.A. (al año); la app la convierte a mensual.</p></div>` : ''}
      ${F.tipo !== 'fija' ? `<div class="chips c2" style="margin-top:4px">
        <div class="campo"><label for="c-p">Número de cuotas</label><input id="c-p" class="input" inputmode="numeric" value="${e(F.plazo)}" data-f="plazo" placeholder="36"></div>
        <div class="campo"><label for="c-y">Ya pagadas</label><input id="c-y" class="input" inputmode="numeric" value="${e(F.cuotasPagadasInicial)}" data-f="cuotasPagadasInicial" placeholder="0"></div></div>` : ''}
      <div class="chips c2" style="margin-top:4px">
        <div class="campo"><label for="c-c">Cuota mensual</label><input id="c-c" class="input" inputmode="numeric" value="${e(F.cuota)}" data-f="cuota" data-pesos placeholder="${sugerida ? e(C.pesos(sugerida)) : '$0'}"></div>
        <div class="campo"><label for="c-d">Día de pago</label><input id="c-d" class="input" inputmode="numeric" value="${e(F.diaPago)}" data-f="diaPago" placeholder="5"></div></div>
      <p class="ayuda" data-vivo="sug">${sugerida && !F.cuota ? `Cuota calculada: ${C.pesos(sugerida)}. Si dejas la casilla vacía, se usa esta. Si el banco te dice otra, escríbela.` : ''}</p>
      <div class="campo"><span class="etiqueta">¿De quién es?</span><div class="pildoras">${['conjunto', 'pipe', 'luu'].map((p) => `<button type="button" class="pildora ${F.responsable === p ? 'on' : ''}" data-set="responsable" data-v="${p}">${e(N(p))}</button>`).join('')}</div></div>
      <div class="campo"><span class="etiqueta">Espacio</span><select class="input" data-f="espacioId" aria-label="Espacio">${D().espacios.map((x) => `<option value="${e(x.id)}" ${x.id === F.espacioId ? 'selected' : ''}>${e(x.nombre)}</option>`).join('')}</select></div>
      <div class="error" role="alert">${e(F.error || '')}</div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarCredito">Guardar</button>
      ${F.id ? `<button type="button" class="btn btn-peligro" style="width:100%;margin-top:10px" data-a="borrarCredito">${estado.confirmar === 'borrarCredito' ? '¿Seguro? Los pagos ya hechos se conservan' : 'Borrar crédito'}</button>` : ''}</div>`;
  },
};
async function guardarCredito() {
  const F = estado.F;
  if (!F.nombre.trim()) return errorHoja('Ponle un nombre.');
  const tasaNum = Number(String(F.tasa).replace(',', '.')) || 0;
  const tasaMensual = F.tipo === 'banco' ? (F.tasaModo === 'ea' ? C.eaAMensual(tasaNum) : tasaNum) : 0;
  const plazo = F.tipo === 'fija' ? 0 : Math.round(Number(F.plazo) || 0);
  let cuota = C.leerPesos(F.cuota);
  if (!cuota && F.tipo === 'banco') cuota = C.cuotaFija(C.leerPesos(F.montoInicial), tasaMensual, plazo);
  if (!cuota && F.tipo === 'plazos' && plazo) cuota = Math.round(C.leerPesos(F.montoInicial) / plazo);
  if (!cuota) return errorHoja('Falta la cuota mensual.');
  const data = {
    tipo: F.tipo, nombre: F.nombre.trim(), montoInicial: C.leerPesos(F.montoInicial), tasaMensual, plazo, cuota,
    cuotasPagadasInicial: Math.round(Number(F.cuotasPagadasInicial) || 0), diaPago: Math.min(31, Math.max(1, Math.round(Number(F.diaPago) || 1))),
    responsable: F.responsable, espacioId: F.espacioId || 'casa',
  };
  if (F.id) await store.actualizar('creditos', F.id, data); else await store.agregar('creditos', data);
  cerrarHoja(); toast('Crédito guardado');
}
hojas.pago = {
  html(F) {
    const cr = D().creditos.find((x) => x.id === F.creditoId);
    return `<div class="agarre"></div><div class="cab"><h3>Pagar ${e(cr?.nombre || '')}</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <div class="monto-grande"><div class="fila"><span class="signo">$</span><input inputmode="numeric" value="${e(F.monto)}" data-f="monto" data-pesos aria-label="Monto"></div></div>
      <div class="panel">
        <div class="linea"><span>Pagó</span><div class="pildoras">${['pipe', 'luu'].map((p) => `<button type="button" class="pildora ${F.pagador === p ? 'on' : ''}" data-set="pagador" data-v="${p}">${e(N(p))}</button>`).join('')}</div></div>
        <div class="linea"><span>Desde</span><select data-f="cuentaId" aria-label="Cuenta">${opcionesCuentas(F.cuentaId, F.pagador)}</select></div>
        <div class="linea"><span>Fecha</span><input type="date" value="${e(F.fecha)}" data-f="fecha" aria-label="Fecha"></div>
      </div>
      <p class="ayuda">${cr?.responsable === 'conjunto' ? 'Es de los dos: se divide 50/50.' : `Es de ${N(cr?.responsable)}${F.pagador !== cr?.responsable ? `: como pagó ${N(F.pagador)}, ${N(cr?.responsable)} le queda debiendo.` : '.'}`}</p>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarPago">Registrar pago</button></div>`;
  },
  set(F, k, v) { F[k] = v; if (k === 'pagador') F.cuentaId = cuentasDe(v)[0]?.id || ''; },
};
async function guardarPago() {
  const F = estado.F; const cr = D().creditos.find((x) => x.id === F.creditoId);
  const monto = C.leerPesos(F.monto); if (!monto) return errorHoja('¿Cuánto pagaron?');
  const division = cr.responsable === 'pipe' ? { pipe: 100, luu: 0 } : cr.responsable === 'luu' ? { pipe: 0, luu: 100 } : { pipe: 50, luu: 50 };
  await store.agregar('movimientos', { tipo: 'gasto', monto, categoria: 'Deudas', desc: 'Cuota · ' + cr.nombre, creditoId: cr.id, pagador: F.pagador, division, cuentaId: F.cuentaId || null, fecha: F.fecha, espacioId: cr.espacioId || 'casa' });
  cerrarHoja(); toast('Cuota registrada ✓');
}

// ---- Cuentas ----
hojas.cuenta = {
  html(F) {
    return `<div class="agarre"></div><div class="cab"><h3>${F.id ? 'Editar cuenta' : 'Nueva cuenta'}</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <div class="campo"><label for="a-n">Nombre</label><input id="a-n" class="input" value="${e(F.nombre)}" data-f="nombre" placeholder="Ej: Nequi Pipe"></div>
      <div class="campo"><span class="etiqueta">Es de</span><div class="pildoras">${['pipe', 'luu', 'conjunto'].map((p) => `<button type="button" class="pildora ${F.dueno === p ? 'on' : ''}" data-set="dueno" data-v="${p}">${e(N(p))}</button>`).join('')}</div></div>
      <div class="campo"><label for="a-s">¿Cuánto hay HOY en esta cuenta?</label><input id="a-s" class="input" inputmode="numeric" value="${e(F.saldoHoy)}" data-f="saldoHoy" data-pesos placeholder="$0">
      <p class="ayuda">Mira tu app del banco y escribe el saldo. La app hace el resto.</p></div>
      <div class="error" role="alert">${e(F.error || '')}</div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarCuenta">Guardar</button>
      ${F.id ? `<button type="button" class="btn btn-peligro" style="width:100%;margin-top:10px" data-a="archivarCuenta">${estado.confirmar === 'archivarCuenta' ? '¿Seguro? Toca otra vez' : 'Ocultar esta cuenta'}</button>` : ''}</div>`;
  },
};
async function guardarCuenta() {
  const F = estado.F;
  if (!F.nombre.trim()) return errorHoja('Ponle un nombre.');
  const hoyV = C.leerPesos(F.saldoHoy);
  if (F.id) {
    const c = cuenta(F.id);
    const efecto = C.saldoCuenta({ ...c, saldoInicial: 0 }, D().movimientos);
    await store.actualizar('cuentas', F.id, { nombre: F.nombre.trim(), dueno: F.dueno, saldoInicial: hoyV - efecto });
  } else {
    await store.agregar('cuentas', { nombre: F.nombre.trim(), dueno: F.dueno, saldoInicial: hoyV, orden: D().cuentas.length + 1 });
  }
  cerrarHoja(); toast('Cuenta guardada');
}

// ---- Presupuestos y categorías ----
hojas.presupuestos = {
  html(F) {
    const aj = D().ajustes || {};
    const r = C.resumenMes(D().movimientos, C.mesActual(), (m) => espaciosHogar().has(m.espacioId || 'casa'));
    const total = Object.values(F.pres).reduce((s, v) => s + C.leerPesos(v), 0);
    return `<div class="agarre"></div><div class="cab"><h3>Presupuestos</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <p class="muted" style="margin:4px 0 0;font-size:14px">¿Cuánto quieren gastar al mes en cada cosa? Deja vacío lo que no quieran controlar. Total: <b class="num" data-total>${C.pesos(total)}</b></p>
      <div class="lista" style="margin-top:12px">${(aj.categorias || []).filter((c) => !['Transferencia', 'Ahorro'].includes(c)).map((c) => `
        <div class="ajuste" style="min-height:60px"><span class="izq"><b style="font-weight:500">${e(c)}</b><span>Este mes: ${C.pesos(r.porCategoria[c] || 0)}</span></span>
        <input class="input num" style="width:140px;height:42px;text-align:right" inputmode="numeric" placeholder="—" value="${e(F.pres[c] || '')}" data-pres="${e(c)}" aria-label="Presupuesto ${e(c)}"></div>`).join('')}</div>
      <div class="campo"><label for="p-n">Nueva categoría</label><div style="display:flex;gap:8px"><input id="p-n" class="input" value="${e(F.nueva || '')}" data-f="nueva" placeholder="Ej: Mascotas"><button type="button" class="btn" data-a="agregarCat">Agregar</button></div></div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarPres">Guardar presupuestos</button></div>`;
  },
};

// ---- Espacios ----
hojas.espacio = {
  html(F) {
    return `<div class="agarre"></div><div class="cab"><h3>${F.id ? 'Editar espacio' : 'Nuevo espacio'}</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <div class="campo"><label for="e-n">Nombre</label><input id="e-n" class="input" value="${e(F.nombre)}" data-f="nombre" placeholder="Ej: Viaje a Cartagena"></div>
      <div class="campo"><label for="e-d">Descripción corta</label><input id="e-d" class="input" value="${e(F.desc)}" data-f="desc" placeholder="Opcional"></div>
      <div class="campo"><span class="etiqueta">Tipo</span><div class="pildoras">${[['hogar', 'Gastos'], ['negocio', 'Negocio (ventas y costos)']].map(([k, t]) => `<button type="button" class="pildora ${F.tipo === k ? 'on' : ''}" data-set="tipo" data-v="${k}">${t}</button>`).join('')}</div></div>
      ${!F.id || F.icono !== 'logo' ? `<div class="campo"><span class="etiqueta">Ícono</span><div class="pildoras">${['casa', 'hoja', 'carro', 'meta', 'estrella', 'corazon'].map((k) => `<button type="button" class="pildora ${F.icono === k ? 'on' : ''}" data-set="icono" data-v="${k}" aria-label="${k}">${I[k](16)}</button>`).join('')}</div></div>` : ''}
      <div class="error" role="alert">${e(F.error || '')}</div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarEspacio">Guardar</button></div>`;
  },
};
async function guardarEspacio() {
  const F = estado.F;
  if (!F.nombre.trim()) return errorHoja('Ponle un nombre.');
  const data = { nombre: F.nombre.trim(), desc: F.desc.trim(), tipo: F.tipo, icono: F.icono };
  if (F.id) await store.actualizar('espacios', F.id, data);
  else await store.agregar('espacios', { ...data, orden: D().espacios.length + 1 });
  cerrarHoja(); toast('Espacio guardado');
}

// ================= IMPORTAR =================
function vImportar() {
  const imp = estado.importacion;
  const cab = `<div class="top"><a href="#/mas" class="btn-icono" aria-label="Volver">${I.atras()}</a><span class="h1">Importar historial</span><span style="width:44px"></span></div>`;
  if (!imp) {
    return `<main class="vista">${cab}
      <p class="muted" style="margin:18px 0;line-height:1.5">Sube el Excel de presupuesto <b>tal cual</b> (.xlsx). La app lee los movimientos, las cuentas con sus saldos iniciales, el presupuesto y las deudas. Antes de guardar nada te muestra lo que encontró.</p>
      <label class="btn-primario" style="cursor:pointer">${I.subir()} Elegir archivo<input type="file" accept=".xlsx,.xls,.csv" data-archivo class="sr"></label>
      <p class="ayuda" style="text-align:center;margin-top:12px">El archivo se lee aquí mismo, en tu celular. No se sube a ningún lado.</p>
    </main>`;
  }
  if (imp.cargando) return `<main class="vista">${cab}<div class="vacio"><b>Leyendo el archivo…</b>${e(imp.cargando)}</div></main>`;
  if (imp.error) return `<main class="vista">${cab}<div class="aviso warn" style="margin-top:20px">${e(imp.error)}</div><button class="btn" style="margin-top:14px;width:100%" data-a="reiniciarImport">Intentar con otro archivo</button></main>`;
  if (imp.hecho) return `<main class="vista">${cab}<div class="vacio"><b>¡Listo! 🎉</b>${e(imp.hecho)}</div><a class="btn-primario" href="#/inicio" style="text-decoration:none">Ir al inicio</a></main>`;
  const r = imp.resultado;
  const encontrados = [
    { t: `${r.movimientos.length} movimientos`, s: r.movimientos.length ? `De ${C.fechaCorta(r.rango[0])} a ${C.fechaCorta(r.rango[1])} · ${r.duplicados} ya estaban en la app` : 'La hoja «Gastos e ingresos» viene vacía' },
    { t: `${r.cuentas.length} cuentas`, s: r.cuentas.filter((c) => c.saldoInicial).length + ' con saldo inicial sacado de las fórmulas' },
    { t: `${Object.keys(r.presupuestos).length} presupuestos y ${r.creditos.length} deudas fijas`, s: r.creditos.map((c) => c.nombre).slice(0, 3).join(', ') + (r.creditos.length > 3 ? '…' : '') },
    { t: r.categoriasNuevas.length === 1 ? '1 categoría nueva' : `${r.categoriasNuevas.length} categorías nuevas`, s: r.categoriasNuevas.slice(0, 5).join(', ') || 'Todas ya existían' },
  ];
  return `<main class="vista">${cab}
    <div class="tarjeta tarjeta-fila" style="margin-top:20px;justify-content:flex-start"><span class="ico" style="width:40px;height:40px;border-radius:10px;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center">${I.lista(18)}</span>
      <div style="display:flex;flex-direction:column;gap:2px;min-width:0"><b style="font-size:14px;overflow:hidden;text-overflow:ellipsis">${e(imp.nombre)}</b><span class="muted" style="font-size:12px">${r.hojas} hojas</span></div></div>
    <div class="seccion"><h2 class="etiqueta">Esto encontramos</h2></div>
    <div class="tarjeta" style="padding:2px 16px">${encontrados.map((x) => `<div class="mov" style="cursor:default"><span style="color:var(--accent-text)">${I.check()}</span><span class="txt"><b style="white-space:normal">${e(x.t)}</b><span style="white-space:normal">${e(x.s)}</span></span></div>`).join('')}</div>
    ${r.preguntas.length ? `<div class="seccion"><h2 class="etiqueta" style="color:var(--warn)">Ayúdanos con esto</h2></div>
    ${r.preguntas.map((p) => `<div class="tarjeta tarjeta-fila" style="padding:12px 14px;margin-top:8px"><span style="font-size:13px;line-height:1.4">${e(p.texto)}</span>
      <div class="pildoras" style="flex-shrink:0"><button class="pildora ${imp.respuestas[p.id] === true ? 'on' : ''}" data-a="responder" data-id="${e(p.id)}" data-v="1">Sí</button><button class="pildora ${imp.respuestas[p.id] === false ? 'on' : ''}" data-a="responder" data-id="${e(p.id)}" data-v="0">No</button></div></div>`).join('')}` : ''}
    ${r.cuentas.length ? `<div class="seccion"><h2 class="etiqueta">Saldos iniciales</h2></div>
    <div class="lista">${r.cuentas.map((c) => `<div class="ajuste" style="min-height:44px"><span class="izq"><b style="font-weight:500">${e(c.nombre)}</b><span>${e(N(c.dueno))}${c.existe ? ' · ya existe, se actualiza' : ' · nueva'}</span></span><span class="der num">${C.pesos(c.saldoInicial)}</span></div>`).join('')}</div>` : ''}
    <div class="pie" style="margin-top:24px">
      <label style="display:flex;gap:10px;align-items:center;font-size:13px;margin-bottom:14px"><input type="checkbox" data-a="toggleSaldos" ${imp.usarSaldos ? 'checked' : ''}> Usar estos saldos iniciales para las cuentas</label>
      <button class="btn-primario" data-a="confirmarImport" ${imp.guardando ? 'disabled' : ''}>${imp.guardando ? e(imp.guardando) : 'Importar todo'}</button>
      <button class="btn" style="width:100%;margin-top:10px" data-a="reiniciarImport">Cancelar</button>
    </div>
  </main>`;
}

async function leerArchivo(file) {
  estado.importacion = { cargando: 'Esto toma unos segundos', nombre: file.name, respuestas: {}, usarSaldos: true };
  render();
  try {
    const { leerLibro, analizar } = await import('./importer.js');
    const libro = await leerLibro(file);
    const resultado = analizar(libro, { datos: D(), personas: CONFIG.personas, yo: store.yo });
    const respuestas = {};
    for (const p of resultado.preguntas) respuestas[p.id] = p.sugerida;
    estado.importacion = { nombre: file.name, resultado, respuestas, usarSaldos: true, libro };
  } catch (err) {
    console.error(err);
    estado.importacion = { error: 'No pude leer ese archivo: ' + err.message, nombre: file.name };
  }
  render();
}

async function confirmarImport() {
  const imp = estado.importacion;
  const { construirOperaciones } = await import('./importer.js');
  const ops = construirOperaciones(imp.resultado, imp.respuestas, { usarSaldos: imp.usarSaldos, datos: D() });
  imp.guardando = 'Guardando…'; render();
  try {
    await store.lote(ops.lote, (n, t) => { imp.guardando = `Guardando ${n} de ${t}…`; const b = $('[data-a="confirmarImport"]'); if (b) b.textContent = imp.guardando; });
    if (ops.ajustes) await store.guardarAjustes(ops.ajustes);
    estado.importacion = { hecho: `Se importaron ${ops.resumen.movimientos} movimientos, ${ops.resumen.cuentas} cuentas, ${ops.resumen.creditos} deudas y ${ops.resumen.presupuestos} presupuestos.` };
  } catch (err) {
    imp.guardando = null; imp.error = 'Falló al guardar: ' + err.message;
  }
  render();
}

// ================= EXPORTAR =================
function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function exportarCSV() {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = [['Fecha', 'Tipo', 'Monto', 'Descripción', 'Categoría', 'Espacio', 'Pagó', '% Pipe', '% Luu', 'Cuenta', 'Cuenta destino', 'Registró']];
  for (const m of [...D().movimientos].reverse()) {
    filas.push([m.fecha, m.tipo, m.monto, m.desc, m.categoria, espacio(m.espacioId)?.nombre || '', N(m.pagador), m.division?.pipe ?? '', m.division?.luu ?? '', cuenta(m.cuentaId)?.nombre || '', cuenta(m.cuentaDestinoId)?.nombre || '', N(m.creadoPor)]);
  }
  descargar(`pipe-y-luu-movimientos-${C.hoy()}.csv`, '﻿' + filas.map((f) => f.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}

// ================= HOJAS: abrir / cerrar =================
function abrirHoja(tipo, F) {
  estado.hoja = tipo; estado.F = F; estado.confirmar = null;
  let fondo = $('.hoja-fondo'), hoja = $('.hoja');
  if (!fondo) {
    fondo = document.createElement('div'); fondo.className = 'hoja-fondo'; fondo.dataset.a = 'cerrar';
    hoja = document.createElement('div'); hoja.className = 'hoja'; hoja.setAttribute('role', 'dialog'); hoja.setAttribute('aria-modal', 'true');
    document.body.append(fondo, hoja);
  }
  pintarHoja();
  requestAnimationFrame(() => { fondo.classList.add('abierta'); hoja.classList.add('abierta'); });
  document.body.style.overflow = 'hidden';
  if (tipo === 'mov' && !F.id) setTimeout(() => $('#f-monto')?.focus(), 320);
}
function pintarHoja() {
  const hoja = $('.hoja'); if (!hoja || !estado.hoja) return;
  const top = hoja.scrollTop;
  hoja.innerHTML = hojas[estado.hoja].html(estado.F);
  hoja.scrollTop = top;
}
function cerrarHoja() {
  estado.hoja = null;
  const fondo = $('.hoja-fondo'), hoja = $('.hoja');
  if (fondo) fondo.classList.remove('abierta');
  if (hoja) hoja.classList.remove('abierta');
  document.body.style.overflow = '';
  setTimeout(() => { if (!estado.hoja) { fondo?.remove(); hoja?.remove(); } }, 300);
}
function errorHoja(msg) { estado.F.error = msg; pintarHoja(); }

// ================= ACCIONES (qué pasa al tocar cada botón) =================
const acciones = {
  nuevoMov: (el) => abrirHoja('mov', nuevoMovForm({ tipo: el.dataset.tipo, espacioId: el.dataset.esp })),
  editarMov: (el) => {
    const m = D().movimientos.find((x) => x.id === el.dataset.id); if (!m) return;
    const F = formDeMov(m);
    abrirHoja(m.tipo === 'saldo' || m.tipo === 'ahorro' ? 'movSimple' : 'mov', F);
  },
  guardarMov,
  borrarMov: async () => {
    if (estado.confirmar !== 'borrarMov') { estado.confirmar = 'borrarMov'; pintarHoja(); return; }
    const m = estado.F.original; await store.borrar('movimientos', estado.F.id); cerrarHoja();
    toast('Movimiento borrado', { texto: 'Deshacer', fn: () => store.agregar('movimientos', m) });
  },
  cerrar: cerrarHoja,
  saldar: (el) => {
    const espId = el.dataset.esp || '';
    const movs = D().movimientos.filter((m) => !espId || (m.espacioId || 'casa') === espId);
    const neto = C.saldoEntreDos(movs);
    const deudor = neto > 0 ? 'luu' : 'pipe';
    abrirHoja('saldar', { monto: C.pesos(Math.abs(neto)).replace(/[−$]/g, ''), pagador: deudor, cuentaId: cuentasDe(deudor)[0]?.id || '', cuentaDestinoId: cuentasDe(otro(deudor))[0]?.id || '', fecha: C.hoy(), espacioId: espId || 'casa' });
  },
  guardarSaldo,
  nuevaMeta: () => abrirHoja('meta', { nombre: '', objetivo: '', inicial: '', fechaLimite: '', de: 'conjunto' }),
  editarMeta: (el) => { const m = D().metas.find((x) => x.id === el.dataset.id); abrirHoja('meta', { ...m, objetivo: C.pesos(m.objetivo).slice(1), inicial: m.inicial ? C.pesos(m.inicial).slice(1) : '', de: m.de || 'conjunto' }); },
  guardarMeta,
  borrarMeta: async () => {
    if (estado.confirmar !== 'borrarMeta') { estado.confirmar = 'borrarMeta'; pintarHoja(); return; }
    await store.borrar('metas', estado.F.id); cerrarHoja(); toast('Meta borrada');
  },
  aportar: (el) => abrirHoja('aporte', { metaId: el.dataset.id, monto: el.dataset.monto ? C.pesos(Number(el.dataset.monto)).slice(1) : '', pagador: store.yo, cuentaId: cuentasDe(store.yo)[0]?.id || '', fecha: C.hoy() }),
  guardarAporte,
  nuevoCredito: () => abrirHoja('credito', { tipo: 'banco', nombre: '', montoInicial: '', tasa: '', tasaModo: 'ea', plazo: '', cuotasPagadasInicial: '', cuota: '', diaPago: '', responsable: 'conjunto', espacioId: 'casa' }),
  editarCredito: (el) => {
    const c = D().creditos.find((x) => x.id === el.dataset.id);
    abrirHoja('credito', { ...c, montoInicial: c.montoInicial ? C.pesos(c.montoInicial).slice(1) : '', tasa: c.tasaMensual ? c.tasaMensual.toFixed(3).replace('.', ',') : '', tasaModo: 'mv', plazo: c.plazo || '', cuota: C.pesos(c.cuota).slice(1), cuotasPagadasInicial: c.cuotasPagadasInicial || '', diaPago: c.diaPago || '' });
  },
  guardarCredito,
  borrarCredito: async () => {
    if (estado.confirmar !== 'borrarCredito') { estado.confirmar = 'borrarCredito'; pintarHoja(); return; }
    await store.borrar('creditos', estado.F.id); cerrarHoja(); toast('Crédito borrado');
  },
  pagarCuota: (el) => {
    const cr = D().creditos.find((x) => x.id === el.dataset.id);
    const pag = cr.responsable === 'conjunto' ? store.yo : cr.responsable;
    abrirHoja('pago', { creditoId: cr.id, monto: C.pesos(cr.cuota).slice(1), pagador: pag, cuentaId: cuentasDe(pag)[0]?.id || '', fecha: C.hoy() });
  },
  guardarPago,
  nuevaCuenta: () => abrirHoja('cuenta', { nombre: '', dueno: store.yo, saldoHoy: '' }),
  editarCuenta: (el) => { const c = cuenta(el.dataset.id); const s = C.saldoCuenta(c, D().movimientos); abrirHoja('cuenta', { id: c.id, nombre: c.nombre, dueno: c.dueno, saldoHoy: (s < 0 ? '-' : '') + C.pesos(Math.abs(s)).slice(1) }); },
  guardarCuenta,
  archivarCuenta: async () => {
    if (estado.confirmar !== 'archivarCuenta') { estado.confirmar = 'archivarCuenta'; pintarHoja(); return; }
    await store.actualizar('cuentas', estado.F.id, { archivada: true }); cerrarHoja(); toast('Cuenta oculta');
  },
  presupuestos: () => {
    const pres = {}; const aj = D().ajustes || {};
    for (const [k, v] of Object.entries(aj.presupuestos || {})) if (v) pres[k] = C.pesos(v).slice(1);
    abrirHoja('presupuestos', { pres, nueva: '' });
  },
  agregarCat: async () => {
    const n = (estado.F.nueva || '').trim(); if (!n) return;
    const cats = [...(D().ajustes?.categorias || [])];
    if (!cats.includes(n)) { cats.splice(cats.length - 3, 0, n); await store.guardarAjustes({ categorias: cats }); }
    estado.F.nueva = ''; pintarHoja();
  },
  guardarPres: async () => {
    const pres = {};
    for (const [k, v] of Object.entries(estado.F.pres)) { const n = C.leerPesos(v); if (n) pres[k] = n; }
    await store.guardarAjustes({ presupuestos: pres }); cerrarHoja(); toast('Presupuestos guardados');
  },
  nuevoEspacio: () => abrirHoja('espacio', { nombre: '', desc: '', tipo: 'hogar', icono: 'estrella' }),
  editarEspacio: (el) => { const x = espacio(el.dataset.id); abrirHoja('espacio', { id: x.id, nombre: x.nombre, desc: x.desc || '', tipo: x.tipo, icono: x.icono }); },
  guardarEspacio,
  tema: () => { ls.set('tema', temaOscuro() ? 'claro' : 'oscuro'); aplicarTema(); render(); },
  setTema: (el) => { ls.set('tema', el.dataset.t); aplicarTema(); render(); },
  mes: (el) => { estado[el.dataset.k] = C.moverMes(estado[el.dataset.k], Number(el.dataset.d)); render(); },
  filtroEsp: (el) => { estado.filtroEsp = el.dataset.id; render(); },
  soy: async (el) => { store.elegirPersona(el.dataset.p); arrancarApp(); },
  google: async () => { try { await store.entrarGoogle(); } catch (err) { pintarLogin({ error: err.message }); } },
  salir: async () => { await store.salir(); location.hash = '#/inicio'; location.reload(); },
  reenviar: async () => { await store.reenviarVerificacion(); toast('Correo enviado de nuevo'); },
  yaVerifique: () => store.yaVerifique(),
  exportarCSV,
  respaldo: () => descargar(`pipe-y-luu-respaldo-${C.hoy()}.json`, JSON.stringify(D(), null, 1), 'application/json'),
  instalar: async () => { const p = window.__instalar; if (p) { p.prompt(); await p.userChoice; window.__instalar = null; render(); } },
  borrarTodo: async () => {
    if (estado.confirmar !== 'borrarTodo') { estado.confirmar = 'borrarTodo'; toast('Toca otra vez para borrar todo'); setTimeout(() => (estado.confirmar = null), 4000); return; }
    await store.borrarTodo(); location.reload();
  },
  responder: (el) => { estado.importacion.respuestas[el.dataset.id] = el.dataset.v === '1'; render(); },
  toggleSaldos: (el) => { estado.importacion.usarSaldos = el.checked; },
  reiniciarImport: () => { estado.importacion = null; render(); },
  confirmarImport,
};

// Hoja simple para editar pagos de "saldar" y aportes a metas (solo monto, fecha y borrar)
hojas.movSimple = {
  html(F) {
    return `<div class="agarre"></div><div class="cab"><h3>${F.tipo === 'saldo' ? 'Pago entre ustedes' : 'Aporte a meta'}</h3><button type="button" class="btn-icono" data-a="cerrar" aria-label="Cerrar">${I.x()}</button></div>
      <div class="monto-grande"><div class="fila"><span class="signo">$</span><input inputmode="numeric" value="${e(F.monto)}" data-f="monto" data-pesos aria-label="Monto"></div></div>
      <div class="panel"><div class="linea"><span>Fecha</span><input type="date" value="${e(F.fecha)}" data-f="fecha" aria-label="Fecha"></div></div>
      <div class="pie"><button type="button" class="btn-primario" data-a="guardarMov">Guardar cambios</button>
      <button type="button" class="btn btn-peligro" style="width:100%;margin-top:10px" data-a="borrarMov">${estado.confirmar === 'borrarMov' ? '¿Seguro? Toca otra vez para borrar' : 'Borrar'}</button></div>`;
  },
};

// ================= EVENTOS =================
document.addEventListener('click', (ev) => {
  const set = ev.target.closest('[data-set]');
  if (set && estado.hoja) {
    const h = hojas[estado.hoja];
    (h.set || ((F, k, v) => { F[k] = v; }))(estado.F, set.dataset.set, set.dataset.v);
    estado.F.error = ''; pintarHoja(); return;
  }
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const fn = acciones[el.dataset.a];
  if (fn) { if (el.tagName !== 'INPUT') ev.preventDefault(); fn(el, ev); }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.matches('[data-buscar]')) { estado.busqueda = t.value; clearTimeout(t._t); t._t = setTimeout(() => { const pos = t.selectionStart; render(); const n = $('[data-buscar]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250); return; }
  if (t.matches('[data-pres]')) {
    estado.F.pres[t.dataset.pres] = formatearPesosVivo(t);
    const tot = Object.values(estado.F.pres).reduce((s, v) => s + C.leerPesos(v), 0);
    const el = $('[data-total]'); if (el) el.textContent = C.pesos(tot);
    return;
  }
  if (!t.matches('[data-f]') || !estado.hoja) return;
  const k = t.dataset.f;
  estado.F[k] = t.matches('[data-pesos]') ? formatearPesosVivo(t) : t.value;
  if (t.tagName === 'SELECT') {
    if (hojas[estado.hoja].set) hojas[estado.hoja].set(estado.F, k, t.value);
    pintarHoja();
  } else actualizarVivo(); // no se repinta toda la hoja: así no se pierde el foco al pasar al siguiente campo
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.matches('[data-archivo]') && t.files[0]) { leerArchivo(t.files[0]); return; }
});
document.addEventListener('submit', async (ev) => {
  const f = ev.target;
  if (f.dataset.form !== 'login') return;
  ev.preventDefault();
  const datos = new FormData(f);
  const accion = ev.submitter?.value || 'entrar';
  try {
    if (accion === 'crear') await store.crearCuentaCorreo(datos.get('correo'), datos.get('clave'));
    else await store.entrarCorreo(datos.get('correo'), datos.get('clave'));
  } catch (err) { pintarLogin({ error: err.message }); }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && estado.hoja) cerrarHoja(); });

// Escribe los puntos de miles mientras la persona digita (42300 → 42.300)
function formatearPesosVivo(input) {
  const negativo = input.value.trim().startsWith('-');
  const digitos = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const fmt = (negativo ? '-' : '') + digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (input.value !== fmt) {
    const desdeFin = input.value.length - (input.selectionEnd ?? input.value.length);
    input.value = fmt;
    const pos = Math.max(0, fmt.length - desdeFin);
    try { input.setSelectionRange(pos, pos); } catch {}
  }
  return fmt;
}
function actualizarVivo() {
  if (!estado.hoja) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = hojas[estado.hoja].html(estado.F);
  tmp.querySelectorAll('[data-vivo]').forEach((n) => {
    const v = $(`.hoja [data-vivo="${n.dataset.vivo}"]`);
    if (v && v.innerHTML !== n.innerHTML) v.innerHTML = n.innerHTML;
  });
  const t = $('.hoja [data-total]'); const n = tmp.querySelector('[data-total]'); if (t && n) t.textContent = n.textContent;
}

// ================= RUTAS Y DIBUJO =================
function ruta() {
  const h = location.hash.replace(/^#\/?/, '') || 'inicio';
  const [r, p] = h.split('/');
  return { r, p };
}
function render() {
  if (!store.yo) return;
  const { r, p } = ruta();
  const vistas = { inicio: vInicio, movimientos: vMovimientos, espacios: vEspacios, espacio: () => vEspacio(p), metas: vMetas, creditos: vCreditos, mas: vMas, importar: vImportar };
  const v = vistas[r] || vInicio;
  const app = $('#app');
  const banner = store.modo === 'local' ? `<div class="banner-prueba">Modo prueba · los datos viven solo en este celular</div>` : '';
  const err = store.errorDatos ? `<div class="banner-prueba" style="color:var(--danger)">${e(store.errorDatos)}</div>` : '';
  app.innerHTML = banner + err + v() + (['importar', 'mas'].includes(r) ? '' : nav(r === 'espacio' ? 'espacios' : r));
  const titulos = { inicio: 'Inicio', movimientos: 'Movimientos', espacios: 'Espacios', espacio: espacio(p)?.nombre || 'Espacio', metas: 'Metas', creditos: 'Créditos', mas: 'Ajustes', importar: 'Importar' };
  document.title = `${titulos[r] || 'Inicio'} · Pipe & Luu`;
}
let rutaPrevia = '';
window.addEventListener('hashchange', () => {
  if (estado.hoja) cerrarHoja();
  const r = ruta().r;
  if (r !== rutaPrevia) window.scrollTo(0, 0);
  rutaPrevia = r;
  render();
});

function pintarLogin(info = {}) {
  $('#app').innerHTML = vLogin(info);
}

function arrancarApp() {
  vistoAntes = ls.get('visto:' + store.yo, 0);
  render();
  // Marca como visto lo de ahora (lo nuevo del otro se ve con un puntico la próxima vez)
  setTimeout(() => ls.set('visto:' + store.yo, Date.now()), 4000);
}

store.suscribir(() => {
  if (!store.yo) { if (store.modo === 'nube') pintarLogin(); return; }
  if (!$('.nav') && !$('.vista')) { arrancarApp(); return; }
  render();
  if (estado.hoja) {/* la hoja abierta no se repinta para no borrar lo que estás escribiendo */}
});

window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); window.__instalar = ev; });

(async function iniciar() {
  aplicarTema();
  try {
    const r = await store.iniciar();
    if (r.necesitaLogin) pintarLogin(r); else arrancarApp();
  } catch (err) {
    console.error(err);
    $('#app').innerHTML = `<div class="login"><h1>Ups</h1><p>No se pudo arrancar la app: ${e(err.message)}</p><p class="ayuda">Revisa tu conexión a internet la primera vez que la abras.</p></div>`;
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
