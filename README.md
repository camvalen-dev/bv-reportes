# BV Reportes — Guía de despliegue paso a paso

App web + PWA para que los líderes de cuadrilla generen el reporte diario de obra, con:
- **Firebase Auth** → gestión de cuentas con dos roles: administradores y líderes.
- **Firestore** → guarda obras, actividades, correos destinatarios y usuarios.
- **Vercel** → hospedaje gratuito con URL pública (`https://bv-reportes.vercel.app`).
- **Resend** → envía el Excel por correo.
- **PWA** → instalable en el celular como app nativa, sin App Store.

**Costo total: $0** en planes gratuitos.

---

## Roles del sistema

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Ver todas las obras, crear/editar obras y actividades, gestionar correos destinatarios, **crear y eliminar usuarios**, asignar líderes a obras, generar reportes de cualquier obra. |
| **Líder de cuadrilla** | Solo ve la obra que el admin le asignó. Va directo a la pantalla de generar reporte. No puede ver ni modificar otras obras, ni crear usuarios, ni acceder al panel admin. |

---

## Lo que vas a tener al final

1. URL pública (tipo `tu-app.vercel.app`).
2. Pantalla de login. Cada usuario inicia sesión con su correo y contraseña.
3. Los admins gestionan obras, actividades, correos y usuarios.
4. Los líderes ven solo su obra y emiten reportes que se descargan como Excel y se envían por correo a los destinatarios configurados.
5. Sincronización en tiempo real entre todos los dispositivos.

---

## Pre-requisitos

Instala (una sola vez):

