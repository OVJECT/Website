import { getCurrentLang } from './i18n.js';

function parseFrontMatter(markdown) {
  const match = /---\s*[\r\n]+([\s\S]*?)[\r\n]+---/.exec(markdown);
  if (!match) {
    console.warn('File without front matter found, skipping metadata parsing.');
    return { metadata: {}, content: markdown };
  }
  const metadata = {};
  match[1].split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      metadata[key] = parts.slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
    }
  });
  return { metadata, content: markdown.slice(match[0].length) };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

const LABELS = {
  en: { all: 'All', count: n => `${n} ${n === 1 ? 'object' : 'objects'}` },
  ko: { all: '전체', count: n => `${n}개의 오브제` }
};

// Loads the project cards from feed/manifest.json and handles category / search filtering.
// Layout is plain CSS grid; filtering animates through the View Transitions API where available.
export class ProjectGrid {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) throw new Error(`Container ${containerSelector} not found`);
    this.innerContainer = this.container.querySelector('.grid-inner');
    if (!this.innerContainer) {
      this.innerContainer = document.createElement('div');
      this.innerContainer.className = 'grid-inner';
      this.container.appendChild(this.innerContainer);
    }
    this.options = { manifest: 'feed/manifest.json', ...options };
    this.lang = getCurrentLang();
    this.labels = LABELS[this.lang] || LABELS.en;
    this.items = [];
    this.categories = new Set(['all']);
    this.currentCategory = 'all';
    this.currentSearch = '';
  }

  async init() {
    await this.loadGridItems();
    this.setupCategoryMenu();
    this.setupSearch();
    this.updateCount();
    this.container.classList.add('is-ready');
  }

  // Base URL of the app, so feed paths resolve the same from "/" and "/index.html".
  getAppBaseUrl() {
    let url = window.location.href.split('#')[0].split('?')[0];
    if (url.endsWith('index.html') || url.endsWith('index.htm')) {
      url = url.substring(0, url.lastIndexOf('/') + 1);
    }
    if (!url.endsWith('/')) url += '/';
    return url;
  }

  async loadGridItems() {
    const baseUrl = this.getAppBaseUrl();
    const manifestUrl = new URL(this.options.manifest, baseUrl).href;
    const manifestResponse = await fetch(manifestUrl);
    if (!manifestResponse.ok) {
      throw new Error(`Failed to load manifest.json from ${manifestUrl} (Status: ${manifestResponse.status})`);
    }
    const manifest = await manifestResponse.json();

    // Fetch in parallel, but build the cards in manifest order so the grid
    // (and the category menu) come out the same on every load.
    const loaded = await Promise.all(manifest.files.map(file =>
      fetch(new URL(file, baseUrl).href)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load ${file}`);
          return response.text();
        })
        .then(markdown => ({ file, markdown }))
        .catch(error => {
          console.error('Error loading grid item:', error);
          return null;
        })
    ));

    loaded.forEach(entry => {
      if (!entry) return;
      const { metadata } = parseFrontMatter(entry.markdown);
      metadata.fileName = entry.file.split('/').pop().replace('.md', '');
      this.createGridItem(metadata);
      if (metadata.category) this.categories.add(metadata.category);
    });
  }

  createGridItem(metadata) {
    const id = metadata.fileName;
    const title = metadata.title || 'Untitled';
    const description = metadata[`description_${this.lang}`] || metadata.description || '';

    const item = document.createElement('article');
    item.className = 'grid-item';
    item.dataset.id = id;
    item.dataset.title = title.toLowerCase();
    item.style.setProperty('--i', String(this.items.length));
    item.style.viewTransitionName = `card-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    if (metadata.category) item.dataset.category = metadata.category;
    if (metadata.backgroundColor) {
      item.dataset.backgroundColor = metadata.backgroundColor;
      item.style.setProperty('--card-color', metadata.backgroundColor);
    }
    if (metadata.coverImage) item.dataset.coverImage = metadata.coverImage;
    if (metadata.coverPoster) item.dataset.coverPoster = metadata.coverPoster;
    if (metadata.size && /\bwx2\b/i.test(metadata.size)) item.classList.add('grid-item-width-2');

    // Media tile: lazy background image, lazy video (with still-frame poster), or an initial.
    let mediaClass = 'card-media';
    let mediaAttrs = '';
    let mediaInner = '';
    if (metadata.coverImage) {
      mediaClass += ' has-cover-image';
      if (metadata.coverImage.toLowerCase().endsWith('.mp4')) {
        mediaClass += ' lazy-video';
        mediaAttrs = ` data-video="${escapeHtml(metadata.coverImage)}"`;
        if (metadata.coverPoster) mediaAttrs += ` data-poster="${escapeHtml(metadata.coverPoster)}"`;
      } else {
        mediaClass += ' lazy-bg';
        mediaAttrs = ` data-bg="${escapeHtml(metadata.coverImage)}"`;
      }
    } else {
      mediaInner = `<span class="card-initial" aria-hidden="true">${escapeHtml(title.charAt(0).toUpperCase())}</span>`;
    }

    const tag = metadata.category ? `<span class="category-tag">${escapeHtml(metadata.category)}</span>` : '';
    item.innerHTML = `
      <a class="grid-item-link" href="#item/${escapeHtml(id)}" aria-label="${escapeHtml(title)}">
        <div class="interactive-wrapper card">
          <div class="${mediaClass}"${mediaAttrs}>${mediaInner}</div>
          <div class="card-caption">
            <div class="card-title-row">
              <h3 class="card-title">${escapeHtml(title)}</h3>
              ${tag}
            </div>
            <p class="card-description">${escapeHtml(description)}</p>
          </div>
        </div>
      </a>`;

    this.innerContainer.appendChild(item);
    this.items.push(item);
  }

  setupCategoryMenu() {
    const menu = document.querySelector('.category-menu');
    if (!menu) return;

    menu.innerHTML = `<button class="category-button active" data-category="all" aria-pressed="true">${escapeHtml(this.labels.all)}</button>`;
    this.categories.forEach(category => {
      if (category === 'all') return;
      const button = document.createElement('button');
      button.className = 'category-button';
      button.dataset.category = category;
      button.textContent = category.toLowerCase(); // CSS capitalises the label
      button.setAttribute('aria-pressed', 'false');
      menu.appendChild(button);
    });

    menu.addEventListener('click', e => {
      const button = e.target.closest('.category-button');
      if (!button) return;
      this.currentCategory = button.dataset.category;

      if (this.currentCategory === 'all') {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        this.currentSearch = '';
      }

      menu.querySelectorAll('.category-button').forEach(btn => {
        btn.classList.toggle('active', btn === button);
        btn.setAttribute('aria-pressed', btn === button ? 'true' : 'false');
      });

      this.applyFilters();

      // If the reader is further down the page, bring the grid back into view.
      const gridTop = this.container.getBoundingClientRect().top + window.pageYOffset;
      const headerOffset = 96;
      if (window.pageYOffset > gridTop - headerOffset) {
        window.scrollTo({ top: gridTop - headerOffset, behavior: 'smooth' });
      }
    });
  }

  setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    searchInput.addEventListener('input', e => {
      this.currentSearch = e.target.value.toLowerCase().trim();
      this.applyFilters();
    });
  }

  applyFilters() {
    const update = () => {
      this.items.forEach(item => {
        const category = item.dataset.category;
        const matchesCategory = this.currentCategory === 'all' || category === this.currentCategory || !category;
        const matchesSearch = !this.currentSearch || item.dataset.title.includes(this.currentSearch);
        item.hidden = !(matchesCategory && matchesSearch);
      });
      this.updateCount();
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition === 'function' && !reduceMotion) {
      document.startViewTransition(update);
    } else {
      update();
    }
  }

  updateCount() {
    const el = document.getElementById('grid-count');
    if (!el) return;
    const visible = this.items.filter(item => !item.hidden).length;
    el.textContent = this.labels.count(visible);
  }
}
