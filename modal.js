import { getCurrentLang } from './i18n.js';

const modalContainer = document.getElementById('modal-container');
const modalContent = modalContainer.querySelector('.modal-content');
const closeButton = modalContainer.querySelector('.close-button');
const overlay = document.getElementById('overlay');
const gridContainer = document.querySelector('.grid-container');

let lastFocusedElement;
let currentOpenItemId = null;

async function openModal(itemId) {
  if (!itemId) return;
  currentOpenItemId = itemId;

  lastFocusedElement = document.activeElement;
  
  try {
    const itemElement = document.querySelector(`.grid-item[data-id="${itemId}"]`);
    if (!itemElement) throw new Error('Item element not found in DOM');

    // 1. Prepare Modal (Hidden)
    modalContainer.style.display = 'block';
    modalContainer.style.visibility = 'hidden';
    modalContainer.style.opacity = '0';
    modalContainer.style.background = '#000000';
    modalContainer.classList.add('dark-theme-modal');

    // --- INSTANT RENDER START (Render BEFORE measuring) ---
    const coverImageUrl = itemElement.dataset.coverImage || null;
    let headerImage = '';
    let isVideo = false;
    
    if (coverImageUrl) {
        if (coverImageUrl.toLowerCase().endsWith('.mp4')) {
            isVideo = true;
            let posterAttr = '';
            const sourceVideo = itemElement.querySelector('video');
            if (sourceVideo && sourceVideo.readyState >= 2) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = sourceVideo.videoWidth;
                    canvas.height = sourceVideo.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
                    const posterDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                    posterAttr = `poster="${posterDataUrl}"`;
                } catch (e) { console.warn(e); }
            }
            headerImage = `<video src="${coverImageUrl}" class="modal-header-image" ${posterAttr} autoplay muted loop playsinline></video>`;
        } else {
            headerImage = `<img src="${coverImageUrl}" alt="" class="modal-header-image">`;
        }
    } else {
        const title = (itemElement.querySelector('.item-title')?.textContent || itemId).trim();
        const initial = title.charAt(0).toUpperCase();
        headerImage = `
            <div class="modal-header-placeholder" data-id="${itemId}">
                <div class="placeholder-initial">${initial}</div>
            </div>
        `;
    }

    // Render immediately to DOM
    modalContent.innerHTML = `
      ${headerImage}
      <div class="modal-inner-content">
        <div style="color: #666; font-family: var(--font-main);">LOADING_DATA...</div>
      </div>
    `;
    modalContainer.scrollTop = 0;
    
    // 2. Measure and Calculate FLIP
    // We need to wait a tick for DOM to update so we can find the header image element
    // However, since we just set innerHTML, it's synchronous.
    // But layout might need a force reflow.
    
    const itemRect = itemElement.getBoundingClientRect();
    let modalHeaderRect = null;
    const modalHeaderEl = modalContainer.querySelector('.modal-header-image') || modalContainer.querySelector('.modal-header-placeholder');
    
    if (modalHeaderEl) {
        // Force layout
        modalHeaderEl.offsetHeight;
        
        // If image is not loaded, height might be 0.
        // Try to use grid item aspect ratio to set initial height of header?
        if (modalHeaderEl.offsetHeight < 10) {
             // fallback: assume header will take roughly same aspect ratio as item
             // But for calculation, we need the final modal layout...
             // If we can't measure, we fallback to whole modal scaling.
        } else {
             // We want to match the header image to the grid item
        }
    }
    
    // Strategy:
    // We want the modal container to transform such that the header image (inside it)
    // overlaps the grid item.
    // But we can only transform the container.
    // If we scale the container, everything inside scales.
    // We want: T(Container) -> HeaderImage_Visual == GridItem_Visual
    
    // Measure the Modal Container in its final state (centered, large)
    const modalRect = modalContainer.getBoundingClientRect();
    
    // Measure the Header Image in the final state
    const headerRect = modalHeaderEl ? modalHeaderEl.getBoundingClientRect() : modalRect;
    
    // Calculate Scale based on Header Image (or Container if no header)
    // We want HeaderRect * Scale = ItemRect (approx)
    // Note: The Header in the modal might be full width of modal.
    // So HeaderWidth == ModalWidth usually.
    
    // If the header has 0 height (not loaded), fallback to item ratio?
    // Let's stick to simple container scaling if header measurement fails.
    let scaleX, scaleY;
    let targetWidth = headerRect.width;
    let targetHeight = headerRect.height;
    
    if (targetHeight < 10) {
        targetWidth = modalRect.width;
        targetHeight = modalRect.height;
    }
    
    scaleX = itemRect.width / targetWidth;
    scaleY = itemRect.height / targetHeight;
    
    // Calculate Translation
    // Center of Header Image in Final Modal
    const headerCenterX = headerRect.left + headerRect.width / 2;
    const headerCenterY = headerRect.top + headerRect.height / 2;
    
    // Center of Grid Item
    const itemCenterX = itemRect.left + itemRect.width / 2;
    const itemCenterY = itemRect.top + itemRect.height / 2;
    
    const translateX = itemCenterX - headerCenterX;
    const translateY = itemCenterY - headerCenterY;

    // 3. Apply Initial State
    modalContainer.style.transition = 'none';
    // We apply transform to container. 
    // Note: If header is at top of modal, headerCenter is different from modalCenter.
    // But we are moving the container so that the header center aligns with item center.
    
    // Current transform is translate(-50%, -50%) which centers the modal.
    // We add our calculated translation to that.
    
    // Wait, getBoundingClientRect returns viewport coordinates including the transform!
    // If we reset transform, the modal would be top-left? No, it's fixed 50% 50%.
    // Actually, we calculated 'translateX/Y' as the difference in Viewport coordinates.
    // So if we apply translate(translateX, translateY) ON TOP of existing position?
    // The existing position is achieved via `top: 50%; left: 50%; transform: translate(-50%, -50%)`.
    // We want to replace `translate(-50%, -50%)` with something.
    
    // Let's just use the delta.
    // The visual position of Header Center is `headerCenterX`.
    // We want it to be `itemCenterX`.
    // So we need to shift X by `itemCenterX - headerCenterX`.
    // This shift should be applied via transform.
    // Since `headerCenterX` was measured with `transform: translate(-50%, -50%)` active (implied by CSS for visible modal, but here we have display block).
    // Wait, `modalContainer` has `transform: translate(-50%, -50%)` in CSS? 
    // Yes: `.modal-container { ... transform: translate(-50%, -50%) scale(0.95); ... }`
    // But we set `display: block`, so it takes those styles.
    
    // Correct Logic:
    // Start Transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scaleX}, ${scaleY})`
    
    modalContainer.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scaleX}, ${scaleY})`;
    
    // 4. Animate
    requestAnimationFrame(() => {
        modalContainer.style.visibility = 'visible';
        modalContainer.style.opacity = '1';
        document.body.classList.add('modal-open');
        overlay.classList.add('visible');
        modalContainer.classList.add('visible');
        modalContainer.setAttribute('aria-hidden', 'false');
        
        // Force Reflow
        modalContainer.offsetHeight;
        
        // Transition to Final State
        modalContainer.style.transition = 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s ease';
        modalContainer.style.transform = 'translate(-50%, -50%) scale(1)';
        
        const cleanup = () => {
            if (modalContainer.style.transform === 'translate(-50%, -50%) scale(1)') {
                 modalContainer.style.transition = '';
                 modalContainer.style.transform = '';
                 modalContainer.style.opacity = '';
            }
            modalContainer.removeEventListener('transitionend', cleanup);
            modalContainer.focus();
        };
        modalContainer.addEventListener('transitionend', cleanup);
    });

    // 5. Fetch Content (Same as before)
    const response = await fetch(`./feed/${itemId}.md?t=${new Date().getTime()}`);
    if (!response.ok) throw new Error(`Failed to fetch content for ${itemId}`);
    const mdContent = await response.text();
    
    const rawContent = mdContent.replace(/^---[\s\S]*?---\s*/, '');
    const lang = getCurrentLang();
    const parts = rawContent.split(/^---([a-z]{2})---\s*$/gm);
    const contentMap = { en: parts[0] };
    for (let i = 1; i < parts.length; i += 2) {
        if (parts[i] && parts[i+1]) contentMap[parts[i]] = parts[i+1];
    }
    const contentForModal = contentMap[lang] || contentMap['en'];
    const mdFileUrl = new URL(response.url);
    const renderer = new window.marked.Renderer();
    renderer.image = (href, title, text) => {
      let finalHref;
      if (/^(https?:)?\/\//.test(href) || href.startsWith('data:')) { finalHref = href; }
      else { finalHref = new URL(href, mdFileUrl).pathname; }
      if (finalHref === coverImageUrl) return '';
      return `<img src="${finalHref}" alt="${text}" ${title ? `title="${title}"` : ''}>`;
    };
    let htmlContent = window.marked.parse(contentForModal, { renderer });
    htmlContent = htmlContent.replace(/apps.apple.com\/([a-z]{2})\//g, (match, p1) => `apps.apple.com/${lang}/`);

    const innerContentDiv = modalContent.querySelector('.modal-inner-content');
    if (innerContentDiv) { innerContentDiv.innerHTML = htmlContent; }
    else { modalContent.innerHTML = `${headerImage}<div class="modal-inner-content">${htmlContent}</div>`; }

  } catch (error) {
    console.error("Error opening modal:", error);
    modalContainer.style.display = 'block';
    requestAnimationFrame(() => {
        document.body.classList.add('modal-open');
        overlay.classList.add('visible');
        modalContainer.classList.add('visible');
        modalContainer.setAttribute('aria-hidden', 'false');
    });
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

  let animated = false;
  if (currentOpenItemId) {
      const itemElement = document.querySelector(`.grid-item[data-id="${currentOpenItemId}"]`);
      if (itemElement) {
        const itemRect = itemElement.getBoundingClientRect();
        const modalRect = modalContainer.getBoundingClientRect();
        
        // Find header image in modal again to reverse accurately
        const modalHeaderEl = modalContainer.querySelector('.modal-header-image') || modalContainer.querySelector('.modal-header-placeholder');
        const headerRect = modalHeaderEl ? modalHeaderEl.getBoundingClientRect() : modalRect;
        
        let targetWidth = headerRect.width;
        let targetHeight = headerRect.height;
        if (targetHeight < 10) { targetWidth = modalRect.width; targetHeight = modalRect.height; }
        
        const scaleX = itemRect.width / targetWidth;
        const scaleY = itemRect.height / targetHeight;
        
        const headerCenterX = headerRect.left + headerRect.width / 2;
        const headerCenterY = headerRect.top + headerRect.height / 2;
        const itemCenterX = itemRect.left + itemRect.width / 2;
        const itemCenterY = itemRect.top + itemRect.height / 2;
        
        const translateX = itemCenterX - modalCenterX;
        const translateY = itemCenterY - modalCenterY;
        
        // Apply Transition
        modalContainer.style.transition = 'transform 0.6s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.6s ease';
        modalContainer.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scaleX}, ${scaleY})`;
        modalContainer.style.opacity = '0';
        animated = true;
      }
  }
  
  if (!animated) {
      modalContainer.style.opacity = '0';
      modalContainer.style.transform = 'translate(-50%, -50%) scale(0.9)';
  }

  const cleanup = () => {
    modalContainer.style.display = 'none';
    modalContainer.style.background = '';
    modalContainer.classList.remove('dark-theme-modal');
    modalContent.innerHTML = '';
    modalContainer.style.transform = '';
    modalContainer.style.transition = '';
    modalContainer.style.opacity = '';
    currentOpenItemId = null;
  };

  const onTransitionEnd = (e) => {
    // Ensure we only react to the modal container's transition
    if (e && e.target !== modalContainer) return;
    cleanup();
    modalContainer.removeEventListener('transitionend', onTransitionEnd);
  };

  modalContainer.addEventListener('transitionend', onTransitionEnd);
  
  // Safety timeout: slightly longer than transition duration
  setTimeout(() => {
      cleanup();
      modalContainer.removeEventListener('transitionend', onTransitionEnd);
  }, 650);

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