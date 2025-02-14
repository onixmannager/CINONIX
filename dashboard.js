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

// 1. Capturar y almacenar código de referido
const urlParams = new URLSearchParams(window.location.search);
const afiliadoCode = urlParams.get('afiliado');

if (afiliadoCode) {
  const referralData = {
    code: afiliadoCode,
    expires: Date.now() + 86400000 // 24 horas
  };
  localStorage.setItem('referralCode', JSON.stringify(referralData));
}

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
      
      // 2. Procesar código de referido
      const storedReferral = JSON.parse(localStorage.getItem('referralCode'));
      if (storedReferral && storedReferral.expires > Date.now()) {
        const referrerQuery = query(
          collection(db, "usuarios"),
          where("codigoAfiliado", "==", storedReferral.code)
        );

        const referrerSnap = await getDocs(referrerQuery);
        
        if (!referrerSnap.empty && !userDocSnap.data()?.referidoPor) {
          const referrerDoc = referrerSnap.docs[0];
          const referrerId = referrerDoc.id;

          if (referrerId !== user.uid) {
            // Actualizar referidor
            await updateDoc(referrerDoc.ref, {
              referidosTotales: increment(1),
              referidosContados: arrayUnion(user.uid)
            });

            // Marcar usuario actual como referido
            await updateDoc(userDocRef, {
              referidoPor: storedReferral.code
            });

            localStorage.removeItem('referralCode');
          }
        }
      }

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();

        // 3. Inicializar campos si no existen
        if (typeof data.referidosTotales === 'undefined') {
          await updateDoc(userDocRef, { referidosTotales: 0 });
        }
        if (!data.referidosContados) {
          await updateDoc(userDocRef, { referidosContados: [] });
        }

        // 4. Generar código de afiliado si no existe
        if (!data.codigoAfiliado) {
          const nuevoCodigo = generarCodigoUnico(); // Función que debes crear
          await updateDoc(userDocRef, { codigoAfiliado: nuevoCodigo });
        }

        // 5. Consultar referidos REALES
        const afiliadosQuery = query(
          collection(db, "usuarios"),
          where("referidoPor", "==", data.codigoAfiliado)
        );

        const afiliadosSnap = await getDocs(afiliadosQuery);
        const referidosReales = afiliadosSnap.docs.filter(doc => doc.id !== user.uid);

        // 6. Actualizar contadores
        const nuevosReferidos = referidosReales.filter(doc => 
          !userDocSnap.data().referidosContados?.includes(doc.id)
        );

        if (nuevosReferidos.length > 0) {
          await updateDoc(userDocRef, {
            referidosTotales: increment(nuevosReferidos.length),
            referidosContados: arrayUnion(...nuevosReferidos.map(doc => doc.id)),
            dineroAcumulado: increment(nuevosReferidos.length * 9.99)
          });
        }

        // 7. Actualizar UI
        const datosActualizados = (await getDoc(userDocRef)).data();
        
        document.getElementById("numeroAfiliados").textContent = 
          datosActualizados.referidosTotales || 0;
        
        document.getElementById("dineroAcumulado").textContent = 
          `${(datosActualizados.dineroAcumulado || 0).toFixed(2)} €`;
        
        if (datosActualizados.codigoAfiliado) {
          const link = `https://cinonix.vercel.app/?afiliado=${datosActualizados.codigoAfiliado}`;
          document.getElementById("linkAfiliado").href = link;
          document.getElementById("linkAfiliado").textContent = link;
        }

      } else {
        await setDoc(userDocRef, {
          referidosTotales: 0,
          referidosContados: [],
          dineroAcumulado: 0
        });
      }

    } catch (error) {
      console.error("Error crítico:", error);
      alert("Error actualizando referidos. Contacta con soporte.");
    }
  } else {
    window.location.href = "001login.html";
  }
});

// Función para generar código único (implementar)
function generarCodigoUnico() {
  // Ejemplo: genera un código de 8 caracteres alfanuméricos
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}
