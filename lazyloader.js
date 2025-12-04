export function initLazyLoader(selector = 'img.lazy-load, .lazy-bg') {
  const observerOptions = {
    root: null, // viewport
    rootMargin: '50px 0px', // Preload a bit before coming into view
    threshold: 0.01
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        if (element.tagName === 'IMG') {
          const src = element.dataset.src;
          if (src) {
            element.src = src;
            element.onload = () => element.classList.add('loaded');
            element.removeAttribute('data-src');
          }
        } else {
          // Background image handling with preloading
          const bgSrc = element.dataset.bg;
          if (bgSrc) {
            const img = new Image();
            img.src = bgSrc;
            img.onload = () => {
                element.style.backgroundImage = `url('${bgSrc}')`;
                element.classList.add('loaded');
                element.removeAttribute('data-bg');
            };
            // If error, maybe keep placeholder?
            img.onerror = () => {
                console.warn('Failed to load background image:', bgSrc);
                // Optionally add a 'error' class or just leave placeholder
            };
          }
        }

        observer.unobserve(element);
      }
    });
  }, observerOptions);

  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}
