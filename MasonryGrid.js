import { getCurrentLang } from './i18n.js';

function parseFrontMatter(markdown) {
  const match = /---\n([\s\S]*?)\n---/.exec(markdown);
  if (!match) {
    console.warn('File without front matter found, skipping metadata parsing.');
    return { metadata: {}, content: markdown };
  }

  const frontMatter = match[1];
  const content = markdown.slice(match[0].length);

  const metadata = {};
  frontMatter.split('\n').forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
      metadata[key] = value;
    }
  });

  return { metadata, content };
}

export class MasonryGrid {
  constructor(containerSelector, itemSelector, options) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) throw new Error(`Container ${containerSelector} not found`);
    this.innerContainer = this.container.querySelector('.grid-inner');
    if (!this.innerContainer) {
        console.warn('.grid-inner not found, creating one.');
        this.innerContainer = document.createElement('div');
        this.innerContainer.className = 'grid-inner';
        this.container.appendChild(this.innerContainer);
    }
    
    this.itemSelector = itemSelector;
    this.options = {
        gutter: 1, // in rem
        containerPadding: 2, // in rem
        ...options
    };
    this.items = [];
    this.categories = new Set(['all']);
    
    this.debouncedLayout = this.debounce(this.layout.bind(this), 100);
  }

  async init() {
    // this.container.style.padding = `${this.options.containerPadding}rem`; // Removed: Let CSS handle padding
    await this.loadGridItems();
    this.setupCategoryMenu();
    
    await this.imagesLoaded();
    this.layout();
    
    window.addEventListener('resize', this.debouncedLayout);
    return Promise.resolve();
  }

  async loadGridItems() {
    try {
      const manifestResponse = await fetch('feed/manifest.json');
      if (!manifestResponse.ok) {
        throw new Error('Failed to load manifest.json');
      }
      const manifest = await manifestResponse.json();
      const fileList = manifest.files;

      const fetchPromises = fileList.map(file =>
        fetch(file)
          .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${file}`);
            return response.text();
          })
          .then(markdown => {
            const { metadata, content } = parseFrontMatter(markdown);
            metadata.fileName = file.split('/').pop().replace('.md', '');
            this.createGridItem(metadata, content);
            if (metadata.category) {
              this.categories.add(metadata.category);
            }
          })
          .catch(error => console.error('Error loading grid item:', error))
      );
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Error loading grid items from manifest:', error);
    }
  }

  createGridItem(metadata, content) {
    const item = document.createElement('div');
    item.className = 'grid-item';
    if (metadata.category) {
      item.dataset.category = metadata.category;
    }
    item.dataset.id = metadata.fileName;

    // Store background color and cover image for modal
    if (metadata.backgroundColor) {
        item.dataset.backgroundColor = metadata.backgroundColor;
    }
    if (metadata.coverImage) {
        item.dataset.coverImage = metadata.coverImage;
    }

    if (metadata.size) {
        const sizes = metadata.size.toLowerCase().split(' ');
        sizes.forEach(size => {
            if (size === 'wx2') item.classList.add('grid-item-width-2');
            if (size === 'hx2') item.classList.add('grid-item-height-2');
        });
    }

    const anchor = document.createElement('a');
    anchor.href = `#/item/${metadata.fileName}`;
    anchor.className = 'grid-item-link';
    anchor.setAttribute('aria-label', `View details for ${metadata.title}`);

    const wrapper = document.createElement('div');
    wrapper.className = 'interactive-wrapper';

    // Enforce TE Theme: Ignore metadata background color for the card face
    // if (metadata.backgroundColor) {
    //     wrapper.style.backgroundColor = metadata.backgroundColor;
    // }

    // If no background color is specified, or it's the default page background,
    // assume a dark theme for the card content.
    // if (!metadata.backgroundColor || metadata.backgroundColor === 'var(--color-bg)') {
    //     wrapper.classList.add('dark-theme-card');
    // }

    if (metadata.coverImage) {
        wrapper.classList.add('has-cover-image');
        wrapper.classList.add('lazy-bg');
        wrapper.dataset.bg = metadata.coverImage;
        // Background image will be set by lazyloader
    }

    // Localization Logic
    const lang = getCurrentLang();
    const localizedDesc = metadata[`description_${lang}`];
    const description = localizedDesc || metadata.description || '';

    // Simplify tag: remove inline styles if any were added by other scripts, just pure class
    const categoryTag = metadata.category ? `<span class="category-tag">${metadata.category}</span>` : '';
    
    // Generate a placeholder icon if no cover image
    let mediaContent = '';
    if (!metadata.coverImage) {
        const initial = (metadata.title || '?').charAt(0).toUpperCase();
        mediaContent = `<div style="font-size: 4rem; font-weight: 800; color: #333; display: flex; align-items: center; justify-content: center; height: 100%; user-select: none;">${initial}</div>`;
    }

    wrapper.innerHTML = `
        <div class="item-header">
            <div class="item-title">${metadata.title || 'UNTITLED'}</div>
            ${categoryTag}
        </div>
        <div class="media-container">${mediaContent}</div>
        <div class="item-description">${description}</div>
    `;
    
    anchor.appendChild(wrapper);
    item.appendChild(anchor);
    this.innerContainer.appendChild(item);
    this.items.push(item);
  }

  setupCategoryMenu() {
    const menu = document.querySelector('.category-menu');
    if (!menu) return;
    
    menu.innerHTML = '<button class="category-button active" data-category="all" aria-pressed="true">All</button>';
    
    this.categories.forEach(category => {
      if (category === 'all') return;
      const button = document.createElement('button');
      button.className = 'category-button';
      button.dataset.category = category;
      button.textContent = category;
      menu.appendChild(button);
    });

    menu.addEventListener('click', e => {
      if (e.target.matches('.category-button')) {
        const category = e.target.dataset.category;
        this.filterByCategory(category);
        
        menu.querySelectorAll('.category-button').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        e.target.classList.add('active');
        e.target.setAttribute('aria-pressed', 'true');
      }
    });
  }

  filterByCategory(category) {
    this.items.forEach(item => {
      const itemCategory = item.dataset.category;
      // An item is visible if the filter is 'all', its category matches, or it has no category.
      const isVisible = category === 'all' || itemCategory === category || !itemCategory;
      item.classList.toggle('hidden', !isVisible);
      item.setAttribute('aria-hidden', !isVisible);
    });
    this.layout();
  }

  layout() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const containerWidth = this.innerContainer.clientWidth;
    const gutter = this.options.gutter * rem;
    const minWidth = parseFloat(this.options.minWidth) * rem;
    
    let numColumns = Math.floor((containerWidth + gutter) / (minWidth + gutter));
    numColumns = Math.max(1, numColumns);
    
    const columnWidth = (containerWidth - (numColumns - 1) * gutter) / numColumns;
    const columnHeights = Array(numColumns).fill(0);

    this.innerContainer.style.position = 'relative';

    this.items.forEach(item => {
      if (item.classList.contains('hidden')) return;

      const isDoubleWidth = item.classList.contains('grid-item-width-2') && numColumns > 1;
      const isDoubleHeight = item.classList.contains('grid-item-height-2');
      const itemSpanW = isDoubleWidth ? 2 : 1;
      const itemSpanH = isDoubleHeight ? 2 : 1;

      let targetColumn = 0;
      let yPos = 0;

      if (itemSpanW === 1) {
        let minHeight = Infinity;
        for (let i = 0; i < numColumns; i++) {
          if (columnHeights[i] < minHeight) {
            minHeight = columnHeights[i];
            targetColumn = i;
          }
        }
        yPos = minHeight;
      } else { // Wx2
        let minHeight = Infinity;
        for (let i = 0; i < numColumns - 1; i++) {
          const pairHeight = Math.max(columnHeights[i], columnHeights[i+1]);
          if (pairHeight < minHeight) {
            minHeight = pairHeight;
            targetColumn = i;
          }
        }
        yPos = minHeight;
      }
      
      const x = targetColumn * (columnWidth + gutter);

      item.style.position = 'absolute';
      item.style.left = `${x}px`;
      item.style.top = `${yPos}px`;
      
      const itemWidth = columnWidth * itemSpanW + gutter * (itemSpanW - 1);
      item.style.width = `${itemWidth}px`;

      const itemHeight = columnWidth * itemSpanH + gutter * (itemSpanH - 1);
      item.style.height = `${itemHeight}px`;

      const newHeight = yPos + itemHeight + gutter;
      
      if (itemSpanW === 1) {
        columnHeights[targetColumn] = newHeight;
      } else {
        columnHeights[targetColumn] = newHeight;
        columnHeights[targetColumn + 1] = newHeight;
      }
    });

    const containerHeight = Math.max(...columnHeights);
    this.innerContainer.style.height = `${containerHeight}px`;
  }
  
  imagesLoaded() {
    const promises = [];
    const images = this.innerContainer.querySelectorAll('img');
    images.forEach(img => {
        promises.push(new Promise(resolve => {
            if (img.complete) {
                resolve();
            } else {
                img.addEventListener('load', resolve);
                img.addEventListener('error', resolve);
            }
        }));
    });
    return Promise.all(promises);
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
