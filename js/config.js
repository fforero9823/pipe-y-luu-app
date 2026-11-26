// ============================================================
//  CONFIGURACIÓN — este es el ÚNICO archivo que tienes que editar.
//  La guía (GUIA.md) te dice de dónde sacar cada dato.
// ============================================================

export const CONFIG = {
  // 1) Pega aquí los datos de tu proyecto de Firebase.
  //    Mientras esto esté vacío, la app funciona en "modo prueba":
  //    guarda todo SOLO en el celular donde la abres.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },

  // 2) Los correos con los que cada uno va a entrar (en minúsculas).
  //    Solo estos dos correos podrán ver los datos.
  personas: {
    pipe: { nombre: 'Pipe', correo: '' },
    luu: { nombre: 'Luu', correo: '' },
  },

  // Nombre interno del hogar (no lo cambies después de empezar a usar la app)
  hogar: 'pipe-y-luu',
};
