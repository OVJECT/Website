const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export class KeyboardNavigation {
  constructor() {
    this.currentItem = null;
    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    // Drop the highlight when the set of cards changes.
    const gridInner = document.querySelector('.grid-inner');
    if (gridInner) {
      const observer = new MutationObserver(() => this.clearFocus());
      observer.observe(gridInner, { childList: true });
    }
  }

  // Visible cards in visual order (top, then left). Filtered-out cards are skipped.
  getVisibleItems() {
    return Array.from(document.querySelectorAll('.grid-item:not(.hidden-item)')).sort((a, b) => {
      const topA = parseFloat(a.style.top) || 0;
      const topB = parseFloat(b.style.top) || 0;
      if (topA !== topB) return topA - topB;
      return (parseFloat(a.style.left) || 0) - (parseFloat(b.style.left) || 0);
    });
  }

  handleKeyDown(e) {
    // Leave the keys alone while a modal is open or the user is typing (e.g. the search box).
    if (document.body.classList.contains('modal-open') || document.body.classList.contains('detail-view-active')) return;
    if (e.target && e.target.closest && e.target.closest(EDITABLE_SELECTOR)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    if (ARROW_KEYS.includes(e.key)) {
      const items = this.getVisibleItems();
      if (items.length === 0) return;
      e.preventDefault();

      let index = items.indexOf(this.currentItem);
      if (index === -1) {
        index = 0;
      } else {
        const direction = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
        index = (index + direction + items.length) % items.length;
      }
      this.setFocus(items[index]);
      return;
    }

    if (e.key === 'Enter' && this.currentItem && !this.currentItem.classList.contains('hidden-item')) {
      e.preventDefault();
      const wrapper = this.currentItem.querySelector('.interactive-wrapper');
      if (wrapper) wrapper.click();
    }
  }

  setFocus(item) {
    this.clearFocus();
    this.currentItem = item;
    const wrapper = item.querySelector('.interactive-wrapper');
    if (wrapper) wrapper.style.boxShadow = '0 0 0 3px var(--color-active)';
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  clearFocus() {
    document.querySelectorAll('.grid-item .interactive-wrapper').forEach(wrapper => {
      wrapper.style.boxShadow = '';
    });
    this.currentItem = null;
  }
}
