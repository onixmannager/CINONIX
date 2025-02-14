// app.js unificado
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
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
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

// Función para generar código de afiliado
function generateAffiliateCode() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// Funcionalidad del Dashboard
if (document.getElementById("linkAfiliado")) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          
          if (!data.referidosTotales) await updateDoc(userDocRef, { referidosTotales: 0 });
          if (!data.referidosContados) await updateDoc(userDocRef, { referidosContados: [] });

          const dineroAcumuladoActual = data.dineroAcumulado || 0;
          const referidosTotalesActuales = data.referidosTotales || 0;
          const referidosContados = data.referidosContados || [];

          if (data.codigoAfiliado) {
            const linkAfiliado = `https://cinonix.vercel.app/?afiliado=${data.codigoAfiliado}`;
            document.getElementById("linkAfiliado").textContent = linkAfiliado;
            document.getElementById("linkAfiliado").href = linkAfiliado;
          }

          const afiliadosQuery = query(
            collection(db, "usuarios"),
            where("codigoAfiliado", "==", data.codigoAfiliado),
            where("afiliado", "==", true)
          );
          
          const afiliadosSnap = await getDocs(afiliadosQuery);
          let nuevosReferidosTotales = referidosTotalesActuales;
          let nuevosReferidosContados = [...referidosContados];
          let dineroAcumuladoTotal = 0;

          afiliadosSnap.forEach((referido) => {
            const referidoId = referido.id;
            if (referidoId !== user.uid && !referidosContados.includes(referidoId)) {
              nuevosReferidosTotales++;
              nuevosReferidosContados.push(referidoId);
              dineroAcumuladoTotal += 9.99;
            }
          });

          const updates = {};
          if (nuevosReferidosTotales > referidosTotalesActuales) {
            updates.referidosTotales = nuevosReferidosTotales;
          }
          if (dineroAcumuladoTotal > 0) {
            updates.dineroAcumulado = increment(dineroAcumuladoTotal);
            updates.referidosContados = arrayUnion(...nuevosReferidosContados);
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
          }

          document.getElementById("numeroAfiliados").textContent = nuevosReferidosTotales;
          document.getElementById("dineroAcumulado").textContent = 
            `${(dineroAcumuladoActual + dineroAcumuladoTotal).toFixed(2)} €`;
        }
      } catch (error) {
        console.error("Error en dashboard:", error);
        alert("Error al cargar datos del dashboard");
      }
    } else {
      window.location.href = "001login.html";
    }
  });
}

// Funciones de autenticación
window.registrarUsuario = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "usuarios", userCredential.user.uid), {
      email,
      subscriptionActive: false,
      afiliado: false,
      codigoAfiliado: null,
      dineroAcumulado: 0,
      referidoPor: null
    });
    alert("Registro exitoso!");
    window.location.href = "001login.html";
  } catch (error) {
    alert(error.message);
  }
};

window.iniciarSesion = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "usuarios", userCredential.user.uid));
    window.location.href = userDoc.data().subscriptionActive ? "cinonix.html" : "004pago.html";
  } catch (error) {
    alert(error.message);
  }
};

window.restablecerContrasena = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Correo de recuperación enviado");
  } catch (error) {
    alert(error.message);
  }
};

window.validarPagoEnConfirmacion = async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      const updateData = {
        subscriptionActive: true,
        afiliado: true,
        codigoAfiliado: generateAffiliateCode()
      };

      if (sessionStorage.getItem("afiliadoReferrer")) {
        updateData.referidoPor = sessionStorage.getItem("afiliadoReferrer");
      }

      await updateDoc(doc(db, "usuarios", user.uid), updateData);
      alert("Pago confirmado!");
      window.location.href = "cinonix.html";
    } catch (error) {
      alert(error.message);
    }
  }
};

window.restringirContenido = () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) window.location.href = "001login.html";
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    if (!userDoc.data().subscriptionActive) window.location.href = "004pago.html";
  });
};

window.cerrarSesion = async () => {
  try {
    await signOut(auth);
    window.location.href = "001login.html";
  } catch (error) {
    alert(error.message);
  }
};

// Redirección automática para usuarios logueados
export const redirigirSiPagado = () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.data().subscriptionActive) window.location.href = "cinonix.html";
    }
  });
};
