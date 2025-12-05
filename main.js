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
  bootOverlay.style.position = 'fixed';
  bootOverlay.style.top = '0';
  bootOverlay.style.left = '0';
  bootOverlay.style.width = '100%';
  bootOverlay.style.height = '100%';
  bootOverlay.style.background = '#000';
  bootOverlay.style.color = '#ff3b00';
  bootOverlay.style.zIndex = '9999';
  bootOverlay.style.display = 'flex';
  bootOverlay.style.alignItems = 'center';
  bootOverlay.style.justifyContent = 'center';
  bootOverlay.style.fontFamily = "'JetBrains Mono', monospace";
  bootOverlay.style.fontSize = '1.2rem';
  bootOverlay.style.flexDirection = 'column';
  
  document.body.appendChild(bootOverlay);

  const messages = [
    "INITIALIZING SYSTEM...",
    "LOADING MODULES...",
    "CONNECTING TO OVJECT_NET...",
    "READY."
  ];

  let delay = 0;
  messages.forEach((msg, index) => {
    setTimeout(() => {
      bootOverlay.innerHTML += `<div>> ${msg}</div>`;
    }, delay);
    delay += 300 + Math.random() * 400;
  });

  setTimeout(() => {
    bootOverlay.style.opacity = '0';
    bootOverlay.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      bootOverlay.remove();
    }, 500);
  }, delay + 500);
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
  // Run boot sequence only if not hash navigation (optional, but nice)
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
    // console.log('Loading Dot Matrix Image:', randomImg);
    dotRenderer.loadImage(randomImg).catch(e => console.warn('DotRenderer failed to load image:', e));
  }

  const grid = new MasonryGrid('.grid-container', '.grid-item', {
    gutter: 0.8,
    containerPadding: 2, // This option is now ignored for actual padding application
    minWidth: '20rem',
    maxWidth: '21rem',
    initInteractiveElements: initInteractiveElements
  });

  // 그리드를 초기화한 후 다른 컴포넌트들을 초기화합니다.
  grid.init().then(async () => {
    // await applyTagColors(); // TE Style: Disable custom tag colors to maintain monochrome aesthetic
    initInteractiveElements();
    initLazyLoader(); // Initialize lazy loading for images
    new KeyboardNavigation();
    initModalRouting(); // 새로운 모달 시스템을 초기화합니다.
    
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