1. **Node.js** versión 18+ — [nodejs.org](https://nodejs.org)
2. **Git** — [git-scm.com](https://git-scm.com)
3. **VS Code** — [code.visualstudio.com](https://code.visualstudio.com)
4. Cuenta en **GitHub** — [github.com](https://github.com)

---

## PARTE A — Preparar el proyecto en tu computador (10 min)

1. Descomprime `bv-reportes.zip` en, por ejemplo, `Documentos/bv-reportes`.
2. Abre la carpeta con VS Code: `Archivo → Abrir carpeta`.
3. Abre la terminal: `Terminal → Nueva terminal`.
4. Instala dependencias:
   ```bash
   npm install
   ```
5. Detén pruebas locales si las haces; las haremos directamente en producción para no complicar la configuración de variables de entorno locales.

---

## PARTE B — Configurar Firebase (20 min)

### B.1 Crear proyecto

1. Ve a [console.firebase.google.com](https://console.firebase.google.com).
2. Clic en **"Agregar proyecto"** → nombre `bv-reportes` → desactiva Analytics → **"Crear"**.

### B.2 Activar Firestore

1. Menú izquierdo → **"Build" → "Firestore Database"** → **"Crear base de datos"**.
2. Ubicación: **`southamerica-east1`** (São Paulo, lo más cercano a Chile).
3. **"Iniciar en modo de prueba"** → **"Habilitar"**.

### B.3 Activar Authentication (NUEVO)

1. Menú izquierdo → **"Build" → "Authentication"** → **"Comenzar"**.
2. Pestaña **"Sign-in method"** → clic en **"Correo electrónico/Contraseña"**.
3. Activa solo el primer toggle **"Correo electrónico/Contraseña"**. Deja desactivado el de "Vínculo de correo".
4. Clic en **"Guardar"**.

### B.4 Obtener configuración del cliente (Web App)

1. Engranaje ⚙️ arriba a la izquierda → **"Configuración del proyecto"**.
2. Sección **"Tus apps"** → ícono **`</>`** (Web).
3. Nombre: `bv-reportes-web` → NO marques Hosting → **"Registrar app"**.
4. **Copia los 6 valores** del bloque `firebaseConfig` que aparece. Los necesitas para Vercel después.

### B.5 Obtener Service Account Key (NUEVO — clave para Auth desde el servidor)

Esta clave permite al servidor de Vercel crear y eliminar usuarios sin romper la sesión del admin.

1. En **"Configuración del proyecto"** → pestaña **"Cuentas de servicio"**.
2. Clic en **"Generar nueva clave privada"** → **"Generar clave"**.
3. Se descarga un archivo `.json`. **No lo subas a GitHub** ni lo compartas. Lo abrirás con VS Code.
4. Abre el JSON descargado, **copia todo el contenido completo** (es un objeto que empieza con `{` y termina con `}`).
5. Guárdalo a mano — lo pegarás en una variable de entorno de Vercel.

### B.6 Reglas de Firestore con permisos por rol (IMPORTANTE)

Después de probar todo en modo test, reemplaza las reglas para que solo los autenticados puedan leer/escribir y los líderes solo vean su obra:

Ve a **Firestore → Reglas** y pega:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function getRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    function isAdmin() {
      return isSignedIn() && getRole() == 'admin';
    }
    function getMyObra() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.obraId;
    }

    // Usuarios: solo admins crean/editan/eliminan. Cualquier autenticado puede leer su propio doc.
    match /users/{uid} {
      allow read: if isSignedIn() && (request.auth.uid == uid || isAdmin());
      allow write: if isAdmin();
    }

    // Obras: admin todo; líder solo lee su propia obra.
    match /obras/{obraId} {
      allow read: if isAdmin() || (isSignedIn() && getMyObra() == obraId);
      allow write: if isAdmin();
    }
  }
}
```

Aplica estas reglas **después** de crear el primer usuario administrador (Parte F.2). Mientras estés en modo test, todo funciona sin reglas estrictas.

---

## PARTE C — Configurar Resend (envío de correos) (10 min)

### C.1 Cuenta y API Key

1. Regístrate en [resend.com](https://resend.com).
2. Confirma tu correo.
3. Menú lateral → **"API Keys"** → **"Create API Key"**.
4. Nombre: `bv-reportes`. Permission: **"Sending access"** → **"Add"**.
5. **Copia la clave** (empieza con `re_...`). No podrás verla de nuevo.

### C.2 Dominio de envío

Para empezar usa **`onboarding@resend.dev`** (gratuito, sin DNS). Limitación: solo puede enviar al correo de la cuenta Resend.

Para enviar a cualquier correo, verifica un dominio propio en **"Domains" → "Add Domain"** (requiere agregar 3 registros DNS en tu proveedor).

---

## PARTE D — Subir a GitHub (5 min)

1. En GitHub crea un repo `bv-reportes` privado, sin README.
2. En la terminal de VS Code:
   ```bash
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/bv-reportes.git
   git push -u origin main
   ```

---

## PARTE E — Publicar en Vercel (15 min)

### E.1 Conectar y configurar

1. [vercel.com](https://vercel.com) → login con GitHub.
2. **"Add New..." → "Project"** → selecciona `bv-reportes`.
3. **NO toques** el build (Vercel detecta Vite solo).

### E.2 Variables de entorno

Antes de hacer deploy, expande **"Environment Variables"** y agrega TODAS estas:

| Nombre | Valor | Origen |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase B.4 |
| `VITE_FIREBASE_AUTH_DOMAIN` | `bv-reportes.firebaseapp.com` | Firebase B.4 |
| `VITE_FIREBASE_PROJECT_ID` | `bv-reportes` | Firebase B.4 |
| `VITE_FIREBASE_STORAGE_BUCKET` | `bv-reportes.appspot.com` | Firebase B.4 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` | Firebase B.4 |
| `VITE_FIREBASE_APP_ID` | `1:123...:web:abcd` | Firebase B.4 |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `{"type":"service_account",...}` | Firebase B.5 (JSON completo en una sola línea) |
| `RESEND_API_KEY` | `re_...` | Resend C.1 |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | Resend C.2 |

**Tip importante para `FIREBASE_SERVICE_ACCOUNT_KEY`:**
- Pégalo todo en una sola línea (Vercel lo acepta así).
- Si tu private_key tiene saltos de línea (`\n`), Vercel los trata bien si pegas el JSON tal cual del archivo descargado.

### E.3 Deploy

1. Clic en **"Deploy"** → espera 1-2 min.
2. **"Visit"** → tu app está en línea.

---

## PARTE F — Crear el primer administrador (5 min) — IMPORTANTE

Como aún no hay ningún usuario, no puedes loguearte. El primer admin se crea **manualmente** desde la consola de Firebase. Después, este admin crea a todos los demás desde la app.

### F.1 Crear el usuario en Firebase Auth

1. Firebase Console → **"Authentication" → "Users" → "Add user"**.
2. Email: el tuyo (ej `tunombre@empresa.cl`).
3. Contraseña: una fuerte que recuerdes.
4. **"Add user"**. Copia el **User UID** que aparece (parecido a `AbCdEf123456...`).

### F.2 Crear el documento en Firestore con rol admin

1. Firebase Console → **"Firestore Database" → "Datos" (Data)**.
2. Clic **"Iniciar colección"** → ID: `users` → **"Siguiente"**.
3. ID del documento: **pega el User UID** del paso anterior.
4. Agrega los siguientes campos:

| Campo | Tipo | Valor |
|---|---|---|
| `email` | string | `tunombre@empresa.cl` |
| `nombre` | string | `Tu Nombre` |
| `role` | string | `admin` |
| `obraId` | null | (selecciona "null" en el tipo) |
| `createdAt` | string | fecha actual ISO, ej. `2026-04-20T10:00:00Z` |

5. **"Guardar"**.

### F.3 Probar login

1. Abre tu URL de Vercel.
2. Ingresa con el correo y contraseña que creaste.
3. Deberías ver la pantalla principal con tu nombre arriba y un escudo dorado (rol admin).
4. Verás 3 opciones: **Líder de cuadrilla**, **Administrador**, **Usuarios**.

✅ **Si entras como admin, ya puedes crear el resto de usuarios desde la app.**

---

## PARTE G — Crear líderes desde la app (1 min por usuario)

Ahora todo se hace desde la app, sin entrar más a Firebase.

1. En tu home (logueado como admin), entra a **"Administrador"**.
2. Crea las obras necesarias y carga sus actividades (Excel) y correos destinatarios.
3. Vuelve al home → entra a **"Usuarios"**.
4. Clic en **"Crear nuevo usuario"**.
5. Llena:
   - **Nombre**: nombre completo del líder.
   - **Correo**: el correo que usará para entrar.
   - **Contraseña inicial**: dale una temporal (mínimo 6 caracteres). Comunícale al líder que la cambie después (esto se podrá hacer en una versión futura desde la app).
   - **Rol**: "Líder de cuadrilla".
   - **Obra asignada**: la obra que verá ese líder.
6. Clic en **"Crear"** → listo.

El líder ya puede entrar con sus credenciales. Verá **solo su obra** y **directamente la pantalla de generar reporte**.

---

## PARTE H — Probar todo end-to-end (5 min)

1. **Logueado como admin**:
   - Crea obra "Demo".
   - Carga Excel de actividades.
   - Agrega tu correo en "Correos de destino".
   - Crea un usuario líder asignado a "Demo".
2. **Cierra sesión** (botón ↗ arriba a la derecha).
3. **Loguéate como el líder**:
   - Verás directamente la pantalla del reporte para "Demo".
   - No verás opciones de admin.
   - Llena el reporte y emítelo.
4. Confirma que llega el correo con Excel adjunto.
5. **Vuelve a entrar como admin** y verifica que la obra sigue ahí con sus datos.

---

## PARTE I — Instalar como app en celular

### Android (Chrome)
URL → menú (3 puntos) → **"Agregar a pantalla principal"**.

### iPhone (Safari, no Chrome)
URL → botón compartir → **"Agregar a pantalla de inicio"**.

Aparece como app con su ícono. Cada líder hace esto una vez.

---

## Solución de problemas

**"Error al iniciar sesión: invalid-credential"**
→ Email o contraseña mal escritos. Mayúsculas/minúsculas importan en password.

**"Tu cuenta no tiene perfil"**
→ Existe en Firebase Auth pero falta el documento en `users/{uid}` con rol. Repite la Parte F.2 con ese UID.

**"Solo administradores pueden crear usuarios" / 403 al crear**
→ Tu usuario actual no tiene `role: "admin"` en Firestore. Verifica el documento en `users/{tu_uid}`.

**"Error al crear usuario: 500 / FIREBASE_SERVICE_ACCOUNT_KEY"**
→ La variable de entorno está mal en Vercel. Re-pega el JSON completo en una sola línea, sin comillas externas, y haz **Redeploy** (Deployments → ⋯ → Redeploy).

**"Líder no ve su obra"**
→ Su documento `users/{uid}` no tiene `obraId` correctamente asignado. Edítalo desde Firebase Console → Firestore → users → su doc.

**"Las obras no aparecen al admin"**
→ El ícono "Local" arriba indica que no hay conexión Firebase. Revisa las 6 variables `VITE_FIREBASE_*` en Vercel.

**"Líder ve datos pero no puede emitir reporte"**
→ Las reglas de Firestore están demasiado estrictas. Verifica que el line `match /obras/{obraId}` permita `read` cuando `getMyObra() == obraId`.

---

## Hacer cambios después de publicado

```bash
# Modifica el código en VS Code, luego:
git add .
git commit -m "Descripción"
git push
```
Vercel re-despliega automáticamente.

---

## Estructura del proyecto

```
bv-reportes/
├── src/
│   ├── App.jsx              ← App completa (login, admin, usuarios, líder)
│   ├── firebase.js          ← Cliente Firebase (Auth + Firestore)
│   ├── main.jsx
│   └── index.css
├── api/
│   ├── _admin.js            ← Helper Firebase Admin
│   ├── create-user.js       ← Crear usuarios (solo admin)
│   ├── delete-user.js       ← Eliminar usuarios (solo admin)
│   └── send-report.js       ← Enviar Excel por correo (Resend)
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icon-*.png
├── package.json
├── vite.config.js
├── .env.example
└── README.md
```

---

## Resumen de las cuentas

| Cuenta | Cómo se crea | Para qué |
|---|---|---|
| **Primer admin** | Manual: Firebase Console → Auth (Parte F.1) + Firestore doc (Parte F.2) | Bootstrap inicial. Una sola vez. |
| **Otros admins** | Desde la app: Usuarios → Crear, rol Admin | Más administradores |
| **Líderes** | Desde la app: Usuarios → Crear, rol Líder + obra asignada | Uno por líder de cuadrilla |

---

## Próximos pasos sugeridos

- **Que el líder cambie su propia contraseña**: agregar pantalla de perfil con `updatePassword()` de Firebase Auth.
- **Recuperar contraseña**: link "Olvidé mi contraseña" con `sendPasswordResetEmail()`.
- **Historial de reportes**: guardar cada reporte emitido en Firestore para consultas posteriores.
- **Dashboard de rendimientos**: cruzar reportes con el macro Excel para ver HH y avance acumulado.

¿Necesitas alguno de estos? Avísame.
