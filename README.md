# Pipe & Luu — Finanzas

App web instalable (PWA) para llevar las finanzas de Pipe y Luu: gastos compartidos, quién le debe a quién, espacios (Casa, Matitas, Neru, Zerenta, TDP), metas de ahorro, créditos e importación del Excel de presupuesto.

- **Sin instalar nada:** HTML, CSS y JavaScript puros. No hay que "compilar".
- **Datos:** Firebase Firestore en tiempo real y funciona sin internet. Sin configurar, corre en *modo prueba* (localStorage).
- **Para dejarla live:** lee [`GUIA.md`](GUIA.md).

## Estructura

```
index.html            entrada
css/app.css           diseño (claro/oscuro)
js/config.js          ← lo único que se edita: datos de Firebase y correos
js/app.js             pantallas
js/calc.js            matemática: pesos, fechas, deudas, créditos, metas
js/store.js           datos: modo prueba o Firebase
js/importer.js        lector del Excel
js/defaults.js        categorías, cuentas y espacios iniciales
firestore.rules       reglas de seguridad para pegar en Firebase
sw.js, manifest       para instalarla y que abra sin internet
tests/                pruebas (node tests/calc.test.mjs)
```

## Reglas de la casa (para quien toque el código)

1. El dinero se guarda en **pesos enteros**.
2. Las fechas son texto `AAAA-MM-DD` en hora local (nada de `toISOString()`).
3. Todo texto del usuario pasa por `e()` antes de ir al HTML.
