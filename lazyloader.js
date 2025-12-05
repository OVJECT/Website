export function initLazyLoader(selector = 'img.lazy-load, .lazy-bg, .lazy-video') {
  // Observer for loading content
  const loadOptions = {
    root: null,
    rootMargin: '100px 0px', // Start loading before it comes into view
    threshold: 0.01
  };

  // Separate observer for playing/pausing video (strict viewport)
  const playbackOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.2 // Play when 20% visible
  };

  const playbackObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        // Play if ready
        if (video.readyState >= 3) {
            video.play().catch(() => {}); // Ignore abort errors
        } else {
            // Wait for it if not ready (rare case if loaded properly)
            video.addEventListener('canplay', () => {
                if(entry.isIntersecting) video.play().catch(()=>{});
            }, { once: true });
        }
      } else {
        video.pause();
      }
    });
  }, playbackOptions);

  const loadObserver = new IntersectionObserver((entries, observer) => {
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
          observer.unobserve(element);
        } 
        else if (element.classList.contains('lazy-video')) {
           const videoSrc = element.dataset.video;
           if (videoSrc) {
               const video = document.createElement('video');
               video.src = videoSrc;
               video.muted = true;
               video.loop = true;
               video.playsInline = true; // Critical for iOS
               video.autoplay = true; // Try autoplay immediately
               
               // Style to fill container (wrapper)
               video.style.width = '100%';
               video.style.height = '100%';
               video.style.objectFit = 'cover';
               video.style.position = 'absolute';
               video.style.top = '0';
               video.style.left = '0';
               video.style.zIndex = '0'; // Behind content (z-index 5) and overlay (z-index 2)
               
               // Handle load state
               video.onloadeddata = () => {
                   element.classList.add('loaded');
               };

               // Append to wrapper directly, effectively making it a full-card background
               element.appendChild(video);
               
               // Start observing for playback control
               playbackObserver.observe(video);
               element.removeAttribute('data-video');
           }
           observer.unobserve(element);
        }
        else {
          // Background image handling
          const bgSrc = element.dataset.bg;
          if (bgSrc) {
            const img = new Image();
            img.src = bgSrc;
            img.onload = () => {
                element.style.backgroundImage = `url('${bgSrc}')`;
                element.classList.add('loaded');
                element.removeAttribute('data-bg');
            };
            img.onerror = () => {
                console.warn('Failed to load background image:', bgSrc);
            };
            observer.unobserve(element);
          }
        }
      }
    });
  }, loadOptions);

  document.querySelectorAll(selector).forEach(el => loadObserver.observe(el));
}