// dashboard.js

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDngD8Yc5tuKeLar8-AxlCSGQXZdYNBEW0",
  authDomain: "cinonix-3a65d.firebaseapp.com",
  projectId: "cinonix-3a65d",
  storageBucket: "cinonix-3a65d.appspot.com",
  messagingSenderId: "298364890273",
  appId: "1:298364890273:web:f8d61cd538f228648f54e0",
  measurementId: "G-9L2E23K72W"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Affiliate dashboard cache (5 min TTL) – avoids re-fetching on every visit
const DASH_KEY = 'cnx_dash';
const DASH_TTL = 5 * 60 * 1000;

function getCachedDash() {
  try {
    const raw = sessionStorage.getItem(DASH_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > DASH_TTL) { sessionStorage.removeItem(DASH_KEY); return null; }
    return obj;
  } catch { return null; }
}

function setCachedDash(obj) {
  try { sessionStorage.setItem(DASH_KEY, JSON.stringify({ ...obj, ts: Date.now() })); } catch {}
}

function renderDash(linkAfiliado, totalReferidos, dinero) {
  const linkEl = document.getElementById("linkAfiliado");
  if (linkEl) { linkEl.textContent = linkAfiliado; linkEl.href = linkAfiliado; }
  const numEl = document.getElementById("numeroAfiliados");
  if (numEl) numEl.textContent = totalReferidos;
  const dinEl = document.getElementById("dineroAcumulado");
  if (dinEl) dinEl.textContent = `${dinero.toFixed(2)} €`;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "001login.html";
    return;
  }

  // Try cache first for instant render
  const cached = getCachedDash();
  if (cached) {
    renderDash(cached.linkAfiliado, cached.totalReferidos, cached.dinero);
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

    const linkAfiliado = `https://cinonix.vercel.app/?ref=${data.codigoAfiliado}`;

    const afiliadosQuery = query(
      collection(db, "usuarios"),
      where("referredBy", "==", data.codigoAfiliado)
    );
    const afiliadosSnap = await getDocs(afiliadosQuery);

    const totalReferidos = afiliadosSnap.docs.filter(
      (docSnap) => docSnap.data().referidoConfirmado === true
    ).length;

    const dinero = totalReferidos * 9.99;

    renderDash(linkAfiliado, totalReferidos, dinero);
    setCachedDash({ linkAfiliado, totalReferidos, dinero });

  } catch (error) {
    console.error("Error cargando dashboard:", error);
    alert("Error al cargar datos. Recarga la página.");
  }
});
