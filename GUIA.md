# Guía para dejar Pipe & Luu funcionando (paso a paso)

Tiempo total: unos **30 minutos**, una sola vez. Todo es **gratis** y no pide tarjeta.

Piensa en la app como un restaurante:

| Pieza | Analogía | Herramienta |
|---|---|---|
| Los archivos de la app | El local | **GitHub Pages** (lo que ya usas) |
| La base de datos | La bodega donde se guarda todo | **Firebase Firestore** |
| El login | El portero que solo deja entrar a ustedes dos | **Firebase Authentication** |
| Las reglas de seguridad | La cerradura de la bodega | `firestore.rules` |

---

## Paso 1 · Subir la app a GitHub (5 min)

**Opción A — lo hago yo:** crea un repositorio vacío y dame acceso (te explico en el chat).

**Opción B — tú mismo:**
1. Entra a github.com → botón **New** (repositorio nuevo).
2. Nombre: `pipe-y-luu-app`. Márcalo **Public** (GitHub Pages gratis lo necesita; los datos NO quedan públicos, viven en Firebase con candado). Clic en **Create repository**.
3. En la página del repo: **Add file → Upload files**. Arrastra **todo el contenido** de la carpeta de la app (index.html, la carpeta `js`, `css`, `icons`, `img`, etc.). Clic en **Commit changes**.

## Paso 2 · Encender GitHub Pages (2 min)

1. En el repo: **Settings → Pages**.
2. En "Branch" elige `main` y la carpeta `/ (root)`. **Save**.
3. Espera 1–2 minutos. Tu app queda en: `https://fforero9823.github.io/pipe-y-luu-app/`

👉 Ya la puedes abrir: funciona en **modo prueba** (los datos quedan solo en ese celular). Los pasos siguientes la conectan a la nube.

## Paso 3 · Crear el proyecto en Firebase (5 min)

1. Entra a **console.firebase.google.com** con tu cuenta de Google.
2. **Crear un proyecto** → nombre `pipe-y-luu` → desactiva Google Analytics (no lo necesitas) → **Crear**.
3. En la página del proyecto, toca el ícono **`</>`** (Web). Apodo: `pipe-y-luu-app`. **No** marques Firebase Hosting. → **Registrar app**.
4. Te muestra un bloque que dice `const firebaseConfig = { apiKey: "...", ... }`. **Cópialo.**
5. Abre el archivo `js/config.js` (en GitHub: clic en el archivo → ícono del lápiz ✏️) y pega cada dato en su lugar:

```js
firebase: {
  apiKey: 'AIza...',
  authDomain: 'pipe-y-luu.firebaseapp.com',
  projectId: 'pipe-y-luu',
  storageBucket: 'pipe-y-luu.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123',
},
```

6. Los correos de cada uno van en `personas`, pero **no en texto**: como el repositorio es público, se guarda su "huella" SHA-256 (así nadie puede leerlos). *(Ya está hecho para Pipe y Luu.)*
7. **Commit changes** para guardar.

> 🔐 ¿Es peligroso que la "apiKey" se vea? No. Es como la dirección de la casa: todos la pueden ver. Lo que protege los datos son las reglas del Paso 5.

## Paso 4 · Encender el login (3 min)

1. En Firebase, menú izquierdo: **Compilación → Authentication → Comenzar**.
2. Pestaña **Método de acceso**:
   - **Google** → Habilitar → elige tu correo de soporte → Guardar.
   - **Correo electrónico/contraseña** → Habilitar (solo el primer interruptor) → Guardar.
3. Pestaña **Configuración → Dominios autorizados → Agregar dominio** → escribe `fforero9823.github.io` → Agregar.

## Paso 5 · Crear la base de datos y ponerle candado (5 min)

1. Menú izquierdo: **Compilación → Firestore Database → Crear base de datos**.
2. Ubicación: **`southamerica-east1` (São Paulo)**, la más cercana a Colombia. *(Ojo: después no se puede cambiar.)*
3. Elige **Modo de producción** → Crear.
4. Ve a la pestaña **Reglas**. Borra todo lo que hay y pega el contenido del archivo `firestore.rules`.
5. Cambia `CORREO_DE_PIPE@gmail.com` y `CORREO_DE_LUU@gmail.com` por sus correos **en minúsculas** (los mismos del Paso 3).
6. **Publicar**.

## Paso 6 · Instalar en los dos celulares (2 min cada uno)

Abre `https://fforero9823.github.io/pipe-y-luu-app/`:

- **iPhone:** en **Safari** (no Chrome) → botón **Compartir** (cuadrito con flecha ↑) → **Agregar a inicio**.
- **Android:** en **Chrome** → menú **⋮** → **Instalar app** (o "Agregar a pantalla principal").

Entra con **Google**. Si en el iPhone la ventana de Google no vuelve a la app, usa **"Crear cuenta"** con correo y contraseña (te llega un correo para confirmar).

## Paso 7 · Traer el historial (opcional)

En la app: **avatares P·L (arriba a la derecha) → Importar desde Excel** → elige el archivo de presupuesto. La app te muestra qué encontró y te hace preguntas antes de guardar.

---

## Cuando quieras cambiar algo

- Edita los archivos en GitHub y guarda. En 1–2 minutos los celulares reciben la versión nueva solos (al abrir la app con internet).
- Tus datos **no** se tocan al actualizar la app: viven en Firebase.

## Límites del plan gratis (Spark)

Unas 50.000 lecturas y 20.000 escrituras **por día**. Dos personas registrando gastos usan menos del 1 %.

## Si algo falla

| Mensaje | Qué hacer |
|---|---|
| "Falta autorizar este dominio" | Paso 4, punto 3 |
| "Firebase no dejó ver los datos" | Revisa las reglas (Paso 5) y que los correos estén en minúsculas y bien escritos |
| "Ese correo no está autorizado" | El correo no coincide con el de `js/config.js` |
| La app no se actualiza | Ciérrala del todo y ábrela de nuevo con internet |
