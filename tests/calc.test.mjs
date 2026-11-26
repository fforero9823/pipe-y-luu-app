import assert from 'node:assert/strict';
import * as C from '../js/calc.js';

// Dinero
assert.equal(C.pesos(2340000), '$2.340.000');
assert.equal(C.pesos(-42300), '−$42.300');
assert.equal(C.leerPesos('42.300'), 42300);
assert.equal(C.leerPesos('$ 1.200.000'), 1200000);
assert.equal(C.leerPesos('1234567,89'), 1234568);
assert.equal(C.leerPesos('1,234,567.89'), 1234568);
assert.equal(C.leerPesos('1.234.567,89'), 1234568);
assert.equal(C.leerPesos('42300'), 42300);
assert.equal(C.leerPesos('353.49'), 353);

// Fechas locales
assert.equal(C.mesDe('2026-12-01'), '2026-12');
assert.equal(C.moverMes('2026-12', 1), '2027-01');
assert.equal(C.moverMes('2026-01', -1), '2025-12');
assert.equal(C.nombreMes('2026-11'), 'Noviembre 2026');
assert.equal(C.fechaCorta('2026-11-26', '2026-11-26'), 'hoy');
assert.equal(C.fechaCorta('2026-11-25', '2026-11-26'), 'ayer');
assert.equal(C.fechaCorta('2026-11-24', '2026-11-26'), '24 nov');
assert.equal(C.diasEntre('2026-11-26', '2026-12-05'), 9);

// Deudas
const movs = [
  { tipo: 'gasto', monto: 42300, pagador: 'luu', division: { pipe: 50, luu: 50 } },   // Pipe debe 21150
  { tipo: 'gasto', monto: 80000, pagador: 'pipe', division: { pipe: 100, luu: 0 } },  // nada
  { tipo: 'gasto', monto: 100001, pagador: 'pipe', division: { pipe: 50, luu: 50 } }, // Luu debe 50000 (pipe 50001)
  { tipo: 'ingreso', monto: 720000, pagador: 'luu', division: { pipe: 50, luu: 50 } }, // Luu debe 360000
];
const neto = C.saldoEntreDos(movs);
assert.equal(neto, -21150 + 50000 + 360000);
const saldar = { tipo: 'saldo', monto: neto, pagador: 'luu' };
assert.equal(C.saldoEntreDos([...movs, saldar]), 0);
assert.equal(C.textoDeuda(neto, 'pipe').texto, 'Luu te debe');
assert.equal(C.textoDeuda(-5, 'pipe').texto, 'Le debes a Luu');
assert.equal(C.textoDeuda(0.4, 'pipe').claro, true);

// Saldos de cuenta
const nequi = { id: 'n', saldoInicial: 1000 };
const nu = { id: 'u', saldoInicial: 0 };
const ms = [
  { tipo: 'ingreso', monto: 500, cuentaId: 'n' },
  { tipo: 'gasto', monto: 200, cuentaId: 'n' },
  { tipo: 'transferencia', monto: 300, cuentaId: 'n', cuentaDestinoId: 'u' },
  { tipo: 'gasto', monto: 100, cuentaId: 'n', cuentaDestinoId: 'u', categoria: 'Transferencia' },
];
assert.equal(C.saldoCuenta(nequi, ms), 1000 + 500 - 200 - 300 - 100);
assert.equal(C.saldoCuenta(nu, ms), 400);

// Resumen excluye transferencias
const r = C.resumenMes([
  { tipo: 'gasto', monto: 100, fecha: '2026-11-03', categoria: 'Mercado' },
  { tipo: 'gasto', monto: 999, fecha: '2026-11-03', categoria: 'Transferencia' },
  { tipo: 'ingreso', monto: 50, fecha: '2026-11-04' },
  { tipo: 'gasto', monto: 7, fecha: '2026-10-31', categoria: 'Mercado' },
], '2026-11');
assert.deepEqual([r.gastos, r.ingresos], [100, 50]);

// Créditos
assert.equal(C.eaAMensual(23.87).toFixed(2), '1.80');
assert.equal(C.mensualAEa(1.8).toFixed(1), '23.9');
const cuota = C.cuotaFija(10000000, 1.8, 36);
assert.ok(cuota > 375000 && cuota < 385000, 'cuota ' + cuota);
assert.equal(C.saldoTrasPagos(10000000, 1.8, 36, 36), 0);
assert.equal(C.saldoTrasPagos(10000000, 1.8, 36, 0), 10000000);
const cr = { id: 'c1', tipo: 'plazos', plazo: 12, cuotasPagadasInicial: 8, cuota: 8242, diaPago: 5 };
const est = C.estadoCredito(cr, [{ tipo: 'gasto', creditoId: 'c1', fecha: '2026-11-03', monto: 8242 }], '2026-11-26');
assert.equal(est.pagadas, 9);
assert.equal(est.pagadaEsteMes, true);
assert.equal(est.proxima, '2026-12-05');
assert.equal(est.diasFaltan, 9);
assert.equal(est.saldo, 3 * 8242);

// Metas
const meta = { id: 'm', objetivo: 900000, inicial: 480000, fechaLimite: '2027-03' };
const em = C.estadoMeta(meta, [{ tipo: 'ahorro', metaId: 'm', monto: 20000 }], '2026-11-26');
assert.equal(em.ahorrado, 500000);
assert.equal(em.pct, 56);
assert.ok(em.porQuincena > 0 && em.quincenas >= 8, JSON.stringify(em));

console.log('calc: todas las pruebas pasaron ✓');
