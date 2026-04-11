/**
 * ╔══════════════════════════════════════════════════════╗
 * ║       CINONIX — Sistema de Navegación para TV        ║
 * ║   Incluir en cinonix.html, series.html y videox.html ║
 * ╚══════════════════════════════════════════════════════╝
 *
 *  Uso:  <script src="tv-navigation.js" defer></script>
 *
 *  Activa automáticamente cuando detecta:
 *    - Android TV / Google TV / Tizen / webOS / Fire TV
 *    - O manualmente con ?tv=1 en la URL para pruebas
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     1.  DETECCIÓN DE TV
  ══════════════════════════════════════════════════════ */
  function detectarTV() {
    const ua = navigator.userAgent;

    // User-Agents conocidos de Smart TVs y dongles
    const esTVporUA = /Android TV|GoogleTV|Google TV|SmartTV|Smart-TV|HbbTV|NetCast\.TV|Tizen|webOS|SMART-TV|AppleTV|Roku|Silk|CrKey|NETTV|PhilipsTV|Viera|AmazonWebAppPlatform/i.test(ua);

    // Parámetro manual para pruebas en escritorio: añade ?tv=1 a la URL
    const esTVporParam = /[?&]tv=1/.test(location.search);

    return esTVporUA || esTVporParam;
  }

  // Si no es TV, salir sin hacer nada
  if (!detectarTV()) return;

  /* ══════════════════════════════════════════════════════
     2.  ACTIVAR MODO TV
  ══════════════════════════════════════════════════════ */
  document.documentElement.classList.add('tv-mode');

  // Inyectar estilos TV
  const cssLink = document.createElement('link');
  cssLink.rel  = 'stylesheet';
  cssLink.href = 'tv-styles.css';
  document.head.appendChild(cssLink);

  console.log('%c📺 Cinonix TV Mode activado', 'color:#e50914;font-size:14px;font-weight:bold;');

  /* ══════════════════════════════════════════════════════
     3.  ELEMENTOS NAVEGABLES
  ══════════════════════════════════════════════════════ */

  // Selectores de todo lo que puede recibir foco
  const SELECTOR_NAVEGABLES = [
    'a[href]',
    'button:not([disabled])',
    '.movie-card[tabindex]',
    '.poster-item[tabindex]',
    '.filter-btn',
    '.episode-btn',
    '.saga-movie-btn',
    '.season-option',
    '.navbar-nav a',
  ].join(', ');

  // Añadir tabindex a cards que no lo tienen
  function prepararCards() {
    document.querySelectorAll('.movie-card, .poster-item').forEach(el => {
      if (el.getAttribute('tabindex') === null) {
        el.setAttribute('tabindex', '0');
      }
    });
  }

  // Obtener todos los elementos visibles y navegables en este momento
  function obtenerNavegables() {
    prepararCards();
    return Array.from(document.querySelectorAll(SELECTOR_NAVEGABLES)).filter(el => {
      const rect  = el.getBoundingClientRect();
      const estilo = getComputedStyle(el);
      const padreOculto = el.closest('.hidden, [style*="display: none"]');
      return (
        rect.width  > 0 &&
        rect.height > 0 &&
        estilo.visibility !== 'hidden' &&
        estilo.display    !== 'none'   &&
        !padreOculto
      );
    });
  }

  /* ══════════════════════════════════════════════════════
     4.  NAVEGACIÓN ESPACIAL (flechas del mando)
  ══════════════════════════════════════════════════════ */
  let elementoActual = null;

  function centroDeRect(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  /**
   * Busca el elemento más cercano en la dirección indicada.
   * Usa un sistema de puntuación: prioriza distancia en el eje
   * principal y penaliza distancia perpendicular.
   */
  function buscarMasCercano(actual, direccion) {
    const todos  = obtenerNavegables();
    const rActual = actual.getBoundingClientRect();
    const cActual = centroDeRect(rActual);

    let mejor      = null;
    let mejorPuntos = Infinity;

    todos.forEach(el => {
      if (el === actual) return;
      const rect  = el.getBoundingClientRect();
      const centro = centroDeRect(rect);

      const dx = centro.x - cActual.x;
      const dy = centro.y - cActual.y;

      let enDireccion = false;
      let distPrincipal  = 0;
      let distSecundaria = 0;

      switch (direccion) {
        case 'derecha': enDireccion = dx >  15; distPrincipal =  dx; distSecundaria = Math.abs(dy); break;
        case 'izquierda': enDireccion = dx < -15; distPrincipal = -dx; distSecundaria = Math.abs(dy); break;
        case 'abajo':   enDireccion = dy >  15; distPrincipal =  dy; distSecundaria = Math.abs(dx); break;
        case 'arriba':  enDireccion = dy < -15; distPrincipal = -dy; distSecundaria = Math.abs(dx); break;
      }

      if (!enDireccion) return;

      // Puntuación: menor es mejor. La distancia lateral penaliza x2
      const puntos = distPrincipal + distSecundaria * 2;
      if (puntos < mejorPuntos) {
        mejorPuntos = puntos;
        mejor = el;
      }
    });

    return mejor;
  }

  function enfocar(el) {
    if (!el) return;

    // Quitar foco anterior
    if (elementoActual) {
      elementoActual.classList.remove('tv-focused');
    }

    elementoActual = el;
    el.classList.add('tv-focused');
    el.focus({ preventScroll: false });

    // Hacer scroll suave para que el elemento quede visible
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  /* ══════════════════════════════════════════════════════
     5.  ESCUCHAR TECLADO / MANDO
  ══════════════════════════════════════════════════════ */
  const MAPA_TECLAS = {
    ArrowRight : 'derecha',
    ArrowLeft  : 'izquierda',
    ArrowDown  : 'abajo',
    ArrowUp    : 'arriba',
    // Algunos mandos envían estas teclas
    Right      : 'derecha',
    Left       : 'izquierda',
    Down       : 'abajo',
    Up         : 'arriba',
  };

  document.addEventListener('keydown', function (e) {
    const direccion = MAPA_TECLAS[e.key];

    /* — FLECHAS — */
    if (direccion) {
      e.preventDefault();
      prepararCards();

      // Si no hay foco aún, enfocar el primer elemento
      if (!elementoActual || !document.body.contains(elementoActual)) {
        const todos = obtenerNavegables();
        if (todos.length) enfocar(todos[0]);
        return;
      }

      const siguiente = buscarMasCercano(elementoActual, direccion);
      if (siguiente) enfocar(siguiente);
      return;
    }

    /* — ENTER / OK del mando — */
    if (e.key === 'Enter' || e.key === ' ') {
      if (elementoActual) {
        e.preventDefault();
        elementoActual.click();
      }
      return;
    }

    /* — ATRÁS / ESCAPE — */
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Back') {
      // Primero intenta cerrar un modal abierto
      const modal = document.querySelector(
        '#selectorModal.open, #movieModal.open, #seriesModal.open, .modal-overlay.open'
      );
      if (modal) {
        const btnCerrar = modal.querySelector(
          '[id$="Close"], [id$="close"], .modal-close, .selector-close, button[class*="close"]'
        );
        if (btnCerrar) { btnCerrar.click(); return; }
      }
      // Si no hay modal, volver atrás (Backspace)
      if (e.key === 'Backspace' || e.key === 'Back') {
        e.preventDefault();
        history.back();
      }
    }
  });

  /* ══════════════════════════════════════════════════════
     6.  REFOCO TRAS CIERRE DE MODAL
  ══════════════════════════════════════════════════════ */
  // Cuando un modal se cierra, volver a enfocar un elemento de la página
  const observador = new MutationObserver(() => {
    const modalAbierto = document.querySelector(
      '#selectorModal.open, #movieModal.open, #seriesModal.open'
    );
    if (!modalAbierto) {
      // El modal se cerró: si el foco actual ya no existe, buscar el primero
      if (!elementoActual || !document.body.contains(elementoActual)) {
        setTimeout(() => {
          const todos = obtenerNavegables();
          if (todos.length) enfocar(todos[0]);
        }, 100);
      }
    }
  });
  observador.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  /* ══════════════════════════════════════════════════════
     7.  PÁGINA DE VÍDEO — PANTALLA COMPLETA AUTOMÁTICA
  ══════════════════════════════════════════════════════ */
  if (document.querySelector('.video-container')) {
    // Página de vídeo: ir a pantalla completa sin esperar clic
    window.addEventListener('load', function () {
      setTimeout(function () {
        const el = document.documentElement;
        const fn = el.requestFullscreen
          || el.webkitRequestFullscreen
          || el.mozRequestFullScreen
          || el.msRequestFullscreen;
        if (fn) fn.call(el).catch(() => {});
      }, 600);
    });
  }

  /* ══════════════════════════════════════════════════════
     8.  INICIALIZACIÓN
  ══════════════════════════════════════════════════════ */
  function init() {
    prepararCards();
    // Enfocar el primer elemento navegable al cargar
    setTimeout(function () {
      const todos = obtenerNavegables();
      if (todos.length) enfocar(todos[0]);
    }, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // También preparar cards cargadas dinámicamente
  window.addEventListener('load', prepararCards);

})();
