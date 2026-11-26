// store.js — Dónde viven los datos.
// Dos modos con la misma "interfaz":
//   • local: todo en este celular (localStorage). Sirve para probar.
//   • nube:  Firebase Firestore, en tiempo real entre los dos celulares, y funciona sin internet.
//
// Analogía: el store es la "caja registradora". Las pantallas le piden datos
// y le dicen "anota esto", sin saber si la caja está en el celular o en la nube.

import { CONFIG } from './config.js';
import { ESPACIOS, CUENTAS, ajustesIniciales } from './defaults.js';
import { uid } from './calc.js';

export const COLECCIONES = ['movimientos', 'cuentas', 'espacios', 'metas', 'creditos'];
const FB = 'https://www.gstatic.com/firebasejs/13.4.0/';

function vacio() {
  return { movimientos: [], cuentas: [], espacios: [], metas: [], creditos: [], ajustes: null };
}

export function hayNube() {
  return Boolean(CONFIG.firebase && CONFIG.firebase.apiKey && CONFIG.firebase.projectId);
}

// ------------------------------------------------------------------
class StoreBase {
  constructor() {
    this.datos = vacio();
    this.oyentes = new Set();
    this.yo = null;          // 'pipe' | 'luu'
    this.usuario = null;     // { correo, nombre }
    this.listo = false;
  }
  suscribir(fn) { this.oyentes.add(fn); return () => this.oyentes.delete(fn); }
  avisar() { for (const fn of this.oyentes) { try { fn(this.datos); } catch (e) { console.error(e); } } }
  ordenar() {
    const d = this.datos;
    d.movimientos.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creadoEn || 0) - (a.creadoEn || 0));
    d.cuentas.sort((a, b) => (a.orden || 99) - (b.orden || 99));
    d.espacios.sort((a, b) => (a.orden || 99) - (b.orden || 99));
    d.metas.sort((a, b) => (a.orden || 99) - (b.orden || 99) || (a.creadoEn || 0) - (b.creadoEn || 0));
    d.creditos.sort((a, b) => (a.diaPago || 0) - (b.diaPago || 0));
  }
  sello(obj) { return { ...obj, creadoPor: obj.creadoPor || this.yo, creadoEn: obj.creadoEn || Date.now() }; }
}

// ------------------------------------------------------------------
class StoreLocal extends StoreBase {
  constructor() {
    super();
    this.modo = 'local';
    this.clave = 'pyl:datos:v1';
  }
  leer() {
    try { return JSON.parse(localStorage.getItem(this.clave)) || null; } catch { return null; }
  }
  guardar() {
    try {
      const { movimientos, cuentas, espacios, metas, creditos, ajustes } = this.datos;
      localStorage.setItem(this.clave, JSON.stringify({ movimientos, cuentas, espacios, metas, creditos, ajustes }));
    } catch (e) { console.warn('No se pudo guardar en este navegador', e); }
  }
  async iniciar() {
    let yo = null;
    try { yo = localStorage.getItem('pyl:yo'); } catch {}
    const guardado = this.leer();
    if (guardado) Object.assign(this.datos, vacio(), guardado);
    if (!this.datos.ajustes) {
      this.datos.ajustes = ajustesIniciales();
      this.datos.espacios = ESPACIOS.map((e) => ({ ...e }));
      this.datos.cuentas = CUENTAS.map((c) => ({ ...c }));
      this.guardar();
    }
    this.ordenar();
    this.listo = true;
    if (yo === 'pipe' || yo === 'luu') this.elegirPersona(yo);
    return { necesitaLogin: !this.yo };
  }
  elegirPersona(p) {
    this.yo = p;
    this.usuario = { nombre: CONFIG.personas[p].nombre, correo: 'modo prueba' };
    try { localStorage.setItem('pyl:yo', p); } catch {}
  }
  async salir() { this.yo = null; try { localStorage.removeItem('pyl:yo'); } catch {} }
  async agregar(col, obj) {
    const nuevo = this.sello({ ...obj, id: obj.id || uid() });
    this.datos[col].push(nuevo);
    this.ordenar(); this.guardar(); this.avisar();
    return nuevo.id;
  }
  async actualizar(col, id, cambios) {
    const i = this.datos[col].findIndex((x) => x.id === id);
    if (i >= 0) this.datos[col][i] = { ...this.datos[col][i], ...cambios, editadoEn: Date.now() };
    this.ordenar(); this.guardar(); this.avisar();
  }
  async borrar(col, id) {
    this.datos[col] = this.datos[col].filter((x) => x.id !== id);
    this.guardar(); this.avisar();
  }
  async guardarAjustes(cambios) {
    this.datos.ajustes = { ...this.datos.ajustes, ...cambios };
    this.guardar(); this.avisar();
  }
  async lote(ops, progreso) {
    // ops: [{col, obj}] o [{col, id, borrar:true}]
    let n = 0;
    for (const op of ops) {
      if (op.borrar) this.datos[op.col] = this.datos[op.col].filter((x) => x.id !== op.id);
      else {
        const nuevo = this.sello({ ...op.obj, id: op.obj.id || uid() });
        const i = this.datos[op.col].findIndex((x) => x.id === nuevo.id);
        if (i >= 0) this.datos[op.col][i] = { ...this.datos[op.col][i], ...nuevo };
        else this.datos[op.col].push(nuevo);
      }
      if (++n % 200 === 0 && progreso) progreso(n, ops.length);
    }
    this.ordenar(); this.guardar(); this.avisar();
    if (progreso) progreso(ops.length, ops.length);
  }
  async borrarTodo() {
    try { localStorage.removeItem(this.clave); } catch {}
    this.datos = vacio();
  }
}

