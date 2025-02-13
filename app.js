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

// 2. Configuración de Firebase (CORREGIDO)
const firebaseConfig = {
  apiKey: "AIzaSyDngD8Yc5tuKeLar8-AxlCSGQXZdYNBEW0",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
  storageBucket: "cinonix-3a65d.appspot.com",  // 🔥 CORREGIDO 🔥
  messagingSenderId: "298364890273",
  appId: "1:298364890273:web:f8d61cd538f228648f54e0",
  measurementId: "G-9L2E23K72W"
};

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. Funciones de autenticación

/** 🔹 REGISTRO DE USUARIO */
window.registrarUsuario = async function(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Guardar en Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      email: email,
      subscriptionActive: false
    });

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

/** 🔹 CONFIRMAR PAGO Y ACTIVAR CUENTA */
window.validarPagoEnConfirmacion = async function() {
  const user = auth.currentUser; // Usa auth.currentUser en lugar de firebase.auth().currentUser
  
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      
      // Actualiza el campo 'subscriptionActive' de false a true
      await updateDoc(userDocRef, { subscriptionActive: true });

      console.log("Pago confirmado. Suscripción activada.");
      alert("Pago confirmado. Tu suscripción ha sido activada.");

      // Redirige a la plataforma
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
    await signOut(auth);  // Cierra la sesión del usuario actual
    alert("Has cerrado sesión correctamente.");
    window.location.href = "001login.html";  // Redirige al usuario a la página de inicio de sesión
  } catch (error) {
    console.error("Error al cerrar sesión:", error.message);
    alert("Error al cerrar sesión: " + error.message);
  }
};
