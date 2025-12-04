import { getCurrentLang } from './i18n.js';

const modalContainer = document.getElementById('modal-container');
const modalContent = modalContainer.querySelector('.modal-content');
const closeButton = modalContainer.querySelector('.close-button');
const overlay = document.getElementById('overlay');
const gridContainer = document.querySelector('.grid-container');

let lastFocusedElement;

async function openModal(itemId) {
  if (!itemId) return;

  lastFocusedElement = document.activeElement;
  modalContainer.style.display = 'block';
  
  await new Promise(resolve => requestAnimationFrame(resolve));

  document.body.classList.add('modal-open');
  overlay.classList.add('visible');
  modalContainer.classList.add('visible');
  modalContainer.setAttribute('aria-hidden', 'false');
  modalContainer.focus();

  try {
    const itemElement = document.querySelector(`.grid-item[data-id="${itemId}"]`);
    if (!itemElement) throw new Error('Item element not found in DOM');

    // Always use dark theme for modal content background as per user request
    modalContainer.style.background = '#000000';
    modalContainer.classList.add('dark-theme-modal');
    
    const coverImageUrl = itemElement.dataset.coverImage || null;
    
    const response = await fetch(`/feed/${itemId}.md?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error(`Failed to fetch content for ${itemId}`);
    const mdContent = await response.text();
    
    // YAML frontmatter를 제거합니다. (---로 둘러싸인 부분)
    const rawContent = mdContent.replace(/^---[\s\S]*?---\s*/, '');
    
    // Handle Multi-Language Content (Split by ---code---)
    const lang = getCurrentLang();
    
    // Regex to split by language delimiters (e.g., ---ko---, ---de---)
    // The capturing group ([a-z]{2}) includes the language code in the result array
    const parts = rawContent.split(/^---([a-z]{2})---\s*$/gm);
    
    const contentMap = { en: parts[0] }; // First part is always default (English)
    
    // Iterate through the parts: odd indices are lang codes, even indices are content
    for (let i = 1; i < parts.length; i += 2) {
        const langCode = parts[i];
        const content = parts[i+1];
        if (langCode && content) {
            contentMap[langCode] = content;
        }
    }
    
    const contentForModal = contentMap[lang] || contentMap['en'];

    const mdFileUrl = new URL(response.url);

    const renderer = new window.marked.Renderer();
    
    renderer.image = (href, title, text) => {
      let finalHref;
      if (/^(https?:)?\/\//.test(href) || href.startsWith('data:')) {
        finalHref = href;
      } else {
        finalHref = new URL(href, mdFileUrl).pathname;
      }

      if (finalHref === coverImageUrl) {
        return '';
      }
      
      return `<img src="${finalHref}" alt="${text}" ${title ? `title="${title}"` : ''}>`;
    };
    
    let htmlContent = window.marked.parse(contentForModal, { renderer });

    // Localize App Store Links (e.g., /kr/ -> /en/)
    htmlContent = htmlContent.replace(/apps.apple.com\/([a-z]{2})\//g, (match, p1) => {
        return `apps.apple.com/${lang}/`;
    });

    let headerImage = '';
    if (coverImageUrl) {
        if (coverImageUrl.toLowerCase().endsWith('.mp4')) {
            headerImage = `<video src="${coverImageUrl}" class="modal-header-image" autoplay muted loop playsinline></video>`;
        } else {
            headerImage = `<img src="${coverImageUrl}" alt="" class="modal-header-image">`;
        }
    } else {
        // Generate placeholder header for items without cover image
        const titleMatch = mdContent.match(/title:\s*["']?(.*?)["']?\n/);
        const title = titleMatch ? titleMatch[1] : itemId;
        const initial = title.charAt(0).toUpperCase();
        
        headerImage = `
            <div class="modal-header-placeholder" data-id="${itemId}">
                <div class="placeholder-initial">${initial}</div>
            </div>
        `;
    }

    modalContent.innerHTML = `
      ${headerImage}
      <div class="modal-inner-content">
        ${htmlContent}
      </div>
    `;
    modalContainer.scrollTop = 0;

  } catch (error) {
    console.error("Error opening modal:", error);
    modalContent.innerHTML = `<div class="modal-inner-content"><p>Error loading content.</p></div>`;
  }
}

function closeModal() {
  if (!modalContainer.classList.contains('visible')) return;

  history.pushState("", document.title, window.location.pathname + window.location.search);
  
  document.body.classList.remove('modal-open');
  overlay.classList.remove('visible');
  modalContainer.classList.remove('visible');
  modalContainer.setAttribute('aria-hidden', 'true');
  modalContainer.style.background = ''; // Reset background
  modalContainer.classList.remove('dark-theme-modal');

  modalContainer.addEventListener('transitionend', () => {
    if (!modalContainer.classList.contains('visible')) {
      modalContainer.style.display = 'none';
      modalContent.innerHTML = '';
    }
  }, { once: true });

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

function handleStateChange() {
  const hash = window.location.hash;
  const match = hash.match(/^#item\/(.+)/);
  if (match) {
    openModal(match[1]);
  } else {
    closeModal();
  }
}

export function initModalRouting() {
  gridContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.grid-item[data-id]');
    if (item) {
      e.preventDefault();
      const itemId = item.dataset.id;
      if (window.location.hash !== `#item/${itemId}`) {
        history.pushState({ itemId }, ``, `#item/${itemId}`);
        openModal(itemId);
      }
    }
  });

  closeButton.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  window.addEventListener('popstate', (e) => {
    handleStateChange();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalContainer.classList.contains('visible')) {
      closeModal();
    }
  });

  handleStateChange();
}