// ------------------------------------------------------------------
class StoreNube extends StoreBase {
  constructor() {
    super();
    this.modo = 'nube';
    this.desuscribir = [];
  }
  async cargarSDK() {
    if (this.fb) return this.fb;
    const [app, auth, fs] = await Promise.all([
      import(FB + 'firebase-app.js'),
      import(FB + 'firebase-auth.js'),
      import(FB + 'firebase-firestore.js'),
    ]);
    const fbApp = app.initializeApp(CONFIG.firebase);
    let db;
    try {
      db = fs.initializeFirestore(fbApp, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      });
    } catch (e) {
      db = fs.getFirestore(fbApp);
    }
    this.fb = { app, auth, fs, fbApp, db, a: auth.getAuth(fbApp) };
    return this.fb;
  }
  ruta(col) { return `hogares/${CONFIG.hogar}/${col}`; }

  async personaDe(correo) {
    const c = (correo || '').trim().toLowerCase();
    if (!c) return null;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(c));
    const h = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
    for (const p of ['pipe', 'luu']) {
      const per = CONFIG.personas[p];
      if (per.correoHash === h || (per.correo || '').toLowerCase() === c) return p;
    }
    return null;
  }

  async iniciar() {
    const { auth, a } = await this.cargarSDK();
    try { await auth.getRedirectResult(a); } catch (e) { this.errorLogin = traducirError(e); }
    return new Promise((resolve) => {
      let primera = true;
      auth.onAuthStateChanged(a, async (user) => {
        const responder = (r) => { if (primera) { primera = false; resolve(r); } else this.avisar(); };
        this.limpiar();
        if (!user) { this.yo = null; this.listo = true; return responder({ necesitaLogin: true }); }
        const yo = await this.personaDe(user.email);
        if (!yo) {
          this.errorLogin = `El correo ${user.email} no está autorizado en esta app.`;
          await auth.signOut(a);
          return;
        }
        if (!user.emailVerified) {
          this.yo = null;
          this.pendienteVerificar = user.email;
          return responder({ necesitaLogin: true, verificar: true });
        }
        this.yo = yo;
        this.usuario = { nombre: CONFIG.personas[yo].nombre, correo: user.email };
        await this.escuchar();
        responder({ necesitaLogin: false });
      });
    });
  }

  async escuchar() {
    const { fs, db } = this.fb;
    const pendientes = new Set([...COLECCIONES, 'ajustes']);
    await new Promise((resolve) => {
      const listo = (k) => { pendientes.delete(k); if (!pendientes.size) resolve(); };
      for (const col of COLECCIONES) {
        const off = fs.onSnapshot(fs.collection(db, this.ruta(col)), (snap) => {
          this.datos[col] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          this.ordenar();
          listo(col);
          if (this.listo) this.avisar();
        }, (err) => { console.error(col, err); this.errorDatos = traducirError(err); listo(col); this.avisar(); });
        this.desuscribir.push(off);
      }
      const off = fs.onSnapshot(fs.doc(db, this.ruta('ajustes') + '/general'), (snap) => {
        this.datos.ajustes = snap.exists() ? snap.data() : null;
        listo('ajustes');
        if (this.listo) this.avisar();
      }, (err) => { console.error(err); this.errorDatos = traducirError(err); listo('ajustes'); });
      this.desuscribir.push(off);
    });
    if (!this.datos.ajustes && !this.errorDatos) await this.sembrar();
    this.listo = true;
  }

  async sembrar() {
    // ids fijos: si los dos celulares siembran a la vez, no se duplica nada.
    const ops = [
      ...ESPACIOS.map((e) => ({ col: 'espacios', obj: e })),
      ...CUENTAS.map((c) => ({ col: 'cuentas', obj: c })),
    ];
    await this.lote(ops);
    await this.guardarAjustes(ajustesIniciales());
  }

  limpiar() { this.desuscribir.forEach((f) => f()); this.desuscribir = []; this.datos = vacio(); }

  // ---- Login ----
  async entrarGoogle() {
    const { auth, a } = await this.cargarSDK();
    const prov = new auth.GoogleAuthProvider();
    prov.setCustomParameters({ prompt: 'select_account' });
    try {
      await auth.signInWithPopup(a, prov);
    } catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
        await auth.signInWithRedirect(a, prov);
      } else throw new Error(traducirError(e));
    }
  }
  async entrarCorreo(correo, clave) {
    const { auth, a } = await this.cargarSDK();
    if (!(await this.personaDe(correo))) throw new Error('Ese correo no está autorizado en esta app.');
    try { await auth.signInWithEmailAndPassword(a, correo.trim(), clave); }
    catch (e) { throw new Error(traducirError(e)); }
  }
  async crearCuentaCorreo(correo, clave) {
    const { auth, a } = await this.cargarSDK();
    if (!(await this.personaDe(correo))) throw new Error('Ese correo no está autorizado en esta app.');
    try {
      const cred = await auth.createUserWithEmailAndPassword(a, correo.trim(), clave);
      await auth.sendEmailVerification(cred.user);
    } catch (e) { throw new Error(traducirError(e)); }
  }
  async reenviarVerificacion() {
    const { auth, a } = await this.cargarSDK();
    if (a.currentUser) await auth.sendEmailVerification(a.currentUser);
  }
  async yaVerifique() {
    const { a } = await this.cargarSDK();
    if (a.currentUser) { await a.currentUser.reload(); await a.currentUser.getIdToken(true); }
    location.reload();
  }
  async salir() { const { auth, a } = await this.cargarSDK(); this.limpiar(); await auth.signOut(a); }

  // ---- Escritura ----
  async agregar(col, obj) {
    const { fs, db } = this.fb;
    const id = obj.id || uid();
    const data = limpiarUndefined(this.sello({ ...obj }));
    delete data.id;
    await fs.setDoc(fs.doc(db, this.ruta(col), id), data);
    return id;
  }
  async actualizar(col, id, cambios) {
    const { fs, db } = this.fb;
    const data = limpiarUndefined({ ...cambios, editadoEn: Date.now(), editadoPor: this.yo });
    delete data.id;
    await fs.setDoc(fs.doc(db, this.ruta(col), id), data, { merge: true });
  }
  async borrar(col, id) {
    const { fs, db } = this.fb;
    await fs.deleteDoc(fs.doc(db, this.ruta(col), id));
  }
  async guardarAjustes(cambios) {
    const { fs, db } = this.fb;
    await fs.setDoc(fs.doc(db, this.ruta('ajustes') + '/general'), limpiarUndefined(cambios), { merge: true });
  }
  async lote(ops, progreso) {
    const { fs, db } = this.fb;
    for (let i = 0; i < ops.length; i += 400) {
      const b = fs.writeBatch(db);
      for (const op of ops.slice(i, i + 400)) {
        if (op.borrar) { b.delete(fs.doc(db, this.ruta(op.col), op.id)); continue; }
        const id = op.obj.id || uid();
        const data = limpiarUndefined(this.sello({ ...op.obj }));
        delete data.id;
        b.set(fs.doc(db, this.ruta(op.col), id), data, { merge: true });
      }
      await b.commit();
      if (progreso) progreso(Math.min(i + 400, ops.length), ops.length);
    }
  }
}

function limpiarUndefined(o) {
  const r = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) r[k] = v;
  return r;
}

function traducirError(e) {
  const c = (e && e.code) || '';
  const t = {
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/user-not-found': 'No hay una cuenta con ese correo. Créala primero.',
    'auth/email-already-in-use': 'Ese correo ya tiene cuenta. Usa "Entrar".',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/invalid-email': 'Ese correo no es válido.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
    'auth/cancelled-popup-request': 'Se cerró la ventana de Google antes de terminar.',
    'auth/network-request-failed': 'Sin conexión a internet. Intenta de nuevo.',
    'auth/unauthorized-domain': 'Falta autorizar este dominio en Firebase (mira la guía, paso 4).',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    'permission-denied': 'Firebase no dejó ver los datos: revisa las reglas de seguridad (guía, paso 5).',
  };
  return t[c] || (e && e.message) || 'Algo salió mal.';
}

export function crearStore() {
  return hayNube() ? new StoreNube() : new StoreLocal();
}
