export class ImageProtection {
  static init() {
    document.addEventListener('contextmenu', e => {
      if (e.target.classList.contains('protect')) {
        e.preventDefault();
      }
    });
  }
}

export class ScrollNavbar {
  constructor() {
    this.lastScrollTop = 0;
    this.delta = 5;
    this.navbar = document.querySelector('header .Logo');
    if (!this.navbar) return;

    this.navbarHeight = this.navbar.offsetHeight;
    
    window.addEventListener('scroll', this.handleScroll.bind(this), false);
  }

  handleScroll() {
    const st = window.pageYOffset || document.documentElement.scrollTop;

    if (Math.abs(this.lastScrollTop - st) <= this.delta) return;

    if (st > this.lastScrollTop && st > this.navbarHeight) {
      // Scroll Down
      this.navbar.classList.add('hidden');
    } else {
      // Scroll Up
      if (st + window.innerHeight < document.documentElement.scrollHeight) {
        this.navbar.classList.remove('hidden');
      }
    }

    this.lastScrollTop = st;
  }
}
