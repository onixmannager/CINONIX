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
  updateDoc, 
  increment 
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
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

/** 🔹 REGISTRO DE USUARIO CON REFERIDO */
window.registrarUsuario = async function(email, password, codigoAfiliado = null) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Datos del nuevo usuario
    const userData = {
      email: email,
      subscriptionActive: false,
      afiliado: false,
      codigoAfiliado: null,
      dineroAcumulado: 0,
      referidoPor: null
    };

    // Si el usuario se registró con un código de referido
    if (codigoAfiliado) {
      // Buscar en la base de datos el afiliado correspondiente
      const afiliadoRef = doc(db, "usuarios", codigoAfiliado);
      const afiliadoSnap = await getDoc(afiliadoRef);

      if (afiliadoSnap.exists()) {
        userData.referidoPor = codigoAfiliado;

        // Actualizar los datos del afiliado (sumar un referido y agregar dinero)
        await updateDoc(afiliadoRef, {
          referidos: increment(1),
          dineroAcumulado: increment(5) // Suponiendo que el bono por referido es 5€
        });
      }
    }

    // Guardar el usuario en la base de datos
    await setDoc(doc(db, "usuarios", user.uid), userData);

    alert("Usuario registrado correctamente.");
    window.location.href = "001login.html";
  } catch (error) {
    console.error("Error en el registro:", error.message);
    alert("Error en el registro: " + error.message);
  }
};

/** 🔹 CONFIRMAR PAGO Y ASIGNAR CÓDIGO DE AFILIADO */
window.validarPagoEnConfirmacion = async function() {
  const user = auth.currentUser;
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        const updateData = {
          subscriptionActive: true,
          afiliado: true,
          codigoAfiliado: userData.codigoAfiliado || generateAffiliateCode() // Asigna un código solo si no lo tenía
        };

        // Si el usuario fue referido, actualizar las ganancias del afiliado
        if (userData.referidoPor) {
          const afiliadoRef = doc(db, "usuarios", userData.referidoPor);
          await updateDoc(afiliadoRef, {
            dineroAcumulado: increment(10) // Suponiendo que se le suman 10€ por pago confirmado
          });
        }

        await updateDoc(userDocRef, updateData);

        alert("Pago confirmado. Tu suscripción ha sido activada.");
        window.location.href = "cinonix.html";
      } else {
        alert("Error: No se encontraron datos del usuario.");
      }
    } catch (error) {
      console.error("Error al confirmar el pago:", error.message);
      alert("Error al confirmar el pago: " + error.message);
    }
  } else {
    window.location.href = "index.html";
  }
};
