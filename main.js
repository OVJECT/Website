import { MasonryGrid } from './MasonryGrid.js';
import { initInteractiveElements } from './interactive-card.js';
import { KeyboardNavigation } from './keyboard-navigation.js';
import { initModalRouting } from './modal.js';
import { initLazyLoader } from './lazyloader.js';
import { DotRenderer } from './DotRenderer.js';


// Fetches markdown metadata and applies custom colors to tags
async function applyTagColors() {
  // ... (Keep existing code but it's commented out or unused)
}

// Boot Animation Function
function runBootSequence() {
  const bootOverlay = document.createElement('div');
  bootOverlay.id = 'boot-overlay';
  Object.assign(bootOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: '#000',
    color: '#ff3b00',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: '2rem',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '1rem',
    flexDirection: 'column',
    pointerEvents: 'none' // Allow clicks to pass through if it gets stuck
  });
  
  document.body.appendChild(bootOverlay);

  const logContainer = document.createElement('div');
  bootOverlay.appendChild(logContainer);

  const messages = [
    "Initializing KERNEL...",
    "Loading VIRTUAL_ENV...",
    "Mounting FILE_SYSTEM...",
    "Allocating MEMORY_BLOCKS...",
    "Analyzing NETWORK_TOPOLOGY...",
    "Fetching MANIFEST.JSON...",
    "Compiling ASSETS...",
    "EXEC_MAIN_THREAD..."
  ];

  let delay = 0;
  
  const typeLine = (text, element) => {
      return new Promise(resolve => {
          const div = document.createElement('div');
          div.textContent = "> ";
          element.appendChild(div);
          let i = 0;
          const interval = setInterval(() => {
              div.textContent += text.charAt(i);
              i++;
              if (i >= text.length) {
                  clearInterval(interval);
                  resolve();
              }
          }, 10 + Math.random() * 20); // Random typing speed
      });
  };

  const run = async () => {
      for (const msg of messages) {
          await typeLine(msg, logContainer);
          await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
          logContainer.scrollTop = logContainer.scrollHeight;
      }
      
      await new Promise(r => setTimeout(r, 300));
      
      const status = document.createElement('div');
      status.style.color = '#fff';
      status.style.marginTop = '1rem';
      status.textContent = "SYSTEM_READY.";
      logContainer.appendChild(status);
      
      setTimeout(() => {
        bootOverlay.style.opacity = '0';
        bootOverlay.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          bootOverlay.remove();
        }, 500);
      }, 600);
  };

  run();
}

function updateClock() {
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS
    clockEl.textContent = timeString;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Run boot sequence only if not hash navigation
  if (!window.location.hash) {
    runBootSequence();
  }

  // Initialize Dot Matrix Background
  const dotRenderer = new DotRenderer('#intro-canvas', '.intro-section');
  
  // Use a function to handle path resolution
  const getAssetPath = (path) => {
      // Simple relative path handling
      return path;
  };

  const bgImages = [
    'feed/assets/kairo.png',
    'feed/assets/pita_field.png',
    'feed/assets/pita_game.gif',
    'feed/assets/random.png'
  ];
  
  if (bgImages.length > 0) {
    const randomImg = bgImages[Math.floor(Math.random() * bgImages.length)];
    dotRenderer.loadImage(randomImg).catch(e => console.warn('DotRenderer failed to load image:', e));
  }

  const grid = new MasonryGrid('.grid-container', '.grid-item', {
    gutter: 0.8,
    containerPadding: 2, 
    minWidth: '20rem',
    maxWidth: '21rem',
    initInteractiveElements: initInteractiveElements
  });

  grid.init().then(async () => {
    initInteractiveElements();
    initLazyLoader();
    new KeyboardNavigation();
    initModalRouting();
    
    // Add Footer System Status
    const footer = document.createElement('footer');
    footer.style.textAlign = 'center';
    footer.style.padding = '2rem';
    footer.style.color = '#333';
    footer.style.fontFamily = "'JetBrains Mono', monospace";
    footer.style.fontSize = '0.8rem';
    footer.style.marginTop = '4rem';
    footer.style.borderTop = '1px solid #111';
    footer.innerHTML = `
      <div style="margin-bottom: 0.5rem;">SYSTEM STATUS: ONLINE ●</div>
      <div>© ${new Date().getFullYear()} OVJECT INC. ALL RIGHTS RESERVED.</div>
    `;
    document.body.appendChild(footer);

    // Start Status Clock
    updateClock();
    setInterval(updateClock, 1000);

  }).catch(error => console.error("Initialization failed:", error));
});
