// app.js
// Usa <script type="module" src="app.js"></script> en tus páginas

// 1. Importa las funciones de Firebase desde el CDN (versión 11.3.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
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

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Función para generar un código único de afiliado
function generateAffiliateCode() {
  // Genera un código alfanumérico de 8 caracteres en mayúsculas
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

/** 🔹 REGISTRO DE USUARIO */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDngD8Yc5tuKeLar8-AxlCSGQXZdYNBEW0",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para registrar usuario y guardar afiliado
async function registrarUsuario(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Obtener código de referido desde la URL
    const params = new URLSearchParams(window.location.search);
    const referidoPor = params.get("afiliado") || null;

    // Crear un código único para el usuario
    const codigoAfiliado = Math.random().toString(36).substr(2, 8); 

    // Guardar usuario en Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      email: user.email,
      referidoPor: referidoPor,
      codigoAfiliado: codigoAfiliado,
      referidosTotales: 0,
      referidosContados: [],
      dineroAcumulado: 0
    });

    console.log("Usuario registrado con éxito");
    window.location.href = "dashboard.html"; // Redirigir al dashboard
  } catch (error) {
    console.error("Error en el registro:", error);
  }
}

// Función para iniciar sesión
async function iniciarSesion(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Sesión iniciada correctamente");
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);
  }
}

// Conectar botones de la UI
document.getElementById("btnRegistro").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  registrarUsuario(email, password);
});

document.getElementById("btnLogin").addEventListener("click", () => {
  const email = document.getElementById("emailLogin").value;
  const password = document.getElementById("passwordLogin").value;
  iniciarSesion(email, password);
});

/** 🔹 INICIO DE SESIÓN */
window.iniciarSesion = async function(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, "usuarios", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      // Redirige a la plataforma si la suscripción está activa, de lo contrario a la página de pago.
      window.location.href = data.subscriptionActive ? "cinonix.html" : "004pago.html";
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
window.validarPagoEnConfirmacion = async function() {
  const user = auth.currentUser;
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);

      // Prepara el objeto de actualización
      const updateData = {
        subscriptionActive: true,          // Activa la suscripción
        afiliado: true,                    // Marca al usuario como afiliado
        codigoAfiliado: generateAffiliateCode()  // Genera y asigna un código único
      };

      // Si se almacenó en sessionStorage el código del afiliado que refirió al usuario, lo agregamos
      if (sessionStorage.getItem("afiliadoReferrer")) {
        updateData.referidoPor = sessionStorage.getItem("afiliadoReferrer");
      }

      await updateDoc(userDocRef, updateData);

      console.log("Pago confirmado. Suscripción activada y usuario marcado como afiliado.");
      alert("Pago confirmado. Tu suscripción ha sido activada.");
      window.location.href = "cinonix.html";
    } catch (error) {
      console.error("Error al confirmar el pago:", error.message);
      alert("Error al confirmar el pago: " + error.message);
    }
  } else {
    window.location.href = "index.html";
  }
};

/** 🔹 RESTRINGIR CONTENIDO SOLO PARA SUSCRIPTORES */
window.restringirContenido = function() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists() && !userDocSnap.data().subscriptionActive) {
          alert("Debes activar tu suscripción.");
          window.location.href = "004pago.html";
        }
      } catch (error) {
        console.error("Error al verificar suscripción:", error.message);
      }
    } else {
      window.location.href = "index.html";
    }
  });
};

/** 🔹 REDIRIGIR DESDE INDEX SI YA PAGÓ */
export const redirigirSiPagado = function() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists() && userDocSnap.data().subscriptionActive) {
          console.log("Redirigiendo a cinonix.html");
          window.location.href = "cinonix.html";
        } else {
          console.log("Usuario no tiene suscripción activa");
        }
      } catch (error) {
        console.error("Error al verificar estado de pago:", error.message);
        console.error("Código de error:", error.code);
      }
    } else {
      console.log("Usuario no autenticado");
    }
  });
};

/** 🔹 CERRAR SESIÓN */
window.cerrarSesion = async function() {
  try {
    await signOut(auth);
    alert("Has cerrado sesión correctamente.");
    window.location.href = "001login.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error.message);
    alert("Error al cerrar sesión: " + error.message);
  }
};
