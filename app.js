// app.js

// 1. Importa los módulos necesarios de Firebase
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
  arrayUnion,
  increment
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// 2. Configuración de Firebase (se usa la configuración completa)
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

// 4. Función para generar un código único de afiliado (8 caracteres en mayúsculas)
function generateAffiliateCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// 5. Función para extraer el código de referido de la URL (parámetro "referido")
function obtenerCodigoReferido() {
function obtenerCodigoReferido() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlCode = urlParams.get("referido");
  const storageCode = sessionStorage.getItem("afiliadoReferrer");
  return urlCode || storageCode || null;
}

    await setDoc(doc(db, "usuarios", user.uid), {
      email: email,
      subscriptionActive: false,
      afiliado: false,
      codigoAfiliado: generateAffiliateCode(),
      dineroAcumulado: 0,
      referidoPor: codigoReferido || null, // Usar el código obtenido
      referidoConfirmado: false,
      referidosTotales: 0,
      referidosContados: []
    });

    alert("Usuario registrado correctamente.");
    window.location.href = "001login.html";
  } catch (error) {
    console.error("Error en el registro:", error.message);
    alert("Error en el registro: " + error.message);
  }
};

/** 
 * 🔹 INICIO DE SESIÓN
 * Inicia sesión y redirige según el estado de la suscripción.
 */
window.iniciarSesion = async function(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, "usuarios", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      // Redirige a la plataforma si la suscripción está activa, o a la página de pago
      window.location.href = data.subscriptionActive ? "cinonix.html" : "004pago.html";
    } else {
      alert("No se encontró el registro del usuario.");
    }
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    alert("Error al iniciar sesión: " + error.message);
  }
};

/** 
 * 🔹 RESTABLECER CONTRASEÑA
 * Envía un correo para restablecer la contraseña.
 */
window.restablecerContrasena = async function(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Se ha enviado un correo para restablecer la contraseña.");
  } catch (error) {
    console.error("Error al restablecer la contraseña:", error.message);
    alert("Error: " + error.message);
  }
};

/** 
 * 🔹 CONFIRMAR PAGO, ACTIVAR CUENTA Y ASIGNAR AFILIADO
 * Al confirmar el pago, se activa la suscripción, se marca al usuario como afiliado,
 * se genera (o renueva) el código de afiliado y se actualiza el campo "referidoConfirmado".
 */
window.validarPagoEnConfirmacion = async function() {
  const user = auth.currentUser;
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const updateData = {
        subscriptionActive: true,
        afiliado: true,
        codigoAfiliado: generateAffiliateCode(), // Se puede generar uno nuevo si se desea
        referidoConfirmado: true
      };
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

/** 
 * 🔹 RESTRINGIR CONTENIDO SOLO PARA SUSCRIPTORES
 * Redirige al usuario a la página de pago si no tiene una suscripción activa.
 */
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

/** 
 * 🔹 REDIRIGIR DESDE INDEX SI YA PAGÓ
 * Verifica el estado de suscripción y redirige a la plataforma si ya está activa.
 */
window.redirigirSiPagado = function() {
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
      }
    } else {
      console.log("Usuario no autenticado");
    }
  });
};

/** 
 * 🔹 CERRAR SESIÓN
 * Cierra la sesión del usuario y redirige a la página de login.
 */
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

/** 
 * 🔹 CARGAR DASHBOARD
 * Esta función carga y actualiza los datos del dashboard, incluyendo el sistema de referidos.
 * Debe llamarse en la página del dashboard (por ejemplo, en el evento DOMContentLoaded).
 */
window.cargarDashboard = function() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();

          // Asegurarse de que los contadores estén inicializados
          if (typeof data.referidosTotales !== 'number') {
            await updateDoc(userDocRef, { referidosTotales: 0 });
            data.referidosTotales = 0;
          }
          if (!Array.isArray(data.referidosContados)) {
            await updateDoc(userDocRef, { referidosContados: [] });
            data.referidosContados = [];
          }

          const dineroAcumuladoActual = data.dineroAcumulado || 0;
          const referidosTotalesActuales = data.referidosTotales || 0;
          const referidosContados = data.referidosContados || [];

          // Mostrar el enlace de afiliado del usuario (si tiene)
          if (data.codigoAfiliado) {
            const linkAfiliado = `https://cinonix.vercel.app/002registro.html/?afiliado=${data.codigoAfiliado}`;
            const enlaceElement = document.getElementById("linkAfiliado");
            if (enlaceElement) {
              enlaceElement.textContent = linkAfiliado;
              enlaceElement.href = linkAfiliado;
            }
          } else {
            console.error("El usuario no tiene código de afiliado");
          }

          // Consultar a los usuarios referidos: buscar en "referidoPor" (no en "codigoAfiliado")
          const afiliadosQuery = query(
            collection(db, "usuarios"),
            where("referidoPor", "==", data.codigoAfiliado),
            where("afiliado", "==", true)
          );
          const afiliadosSnap = await getDocs(afiliadosQuery);

          let nuevosReferidosTotales = referidosTotalesActuales;
          let dineroAcumuladoTotal = 0;
          let nuevosReferidosContados = [...referidosContados];

          afiliadosSnap.forEach((referido) => {
            const referidoId = referido.id;
            // Solo contar si no se ha contado aún
            if (referidoId !== user.uid && !referidosContados.includes(referidoId)) {
              nuevosReferidosTotales++;
              dineroAcumuladoTotal += 9.99; // Monto de recompensa por referido (ajustable)
              nuevosReferidosContados.push(referidoId);
            }
          });

          // Evitar que el total disminuya
          if (nuevosReferidosTotales < referidosTotalesActuales) {
            nuevosReferidosTotales = referidosTotalesActuales;
          }

          const updates = {};
          if (nuevosReferidosTotales !== referidosTotalesActuales) {
            updates.referidosTotales = nuevosReferidosTotales;
          }
          if (dineroAcumuladoTotal > 0) {
            updates.dineroAcumulado = increment(dineroAcumuladoTotal);
            updates.referidosContados = arrayUnion(...nuevosReferidosContados);
          }
          if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
          }

          // Actualizar los elementos del dashboard
          const numeroAfiliadosElem = document.getElementById("numeroAfiliados");
          if (numeroAfiliadosElem) {
            numeroAfiliadosElem.textContent = nuevosReferidosTotales;
          }
          const dineroAcumuladoElem = document.getElementById("dineroAcumulado");
          if (dineroAcumuladoElem) {
            dineroAcumuladoElem.textContent = `${(dineroAcumuladoActual + dineroAcumuladoTotal).toFixed(2)} €`;
          }
        } else {
          await setDoc(userDocRef, { referidosTotales: 0, referidosContados: [] }, { merge: true });
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
        alert("Error al cargar datos. Recarga la página.");
      }
    } else {
      window.location.href = "001login.html";
    }
  });
};
