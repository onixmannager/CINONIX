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
  increment 
} from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDngD8Yc5tuKeLar8-AxlCSGQXZdYNBEW0",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
  // Completa con el resto de tu configuración
};

// Inicialización única de Firebase
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
        console.log("Datos del usuario:", data);  // Para depuración
        
        // Generar link de afiliado
        if (data.codigoAfiliado) {
          const linkAfiliado = `https://tuweb.com/?afiliado=${data.codigoAfiliado}`;
          const linkElement = document.getElementById("linkAfiliado");
          linkElement.textContent = linkAfiliado;
          linkElement.href = linkAfiliado;
        } else {
          console.error("El usuario no tiene código de afiliado");
        }

        // Verificar referidos y sumar el dinero acumulado
        if (data.codigoAfiliado) {
          const afiliadosQuery = query(
            collection(db, "usuarios"),
            where("referidoPor", "==", data.codigoAfiliado)
          );
          const afiliadosSnap = await getDocs(afiliadosQuery);
          
          // Mostrar la cantidad de referidos
          document.getElementById("numeroAfiliados").textContent = afiliadosSnap.size;

          // Lógica de dinero acumulado por referidos
          let dineroAcumuladoTotal = 0;
          
          afiliadosSnap.forEach((doc) => {
            const referidoData = doc.data();
            dineroAcumuladoTotal += referidoData.dineroGenerado || 0;  // Sumar dinero generado por los referidos
          });
          
          // Actualizar dinero acumulado del usuario
          await updateDoc(userDocRef, {
            dineroAcumulado: increment(dineroAcumuladoTotal)  // Acumular el dinero de los referidos
          });
          
          // Mostrar el dinero acumulado actualizado
          const balance = (data.dineroAcumulado + dineroAcumuladoTotal).toFixed(2) || "0.00";
          document.getElementById("dineroAcumulado").textContent = balance;
        }

      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
      alert("Error al cargar datos. Recarga la página.");
    }
  } else {
    window.location.href = "001login.html";
  }
});

// Función de retiro
window.procesarRetiro = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    // Lógica de retiro aquí (suponiendo que haya un saldo suficiente)
    alert("Solicitud de retiro recibida");
  } catch (error) {
    console.error("Error en retiro:", error);
    alert("Error al procesar retiro");
  }
};
