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
        console.log("Datos del usuario:", data);

        // Si el campo `referidosTotales` no existe en Firebase, inicializarlo en 0
        if (!data.referidosTotales) {
          await updateDoc(userDocRef, { referidosTotales: 0 });
        }

        // Si el campo `referidosContados` no existe, inicializarlo
        if (!data.referidosContados) {
          await updateDoc(userDocRef, { referidosContados: [] });
        }

        // Asegurar que `dineroAcumulado` tenga un valor numérico
        const dineroAcumuladoActual = data.dineroAcumulado || 0;
        const referidosTotalesActuales = data.referidosTotales || 0;
        const referidosContados = data.referidosContados || [];

        // Generar link de afiliado
        if (data.codigoAfiliado) {
          const linkAfiliado = `https://cinonix.vercel.app/?afiliado=${data.codigoAfiliado}`;
          const linkElement = document.getElementById("linkAfiliado");
          linkElement.textContent = linkAfiliado;
          linkElement.href = linkAfiliado;
        } else {
          console.error("El usuario no tiene código de afiliado");
        }

        // Buscar referidos válidos (excluyendo al propio usuario)
        const afiliadosQuery = query(
          collection(db, "usuarios"),
          where("codigoAfiliado", "==", data.codigoAfiliado),
          where("afiliado", "==", true)
        );
        const afiliadosSnap = await getDocs(afiliadosQuery);
        
        let nuevosReferidosTotales = 0;
        let dineroAcumuladoTotal = 0;
        let nuevosReferidosContados = [];

        afiliadosSnap.forEach((referido) => {
          const referidoData = referido.data();
          const referidoId = referido.id;

          // **Evitar contar al usuario actual como su propio referido**
          if (referidoId !== user.uid) {
            nuevosReferidosTotales++; 

            // Solo sumar dinero si este referido no ha sido contado antes
            if (!referidosContados.includes(referidoId)) {
              dineroAcumuladoTotal += 9.99;
              nuevosReferidosContados.push(referidoId);
            }
          }
        });

        // **Actualizar en Firebase solo si hay cambios**
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

        // Mostrar valores actualizados en la web
        document.getElementById("numeroAfiliados").textContent = nuevosReferidosTotales;
        document.getElementById("dineroAcumulado").textContent = 
          `${(dineroAcumuladoActual + dineroAcumuladoTotal).toFixed(2)} €`;

      } else {
        // Si el usuario aún no tiene datos en Firestore, inicializarlo con `referidosTotales = 0`
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
