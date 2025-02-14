// dashboard.js
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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();

        if (!data.referidosTotales) {
          await updateDoc(userDocRef, { referidosTotales: 0 });
        }
        if (!data.referidosContados) {
          await updateDoc(userDocRef, { referidosContados: [] });
        }

        const dineroAcumuladoActual = data.dineroAcumulado || 0;
        const referidosTotalesActuales = data.referidosTotales || 0;
        const referidosContados = data.referidosContados || [];

        if (data.codigoAfiliado) {
          const linkAfiliado = `https://cinonix.vercel.app/005confirmacion.html/?afiliado=${data.codigoAfiliado}`;
          document.getElementById("linkAfiliado").textContent = linkAfiliado;
          document.getElementById("linkAfiliado").href = linkAfiliado;
        } else {
          console.error("El usuario no tiene código de afiliado");
        }

        const afiliadosQuery = query(
          collection(db, "usuarios"),
          where("codigoAfiliado", "==", data.codigoAfiliado),
          where("afiliado", "==", true)
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

        // **Evitar que referidosTotales baje**
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
