// dashboard.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

// ✅ FIX 4: API key real en lugar del placeholder "TU_API_KEY"
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

    if (!data.codigoAfiliado) {
      console.error("El usuario no tiene código de afiliado");
      return;
    }

    // El link usa ?ref= que es lo que ahora lee obtenerCodigoReferido() en app.js
    const linkAfiliado = `https://cinonix.vercel.app/?ref=${data.codigoAfiliado}`;
    document.getElementById("linkAfiliado").textContent = linkAfiliado;
    document.getElementById("linkAfiliado").href = linkAfiliado;

    // La query usa "referredBy" que es lo que ahora guarda registrarUsuario() en app.js
    const afiliadosQuery = query(
      collection(db, "usuarios"),
      where("referredBy", "==", data.codigoAfiliado)
    );

    const afiliadosSnap = await getDocs(afiliadosQuery);

    const totalReferidos = afiliadosSnap.size;
    const dinero = totalReferidos * 9.99;

    document.getElementById("numeroAfiliados").textContent = totalReferidos;
    document.getElementById("dineroAcumulado").textContent = `${dinero.toFixed(2)} €`;

  } catch (error) {
    console.error("Error cargando dashboard:", error);
    alert("Error al cargar datos. Recarga la página.");
  }
});
