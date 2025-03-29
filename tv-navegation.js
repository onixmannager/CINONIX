// tv-navigation.js
document.addEventListener("DOMContentLoaded", function() {
  // Aseguramos que todas las tarjetas sean focusables
  document.querySelectorAll('.movie-card').forEach(card => {
    card.setAttribute('tabindex', '0');
  });

  // Añadimos estilo de enfoque dinámicamente (opcional si ya lo tienes en CSS)
  const style = document.createElement('style');
  style.innerHTML = `.movie-card:focus { outline: 3px solid #fff; transform: scale(1.05); z-index: 3; }`;
  document.head.appendChild(style);

  // Función de navegación con teclas de flecha
  document.addEventListener('keydown', function(e) {
    const key = e.key;
    const focused = document.activeElement;
    if (focused && focused.classList.contains('movie-card')) {
      const container = focused.parentElement;
      const cards = Array.from(container.querySelectorAll('.movie-card'));
      const index = cards.indexOf(focused);

      if (key === "ArrowRight") {
        if (index < cards.length - 1) {
          cards[index + 1].focus();
          e.preventDefault();
        }
      } else if (key === "ArrowLeft") {
        if (index > 0) {
          cards[index - 1].focus();
          e.preventDefault();
        }
      } else if (key === "ArrowDown") {
        const currentSection = container.closest('.movies-container');
        let nextSection = currentSection.nextElementSibling;
        while (nextSection && !nextSection.querySelector('.movie-card')) {
          nextSection = nextSection.nextElementSibling;
        }
        if (nextSection) {
          const nextCards = Array.from(nextSection.querySelectorAll('.movie-card'));
          const target = nextCards[index] || nextCards[0];
          target.focus();
          e.preventDefault();
        }
      } else if (key === "ArrowUp") {
        const currentSection = container.closest('.movies-container');
        let prevSection = currentSection.previousElementSibling;
        while (prevSection && !prevSection.querySelector('.movie-card')) {
          prevSection = prevSection.previousElementSibling;
        }
        if (prevSection) {
          const prevCards = Array.from(prevSection.querySelectorAll('.movie-card'));
          const target = prevCards[index] || prevCards[0];
          target.focus();
          e.preventDefault();
        }
      }
    }
  });
});
