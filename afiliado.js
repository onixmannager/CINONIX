import { getFirestore, doc, getDoc, updateDoc, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";

const db = getFirestore();

async function actualizarReferidos(userId) {
  try {
    const userDocRef = doc(db, "usuarios", userId);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      if (!data.pagoValidado) {
        console.error("El usuario no ha validado el pago.");
        return;
      }

      const afiliadorQuery = query(
        collection(db, "usuarios"),
        where("codigoAfiliado", "==", data.codigoAfiliado)
      );
      const afiliadorSnap = await getDocs(afiliadorQuery);

      if (!afiliadorSnap.empty) {
        const afiliadorDoc = afiliadorSnap.docs[0];
        const afiliadorRef = doc(db, "usuarios", afiliadorDoc.id);
        const afiliadorData = afiliadorDoc.data();
        
        if (!afiliadorData.referidosContados.includes(userId)) {
          await updateDoc(afiliadorRef, {
            referidosTotales: increment(1),
            dineroAcumulado: increment(9.99),
            referidosContados: arrayUnion(userId)
          });
          console.log("Referido agregado correctamente.");
        } else {
          console.log("Este referido ya ha sido contado.");
        }
      }
    }
  } catch (error) {
    console.error("Error actualizando referidos:", error);
  }
}
