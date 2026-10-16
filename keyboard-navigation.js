const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// Arrow keys move a highlight through the visible cards; Enter opens the highlighted one.
export class KeyboardNavigation {
  constructor() {
    this.currentItem = null;
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  // Cards in reading order, skipping the ones a filter has hidden.
  getVisibleItems() {
    return Array.from(document.querySelectorAll('.grid-item:not([hidden])'));
  }

  handleKeyDown(e) {
    // Leave the keys alone while a modal is open or the user is typing (e.g. the search box).
    if (document.body.classList.contains('modal-open')) return;
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

    if (e.key === 'Enter' && this.currentItem && !this.currentItem.hidden) {
      e.preventDefault();
      const link = this.currentItem.querySelector('.grid-item-link');
      if (link) link.click();
    }
  }

  setFocus(item) {
    this.clearFocus();
    this.currentItem = item;
    item.classList.add('kb-focus');
    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  clearFocus() {
    document.querySelectorAll('.grid-item.kb-focus').forEach(item => item.classList.remove('kb-focus'));
    this.currentItem = null;
  }
}
