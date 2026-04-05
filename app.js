// app.js
// Usa <script type="module" src="app.js"></script> en tus páginas

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
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  increment
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDngD8Yc5tuKeLar8-AxlCSGQXZdYNBEW0",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
  storageBucket: "cinonix-3a65d.appspot.com",
  messagingSenderId: "298364890273",
  appId: "1:298364890273:web:f8d61cd538f228648f54e0",
  measurementId: "G-9L2E23K72W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function generateAffiliateCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// ✅ Obtener código de referido desde la URL (?ref=CODIGO)
function obtenerCodigoReferido() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("ref");
}

/** 🔹 REGISTRO DE USUARIO + ACTUALIZACIÓN AL REFERIDOR */
window.registrarUsuario = async function(email, password, refParam) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Prioridad: 1) param del formulario, 2) URL, 3) localStorage
    const codigoReferido = refParam
      || obtenerCodigoReferido()
      || localStorage.getItem("referral")
      || null;

    if (codigoReferido) {
      sessionStorage.setItem("afiliadoReferrer", codigoReferido);
      localStorage.setItem("referral", codigoReferido);
    }

    // 1. Crear documento del nuevo usuario
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

    // 2. Si tiene código de referido, actualizar los contadores del referidor
    if (codigoReferido) {
      const referidoresQuery = query(
        collection(db, "usuarios"),
        where("codigoAfiliado", "==", codigoReferido),
        limit(1)
      );
      const querySnapshot = await getDocs(referidoresQuery);

      if (!querySnapshot.empty) {
        const referidorDoc = querySnapshot.docs[0];
        const referidorRef = referidorDoc.ref;

        // Incrementar en +1 referido y +9.99 € (ajusta el monto si es diferente)
        await updateDoc(referidorRef, {
          referidosTotales: increment(1),
          dineroAcumulado: increment(9.99)
        });
        console.log(`✅ Referidor ${codigoReferido} actualizado: +1 referido, +9.99€`);
      } else {
        console.warn(`⚠️ No se encontró referidor con código ${codigoReferido}`);
      }
    }

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
  const user = auth.currentUser;
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      await updateDoc(userDocRef, {
        subscriptionActive: true,
        afiliado: true,
        referidoConfirmado: true
      });
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
