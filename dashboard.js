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

// Función para establecer una cookie (asegúrate de usar path=/ para que sea global)
function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    let date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + value + "; path=/" + expires;
  console.log("Cookie set:", name, value);
}

// Función para obtener una cookie
function getCookie(name) {
  let nameEQ = name + "=";
  let ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Captura la referencia desde la URL y la guarda en la cookie (por ejemplo: ?afiliado=UID_REFERIDOR)
const urlParams = new URLSearchParams(window.location.search);
const referidorURL = urlParams.get("afiliado");
if (referidorURL) {
  setCookie("referidor", referidorURL, 30); // Guarda la cookie por 30 días
}

// Verificar usuario autenticado y actualizar Firestore
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      let userDocSnap = await getDoc(userDocRef);
      
      // Si el documento no existe, se crea con valores iniciales.
      if (!userDocSnap.exists()) {
        const cookieReferidor = getCookie("referidor");
        const initialData = { 
          referidosTotales: 0, 
          referidosContados: [] 
        };
        if (cookieReferidor) {
          initialData.referidor = cookieReferidor;
          console.log("Documento creado con referidor (cookie):", cookieReferidor);
        }
        await setDoc(userDocRef, initialData, { merge: true });
        userDocSnap = await getDoc(userDocRef);
      }
      
      // Si el documento existe pero no tiene el campo "referidor", se actualiza con la cookie.
      let data = userDocSnap.data();
      if (!data.referidor) {
        const cookieReferidor = getCookie("referidor");
        if (cookieReferidor) {
          await updateDoc(userDocRef, { referidor: cookieReferidor });
          console.log("Se actualizó el campo referidor desde la cookie:", cookieReferidor);
          data = (await getDoc(userDocRef)).data();
        }
      }
      
      const dineroAcumuladoActual = data.dineroAcumulado || 0;
      const referidosTotalesActuales = data.referidosTotales || 0;
      const referidosContados = data.referidosContados || [];

      // Mostrar el link de afiliado (si el usuario tiene su propio código)
      if (data.codigoAfiliado) {
        const linkAfiliado = `https://cinonix.vercel.app/?afiliado=${data.codigoAfiliado}`;
        document.getElementById("linkAfiliado").textContent = linkAfiliado;
        document.getElementById("linkAfiliado").href = linkAfiliado;
      }

      // Buscar referidos: usuarios cuyo campo "referidor" es igual al UID del usuario actual.
      const afiliadosQuery = query(
        collection(db, "usuarios"),
        where("referidor", "==", user.uid)
      );
      const afiliadosSnap = await getDocs(afiliadosQuery);

      let nuevosReferidosTotales = referidosTotalesActuales;
      let dineroAcumuladoTotal = 0;
      let nuevosReferidosContados = [...referidosContados];

      afiliadosSnap.forEach((referidoDoc) => {
        const referidoId = referidoDoc.id;
        if (referidoId !== user.uid && !referidosContados.includes(referidoId)) {
          nuevosReferidosTotales++;
          dineroAcumuladoTotal += 9.99; // Por ejemplo, comisión fija de 9.99€
          nuevosReferidosContados.push(referidoId);
        }
      });

      // Evitar que referidosTotales disminuya
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

// Función para sumar comisión al referidor cuando el usuario paga
async function procesarPago(userId, monto) {
  const userDocRef = doc(db, "usuarios", userId);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    const userData = userDocSnap.data();
    const referidorId = userData.referidor;

    if (referidorId) {
      const comision = monto * 0.10; // Ejemplo: 10% de comisión
      const referidorDocRef = doc(db, "usuarios", referidorId);
      await updateDoc(referidorDocRef, {
        dineroAcumulado: increment(comision)
      });
      console.log("Comisión asignada al referidor:", referidorId);
    } else {
      console.log("No se encontró referidor en el documento del usuario.");
    }
  }
}

// Simular pago (llamar esta función cuando se procese el pago)
document.getElementById("botonPago").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (user) {
    await procesarPago(user.uid, 100); // Ejemplo: pago de 100€
    alert("Pago procesado y comisión asignada.");
    // Aquí podrías, opcionalmente, eliminar la cookie si ya no se necesita:
    // document.cookie = "referidor=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
  } else {
    alert("Debes iniciar sesión para pagar.");
  }
});
