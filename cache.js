// cache.js
// 📌 Este script maneja la caché del estado de sesión y los datos estáticos de la web

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js";
import { auth, db } from "./app.js"; // Importamos la instancia de Firebase desde app.js

/** 🔹 Almacenar en caché el estado de autenticación para mayor consistencia */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario autenticado:", user.uid);

    // Verificar si ya tenemos los datos en caché
    let userData = localStorage.getItem("cachedUserData");

    if (!userData) {
      console.log("Cargando datos desde Firestore...");
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        localStorage.setItem("cachedUserData", JSON.stringify(userData)); // Guardar en caché
      }
    } else {
      console.log("Cargando datos desde localStorage...");
    }
  } else {
    console.log("Usuario no autenticado.");
    localStorage.removeItem("cachedUserData"); // Limpiar caché al cerrar sesión
  }
});

/** 🔹 Función para almacenar imágenes en caché */
export function cacheImage(imgElement, imgUrl, storageKey) {
  const cachedImage = localStorage.getItem(storageKey);

  if (cachedImage) {
    console.log("Cargando imagen desde caché...");
    imgElement.src = cachedImage;
  } else {
    console.log("Descargando imagen...");
    fetch(imgUrl)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = function () {
          localStorage.setItem(storageKey, reader.result); // Guardar en base64
          imgElement.src = reader.result;
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => console.error("Error al cargar imagen:", error));
  }
}

/** 🔹 Función para almacenar datos generales en caché */
export function cacheData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/** 🔹 Función para obtener datos en caché */
export function getCachedData(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}
