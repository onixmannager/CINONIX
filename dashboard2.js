// dashboard.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "001login.html";
    return;
  }

  try {
    const userDocRef = doc(db, "usuarios", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      console.error("Usuario no encontrado en Firestore");
      return;
    }

    const data = userDocSnap.data();

    // 🔹 Asegurarse que tiene código afiliado
    if (!data.codigoAfiliado) {
      console.error("El usuario no tiene código de afiliado");
      return;
    }

    // 🔹 Mostrar link afiliado (IMPORTANTE usar SIEMPRE el mismo parámetro)
    const linkAfiliado = `https://cinonix.vercel.app/?ref=${data.codigoAfiliado}`;
    document.getElementById("linkAfiliado").textContent = linkAfiliado;
    document.getElementById("linkAfiliado").href = linkAfiliado;

    // 🔥 QUERY CORRECTA
    const afiliadosQuery = query(
      collection(db, "usuarios"),
      where("referredBy", "==", data.codigoAfiliado)
    );

    const afiliadosSnap = await getDocs(afiliadosQuery);

    const totalReferidos = afiliadosSnap.size;

    // 💰 cálculo simple y fiable
    const dinero = totalReferidos * 9.99;

    // 🔹 Mostrar datos
    document.getElementById("numeroAfiliados").textContent = totalReferidos;
    document.getElementById("dineroAcumulado").textContent = `${dinero.toFixed(2)} €`;

  } catch (error) {
    console.error("Error cargando dashboard:", error);
    alert("Error al cargar datos. Recarga la página.");
  }
});
