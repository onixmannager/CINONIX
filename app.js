// app.js
// Usa <script type="module" src="app.js"></script> en tus páginas

// 1. Importa las funciones de Firebase desde el CDN (versión 11.3.0)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// 2. Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDngD8Yc5tuKeLar8-AxlCSGQXZdYNBEW0",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
  storageBucket: "cinonix-3a65d.appspot.com",
  messagingSenderId: "298364890273",
  appId: "1:298364890273:web:f8d61cd538f228648f54e0",
  measurementId: "G-9L2E23K72W"
};

// 3. Inicializar Firebase (getApps() guard evita doble inicialización)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── CACHÉ de sesión (sessionStorage) ──────────────────────────────────────
// Evita un roundtrip a Firestore en cada carga de página.
// Se invalida automáticamente al cerrar el tab/navegador.
const CACHE_KEY = 'cnx_sub';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCachedSub() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null; }
    return value; // true | false
  } catch { return null; }
}

function setCachedSub(value) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ value, ts: Date.now() })); } catch {}
}

function clearCachedSub() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

// 4. Función para generar un código único de afiliado
function generateAffiliateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// 5. Función para extraer el código de referido de la URL o localStorage
function obtenerCodigoReferido() {
  const urlParams = new URLSearchParams(window.location.search);
  const refUrl = urlParams.get("ref");
  if (refUrl) {
    localStorage.setItem("referral", refUrl.toUpperCase());
    return refUrl.toUpperCase();
  }
  return localStorage.getItem("referral") || null;
}

/** 🔹 REGISTRO DE USUARIO */
window.registrarUsuario = async function(email, password, refParam) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const codigoReferido = refParam || obtenerCodigoReferido() || null;
    if (codigoReferido) localStorage.setItem("referral", codigoReferido);

    await setDoc(doc(db, "usuarios", user.uid), {
      email: email,
      subscriptionActive: false,
      afiliado: false,
      codigoAfiliado: generateAffiliateCode(),
      dineroAcumulado: 0,
      referredBy: codigoReferido,
      referidoConfirmado: false,
      referidosTotales: 0,
      referidosContados: []
    });

    clearCachedSub();
    alert("Usuario registrado correctamente.");
    window.location.href = "001login.html";
  } catch (error) {
    console.error("Error en el registro:", error.message);
    alert("Error en el registro: " + error.message);
  }
};

/** 🔹 INICIO DE SESIÓN */
window.iniciarSesion = async function(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, "usuarios", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const isActive = !!data.subscriptionActive;
      setCachedSub(isActive);
      window.location.href = isActive ? "cinonix.html" : "004pago.html";
    } else {
      alert("No se encontró el registro del usuario.");
    }
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    alert("Error al iniciar sesión: " + error.message);
  }
};

/** 🔹 RESTABLECER CONTRASEÑA */
window.restablecerContrasena = async function(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Se ha enviado un correo para restablecer la contraseña.");
  } catch (error) {
    console.error("Error al restablecer la contraseña:", error.message);
    alert("Error: " + error.message);
  }
};

/** 🔹 CONFIRMAR PAGO, ACTIVAR CUENTA Y ASIGNAR AFILIADO */
// ⚠️ Esta función fue eliminada intencionalmente.
// La activación de la suscripción NUNCA debe hacerse desde el cliente
// (cualquiera con la consola del navegador podría activarse gratis).
// Ahora se hace exclusivamente en el backend: api/verificar-pago.js,
// que verifica el TXID en la blockchain antes de tocar Firestore.
// Ver 005confirmacion.html para el flujo actual.

/** 🔹 RESTRINGIR CONTENIDO SOLO PARA SUSCRIPTORES
 *  Usa caché de sesión: evita un getDoc() en cada carga de página protegida.
 *  Si el caché dice "activo" redirige/accede sin llamar a Firestore.
 *  Si no hay caché, hace la comprobación normal y luego guarda el resultado.
 */
window.restringirContenido = function() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // Intento rápido desde caché
    const cached = getCachedSub();
    if (cached === true) return;   // acceso OK, sin llamada a Firestore
    if (cached === false) {
      alert("Debes activar tu suscripción.");
      window.location.href = "004pago.html";
      return;
    }

    // Sin caché → consulta Firestore y almacena resultado
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const isActive = !!userDocSnap.data().subscriptionActive;
        setCachedSub(isActive);
        if (!isActive) {
          alert("Debes activar tu suscripción.");
          window.location.href = "004pago.html";
        }
      } else {
        window.location.href = "004pago.html";
      }
    } catch (error) {
      console.error("Error al verificar suscripción:", error.message);
    }
  });
};

/** 🔹 REDIRIGIR DESDE INDEX SI YA PAGÓ */
export const redirigirSiPagado = function() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const cached = getCachedSub();
    if (cached === true) {
      window.location.href = "cinonix.html";
      return;
    }

    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const isActive = !!userDocSnap.data().subscriptionActive;
        setCachedSub(isActive);
        if (isActive) window.location.href = "cinonix.html";
      }
    } catch (error) {
      console.error("Error al verificar estado de pago:", error.message);
    }
  });
};

/** 🔹 CERRAR SESIÓN */
window.cerrarSesion = async function() {
  try {
    await signOut(auth);
    clearCachedSub();
    alert("Has cerrado sesión correctamente.");
    window.location.href = "001login.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error.message);
    alert("Error al cerrar sesión: " + error.message);
  }
};
