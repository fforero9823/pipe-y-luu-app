// ============================================================
//  CONFIGURACIÓN — este es el ÚNICO archivo que hay que editar.
// ============================================================

export const CONFIG = {
  // Datos del proyecto de Firebase (no son secretos: lo que protege
  // la información son las reglas de seguridad de Firestore).
  firebase: {
    apiKey: 'AIzaSyD3eYscCyUCoS7-fV3QqifUfTSDbJjZBMI',
    authDomain: 'pipe-y-luu.firebaseapp.com',
    projectId: 'pipe-y-luu',
    storageBucket: 'pipe-y-luu.firebasestorage.app',
    messagingSenderId: '854629177903',
    appId: '1:854629177903:web:4d5d5f910ab9d8a84f84da',
  },

  // Quién es quién. Por privacidad (el repositorio es público) no guardamos
  // los correos, sino su "huella" SHA-256 en minúsculas.
  personas: {
    pipe: { nombre: 'Pipe', correoHash: 'bcf665e68c7f7997f0fdd5569519ff3eaadc9f48835a8f81bc5374bbc15ba7db' },
    luu: { nombre: 'Luu', correoHash: '002e61986e1dd5f4d662ba9dc94c3e4b19be0152e46775552e9b6a3297c6d405' },
  },

  // Nombre interno del hogar (no lo cambies después de empezar a usar la app)
  hogar: 'pipe-y-luu',
};
