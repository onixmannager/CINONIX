// dashboard.js
// Usa <script type="module" src="dashboard.js"></script> en la página del dashboard

// Importa la inicialización de Firebase primero
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  // ... otros parámetros de configuración
};

// Inicializa la app
const app = initializeApp(firebaseConfig);

// Ahora importa los módulos de Firebase que usarás
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// El resto de tu código aquí...

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        
        // Construir y mostrar el link de afiliado
        const linkAfiliado = `https://tuweb.com/?afiliado=${data.codigoAfiliado}`;
        document.getElementById("linkAfiliado").textContent = linkAfiliado;
        document.getElementById("linkAfiliado").href = linkAfiliado;
        
        // Contar el número de usuarios referidos por el afiliado actual
        const afiliadosQuery = query(
          collection(db, "usuarios"),
          where("referidoPor", "==", data.codigoAfiliado)
        );
        const afiliadosSnap = await getDocs(afiliadosQuery);
        document.getElementById("numeroAfiliados").textContent = afiliadosSnap.size;
        
        // Mostrar el dinero acumulado (suponiendo que se actualiza el campo 'dineroAcumulado')
        document.getElementById("dineroAcumulado").textContent = data.dineroAcumulado ? data.dineroAcumulado.toFixed(2) : "0.00";
      }
    } catch (error) {
      console.error("Error al cargar los datos del dashboard:", error.message);
    }
  } else {
    window.location.href = "001login.html";
  }
});

// Función para procesar el retiro (la lógica real dependerá de tu backend o método de pago)
window.procesarRetiro = async function() {
  // Aquí podrías, por ejemplo, actualizar el documento del usuario para registrar una solicitud de retiro
  alert("Función para procesar retiro no implementada. Aquí iría la integración con tu sistema de pagos.");
};
