import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  setDoc, 
  arrayUnion, 
  increment 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDngD8Yc5tuKeLar8-AxlCSGQXZdYNBEW0",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Función para establecer una cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + "; path=/" + expires;
}

// Función para obtener una cookie
function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Guardar el referidor si existe en la URL
const urlParams = new URLSearchParams(window.location.search);
const referidor = urlParams.get("afiliado");

if (referidor) {
    setCookie("referidor", referidor, 30); // Guarda la cookie por 30 días
}

// Verificar usuario autenticado
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, { referidosTotales: 0, referidosContados: [] }, { merge: true });
      }

      const data = userDocSnap.data();
      const dineroAcumuladoActual = data.dineroAcumulado || 0;
      const referidosTotalesActuales = data.referidosTotales || 0;
      const referidosContados = data.referidosContados || [];

      // Mostrar el link de afiliado
      if (data.codigoAfiliado) {
        const linkAfiliado = `https://cinonix.vercel.app/?afiliado=${data.codigoAfiliado}`;
        document.getElementById("linkAfiliado").textContent = linkAfiliado;
        document.getElementById("linkAfiliado").href = linkAfiliado;
      }

      // Buscar referidos en Firestore
      const afiliadosQuery = query(
        collection(db, "usuarios"),
        where("referidor", "==", user.uid) 
      );
      const afiliadosSnap = await getDocs(afiliadosQuery);

      let nuevosReferidosTotales = referidosTotalesActuales;
      let dineroAcumuladoTotal = 0;
      let nuevosReferidosContados = [...referidosContados];

      afiliadosSnap.forEach((referido) => {
        const referidoId = referido.id;

        if (referidoId !== user.uid && !referidosContados.includes(referidoId)) {
          nuevosReferidosTotales++;
          dineroAcumuladoTotal += 9.99;
          nuevosReferidosContados.push(referidoId);
        }
      });

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

      document.getElementById("numeroAfiliados").textContent = nuevosReferidosTotales;
      document.getElementById("dineroAcumulado").textContent = 
        `${(dineroAcumuladoActual + dineroAcumuladoTotal).toFixed(2)} €`;

    } catch (error) {
      console.error("Error cargando dashboard:", error);
      alert("Error al cargar datos. Recarga la página.");
    }
  } else {
    window.location.href = "001login.html";
  }
});

// 💳 Función para sumar comisión cuando el usuario paga
async function procesarPago(userId, monto) {
    const userDocRef = doc(db, "usuarios", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const referidorId = userData.referidor;

        if (referidorId) {
            const comision = monto * 0.10; 

            const referidorDocRef = doc(db, "usuarios", referidorId);
            await updateDoc(referidorDocRef, {
                dineroAcumulado: increment(comision)
            });

            console.log("Comisión asignada al referidor:", referidorId);
        }
    }
}

// Simular pago de usuario (llamar esta función cuando el usuario pague)
document.getElementById("botonPago").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (user) {
        await procesarPago(user.uid, 100); 
        alert("Pago procesado y comisión asignada.");
    } else {
        alert("Debes iniciar sesión para pagar.");
    }
});
