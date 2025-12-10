import { MasonryGrid } from './MasonryGrid.js';
import { initInteractiveElements } from './interactive-card.js';
import { KeyboardNavigation } from './keyboard-navigation.js';
import { initModalRouting } from './modal.js';
import { initLazyLoader } from './lazyloader.js';
import { DotRenderer } from './DotRenderer.js';
import { TiltEffect } from './TiltEffect.js';


// Fetches markdown metadata and applies custom colors to tags
async function applyTagColors() {
  // ... (Keep existing code but it's commented out or unused)
}

// Boot Console Manager
const BootConsole = {
  overlay: null,
  container: null,
  queue: [],
  isTyping: false,
  isActive: false,

  init() {
    this.isActive = true;
    this.overlay = document.createElement('div');
    this.overlay.id = 'boot-overlay';
    Object.assign(this.overlay.style, {
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
      pointerEvents: 'none'
    });
    
    document.body.appendChild(this.overlay);
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start', // Align text to left
        overflowY: 'hidden'
    });
    this.overlay.appendChild(this.container);

    // Initial Logs
    this.log("BIOS_CHECK [0x0000] ... OK");
    this.log("INIT_KERNEL_MODULES ... START");
  },

  log(message) {
    if (!this.isActive) return;
    this.queue.push(message);
    this.processQueue();
  },

  async processQueue() {
    if (this.isTyping || this.queue.length === 0) return;

    this.isTyping = true;
    const msg = this.queue.shift();
    await this.typeLine(msg);
    this.isTyping = false;
    this.processQueue();
  },

  typeLine(text) {
    return new Promise(resolve => {
      const div = document.createElement('div');
      div.textContent = "> ";
      // Prepend to keep latest at bottom if flex-end, but we are using column top-down
      // Actually, standard terminal adds to bottom. 
      // Let's scroll to bottom if needed.
      this.container.appendChild(div);
      
      let i = 0;
      // Ultra fast typing
      const speed = 0.5 + Math.random() * 3; 
      
      const interval = setInterval(() => {
        div.textContent += text.charAt(i);
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          // Minimal pause after line completion
          setTimeout(resolve, 5); 
        }
        // Auto scroll
        // this.overlay.scrollTop = this.overlay.scrollHeight; 
      }, speed);
    });
  },

  finish() {
    this.log("EXEC_MAIN_THREAD (PID: 1337) ... STARTED");
    this.log("SYSTEM_READY.");
    
    // Wait for the queue to empty before fading out
    const checkQueue = setInterval(() => {
        if (this.queue.length === 0 && !this.isTyping) {
            clearInterval(checkQueue);
            setTimeout(() => {
                this.overlay.style.opacity = '0';
                this.overlay.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    this.overlay.remove();
                    this.isActive = false;
                }, 300);
            }, 100);
        }
    }, 100);
  }
};

function updateClock() {
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS
    clockEl.textContent = timeString;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Run boot sequence only if not hash navigation AND not run in this session yet
  const bootRun = sessionStorage.getItem('boot_sequence_run');
  if (!window.location.hash && !bootRun) {
    BootConsole.init();
    sessionStorage.setItem('boot_sequence_run', 'true');
  }

  // Cookie Consent Toast
  const checkCookieConsent = () => {
    if (!localStorage.getItem('cookie_consent')) {
      const toast = document.createElement('div');
      toast.id = 'cookie-toast';
      toast.innerHTML = `
        <div class="cookie-text">
          We use cookies to analyze traffic and improve your experience.
        </div>
        <div class="cookie-actions">
          <button id="cookie-accept" class="cookie-btn">OK</button>
          <a href="Privacy Policy.html" target="_blank" class="cookie-link">Privacy Policy</a>
        </div>
      `;
      document.body.appendChild(toast);
      
      // Animate in
      requestAnimationFrame(() => {
        toast.classList.add('visible');
      });

      document.getElementById('cookie-accept').addEventListener('click', () => {
        localStorage.setItem('cookie_consent', 'true');
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 500);
      });
    }
  };
  
  // Delay cookie toast slightly to let intro finish
  setTimeout(checkCookieConsent, 2000);

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
    initInteractiveElements: initInteractiveElements,
    onLog: (msg) => BootConsole.log(msg) // Hook up logging
  });

  grid.init().then(async () => {
    initInteractiveElements();
    initLazyLoader();
    new KeyboardNavigation();
    initModalRouting();
    
    // Signal boot completion
    if (BootConsole.isActive) {
        BootConsole.finish();
    }
    
    // Add Footer System Status
    const footer = document.createElement('footer');
    footer.style.textAlign = 'center';
    footer.style.padding = '2rem';
    footer.style.color = '#333';
    footer.style.fontFamily = "'JetBrains Mono', monospace";
    footer.style.fontSize = '0.8rem';
    footer.style.marginTop = '0';
    footer.style.borderTop = '1px solid #111';
    footer.innerHTML = `
      <div style="margin-bottom: 0.5rem;">SYSTEM STATUS: ONLINE ●</div>
      <div style="margin-bottom: 0.5rem;">
        <a href="Privacy Policy.html" target="_blank" style="color: #666; text-decoration: none; border-bottom: 1px dotted #666;">PRIVACY POLICY</a>
      </div>
      <div>© ${new Date().getFullYear()} OVJECT INC. ALL RIGHTS RESERVED.</div>
    `;
    document.body.appendChild(footer);

    // Start Status Clock
    updateClock();
    setInterval(updateClock, 1000);

  }).catch(error => console.error("Initialization failed:", error));
});
