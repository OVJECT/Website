export class TiltEffect {
  constructor(selector) {
    this.items = document.querySelectorAll(selector);
    this.init();
  }

  init() {
    this.items.forEach(item => {
      const wrapper = item.querySelector('.interactive-wrapper');
      if (!wrapper) return;

      item.addEventListener('mousemove', (e) => this.handleMouseMove(e, item, wrapper));
      item.addEventListener('mouseleave', () => this.handleMouseLeave(wrapper));
      item.addEventListener('mouseenter', () => this.handleMouseEnter(wrapper));
    });
  }

  handleMouseEnter(wrapper) {
    wrapper.style.transition = 'none';
  }

  handleMouseMove(e, item, wrapper) {
    const rect = item.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -15; // Increased tilt
    const rotateY = ((x - centerX) / centerX) * 15;

    wrapper.style.transform = `
      perspective(1000px) 
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg) 
      scale3d(1.02, 1.02, 1.02)
    `;
  }

  handleMouseLeave(wrapper) {
    wrapper.style.transition = 'transform 0.5s ease-out';
    wrapper.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
  }
}
