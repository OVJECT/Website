export class KeyboardNavigation {
  constructor() {
    this.gridItems = [];
    this.currentIndex = -1;
    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    // Use a MutationObserver to update the list of items when the grid is filtered
    const observer = new MutationObserver(() => this.updateGridItems());
    const gridInner = document.querySelector('.grid-inner');
    if (gridInner) {
      observer.observe(gridInner, { childList: true });
    }
    this.updateGridItems();
  }

  updateGridItems() {
    this.gridItems = Array.from(document.querySelectorAll('.grid-item'));
    // Sort items by their visual position (top, then left)
    this.gridItems.sort((a, b) => {
      const topA = parseFloat(a.style.top);
      const topB = parseFloat(b.style.top);
      if (topA !== topB) {
        return topA - topB;
      }
      const leftA = parseFloat(a.style.left);
      const leftB = parseFloat(b.style.left);
      return leftA - leftB;
    });
    this.currentIndex = -1;
    this.removeFocus();
  }

  handleKeyDown(e) {
    if (document.body.classList.contains('detail-view-active')) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      if (this.gridItems.length === 0) return;

      if (this.currentIndex === -1) {
        this.currentIndex = 0;
      } else {
        switch (e.key) {
          case 'ArrowDown':
            this.moveFocus(1);
            break;
          case 'ArrowUp':
            this.moveFocus(-1);
            break;
          case 'ArrowRight':
            this.moveFocus(1);
            break;
          case 'ArrowLeft':
            this.moveFocus(-1);
            break;
        }
      }
      this.setFocus();
    }

    if (e.key === 'Enter' && this.currentIndex !== -1) {
      e.preventDefault();
      this.gridItems[this.currentIndex].querySelector('.interactive-wrapper').click();
    }
  }

  moveFocus(direction) {
    this.currentIndex = (this.currentIndex + direction + this.gridItems.length) % this.gridItems.length;
  }

  setFocus() {
    this.removeFocus();
    const item = this.gridItems[this.currentIndex];
    if (item) {
      const wrapper = item.querySelector('.interactive-wrapper');
      wrapper.style.boxShadow = '0 0 0 3px var(--primary-color)';
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  removeFocus() {
    this.gridItems.forEach(item => {
      const wrapper = item.querySelector('.interactive-wrapper');
      if (wrapper) {
        wrapper.style.boxShadow = '';
      }
    });
  }
}
