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

        // Asegurar que dineroAcumulado tiene un valor numérico
        const dineroAcumuladoActual = data.dineroAcumulado || 0;

        // Generar link de afiliado
        if (data.codigoAfiliado) {
          const linkAfiliado = `https://cinonix.vercel.app/?afiliado=${data.codigoAfiliado}`;
          const linkElement = document.getElementById("linkAfiliado");
          linkElement.textContent = linkAfiliado;
          linkElement.href = linkAfiliado;
        } else {
          console.error("El usuario no tiene código de afiliado");
        }

        // Buscar referidos cuyo campo "afiliado" sea "true"
        const afiliadosQuery = query(
          collection(db, "usuarios"),
          where("codigoAfiliado", "==", data.codigoAfiliado),
          where("afiliado", "==", true)
        );
        const afiliadosSnap = await getDocs(afiliadosQuery);
        
        // Mostrar cantidad de referidos
        document.getElementById("numeroAfiliados").textContent = afiliadosSnap.size;

        // Lista de referidos contados previamente
        const referidosContados = data.referidosContados || [];

        let dineroAcumuladoTotal = 0;
        let nuevosReferidosContados = [];

        afiliadosSnap.forEach((referido) => {
          const referidoData = referido.data();

          // Verificar que este referido no se haya contado antes
          if (!referidosContados.includes(referido.id)) {
            dineroAcumuladoTotal += 9.99;
            nuevosReferidosContados.push(referido.id);
          }
        });

        if (dineroAcumuladoTotal > 0) {
          await updateDoc(userDocRef, {
            dineroAcumulado: increment(dineroAcumuladoTotal),
            referidosContados: arrayUnion(...nuevosReferidosContados)
          });
        }

        // Mostrar el dinero acumulado actualizado en la web
        document.getElementById("dineroAcumulado").textContent = 
          `${(dineroAcumuladoActual + dineroAcumuladoTotal).toFixed(2)} €`;
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
      alert("Error al cargar datos. Recarga la página.");
    }
  } else {
    window.location.href = "001login.html";
  }
});
