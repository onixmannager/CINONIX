// cerrarsesion.js
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-auth.js";

const auth = getAuth();

// Función para cerrar sesión
window.cerrarSesion = async function () {
  try {
    await signOut(auth);
    
    // Limpiar caché si tienes `cache.js` (opcional)
    localStorage.removeItem("userSession");

    alert("Has cerrado sesión correctamente.");
    window.location.href = "001login.html"; // Redirige al login
  } catch (error) {
    console.error("Error al cerrar sesión:", error.message);
    alert("Error al cerrar sesión: " + error.message);
  }
};
