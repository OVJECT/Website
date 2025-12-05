export class InteractiveElement {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      maxTilt: 15,
      perspective: 1000,
      scale: 0.98,
      ease: 0.1,
      scrollThreshold: 5,
      touchDelay: 100,
      ...options
    };

    this.wrapper = this.element.querySelector('.interactive-wrapper');
    if (!this.wrapper) {
      console.warn('InteractiveElement: interactive-wrapper not found for', this.element);
      return;
    }
    
    this.state = this.initState();
    
    // Bind methods once for consistent listener removal
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleOrientation = this.handleOrientation.bind(this);
    this.animate = this.animate.bind(this);

    this.bindEvents();
  }

  initState() {
    return {
      rotateX: 0,
      rotateY: 0,
      targetRotateX: 0,
      targetRotateY: 0,
      scale: 1,
      targetScale: 1,
      touchStartX: 0,
      touchStartY: 0,
      lastTouchX: 0,
      lastTouchY: 0,
      touchStartTime: 0,
      isScrolling: false,
      scrollDirection: null,
      touchMoveCount: 0,
      animationFrameId: null,
      lastMouseX: 0,
      lastMouseY: 0,
      mousePosBuffer: [],
      bufferSize: 5,
      lastTiltUpdateTime: 0,
      mouseMoveStopTimeout: null
    };
  }

  bindEvents() {
    const passive = { passive: true };
    
    // Attach listeners to the stable parent element to avoid hover loops
    this.element.addEventListener('mousemove', this.handleMouseMove, passive);
    this.element.addEventListener('mouseenter', this.handleMouseEnter, passive);
    this.element.addEventListener('mouseleave', this.handleMouseLeave, passive);
    this.element.addEventListener('mousedown', this.handleMouseDown, passive);
    this.element.addEventListener('mouseup', this.handleMouseUp, passive);
    this.element.addEventListener('click', this.handleClick);
    this.element.addEventListener('touchstart', this.handleTouchStart, passive);
    this.element.addEventListener('touchmove', this.handleTouchMove, passive);
    this.element.addEventListener('touchend', this.handleTouchEnd, passive);

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this.handleOrientation, passive);
    }
  }

  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  animate(currentTime) {
    if (this.state.isScrolling) {
      this.state.animationFrameId = null;
      return;
    }

    if (!this.lastTime) this.lastTime = currentTime;
    this.lastTime = currentTime;

    const ease = this.options.ease;

    this.state.rotateX = this.lerp(this.state.rotateX, this.state.targetRotateX, ease);
    this.state.rotateY = this.lerp(this.state.rotateY, this.state.targetRotateY, ease);
    this.state.scale = this.lerp(this.state.scale, this.state.targetScale, ease);

    const shouldContinue = 
      Math.abs(this.state.rotateX - this.state.targetRotateX) > 0.5 ||
      Math.abs(this.state.rotateY - this.state.targetRotateY) > 0.5 ||
      Math.abs(this.state.scale - this.state.targetScale) > 0.001;

    const timeSinceLastTiltUpdate = currentTime - this.state.lastTiltUpdateTime;
    const isTiltStable = Math.abs(this.state.rotateX - this.state.targetRotateX) <= 0.1 &&
                         Math.abs(this.state.rotateY - this.state.targetRotateY) <= 0.1;

    if (shouldContinue && !(timeSinceLastTiltUpdate > 200 && isTiltStable)) {
      this.updateTransform();
      this.state.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.state.rotateX = this.state.targetRotateX;
      this.state.rotateY = this.state.targetRotateY;
      this.state.scale = this.state.targetScale;
      this.updateTransform();
      this.state.animationFrameId = null;
      this.lastTime = null;
    }
  }
  
  startAnimation() {
    if (!this.state.animationFrameId) {
      this.lastTime = null;
      this.state.animationFrameId = requestAnimationFrame(this.animate);
    }
  }

  updateTransform() {
    if (this.state.isScrolling) return;
    
    this.wrapper.style.transform = `
      perspective(${this.options.perspective}px)
      rotateX(${this.state.rotateX}deg)
      rotateY(${this.state.rotateY}deg)
      scale(${this.state.scale})
      translateZ(0)
    `;
  }

  updateTilt(clientX, clientY) {
    if (this.state.isScrolling) return;
    
    const rect = this.element.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((clientY - rect.top) / rect.height) * 2 - 1;

    let targetX = -y * this.options.maxTilt;
    let targetY = x * this.options.maxTilt;

    const snapToZeroThreshold = 0.5;
    if (Math.abs(targetX) < snapToZeroThreshold) targetX = 0;
    if (Math.abs(targetY) < snapToZeroThreshold) targetY = 0;

    this.state.targetRotateX = targetX;
    this.state.targetRotateY = targetY;
    this.state.targetScale = this.options.scale;
  }

  resetTilt() {
    Object.assign(this.state, {
      targetRotateX: 0,
      targetRotateY: 0,
      targetScale: 1
    });
  }

  handleMouseMove(e) {
    if (this.state.isScrolling) return;

    this.state.mousePosBuffer.push({ x: e.clientX, y: e.clientY });
    if (this.state.mousePosBuffer.length > this.state.bufferSize) {
      this.state.mousePosBuffer.shift();
    }

    let avgX = 0;
    let avgY = 0;
    for (const pos of this.state.mousePosBuffer) {
      avgX += pos.x;
      avgY += pos.y;
    }
    avgX /= this.state.mousePosBuffer.length;
    avgY /= this.state.mousePosBuffer.length;

    const deltaX = Math.abs(avgX - this.state.lastMouseX);
    const deltaY = Math.abs(avgY - this.state.lastMouseY);
    const moveThreshold = 2;

    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      this.updateTilt(avgX, avgY);
      this.startAnimation();
      this.state.lastMouseX = avgX;
      this.state.lastMouseY = avgY;
      this.state.lastTiltUpdateTime = Date.now();
    }

    if (this.state.mouseMoveStopTimeout) {
      clearTimeout(this.state.mouseMoveStopTimeout);
    }
    this.state.mouseMoveStopTimeout = setTimeout(() => {
      this.state.animationFrameId = null;
    }, 50);
  }

  handleMouseEnter(e) {
    if (!this.state.isScrolling) {
      this.updateTilt(e.clientX, e.clientY);
      this.startAnimation();
    }
  }

  handleMouseLeave() {
    this.resetTilt();
    this.startAnimation();
    this.state.mousePosBuffer = [];
    if (this.state.mouseMoveStopTimeout) {
      clearTimeout(this.state.mouseMoveStopTimeout);
      this.state.mouseMoveStopTimeout = null;
    }
  }

  handleMouseDown(e) {
    if (!this.state.isScrolling) {
      this.isPressed = true;
      this.updateTilt(e.clientX, e.clientY);
      this.startAnimation();
    }
  }

  handleMouseUp() {
    this.isPressed = false;
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    
    Object.assign(this.state, {
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      lastTouchX: touch.clientX,
      lastTouchY: touch.clientY,
      touchStartTime: Date.now(),
      touchMoveCount: 0,
      scrollDirection: null,
      isScrolling: false
    });
    
    this.isPressed = true;
    
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }
    
    this.touchTimeout = setTimeout(() => {
      if (!this.state.isScrolling) {
        this.updateTilt(touch.clientX, touch.clientY);
        this.startAnimation();
      }
    }, this.options.touchDelay);
  }

  handleTouchMove(e) {
    const touch = e.touches[0];
    this.state.touchMoveCount++;
    
    const deltaX = Math.abs(touch.clientX - this.state.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.state.touchStartY);
    
    if (!this.state.scrollDirection && this.state.touchMoveCount > 2) {
      if (deltaY > deltaX && deltaY > this.options.scrollThreshold) {
        this.state.scrollDirection = 'vertical';
        this.state.isScrolling = true;
        this.isPressed = false;
        this.resetTilt();
        this.startAnimation();
      } else if (deltaX > deltaY && deltaX > this.options.scrollThreshold) {
        this.state.scrollDirection = 'horizontal';
      }
    }
    
    if (!this.state.isScrolling && this.state.scrollDirection !== 'vertical') {
      this.updateTilt(touch.clientX, touch.clientY);
      this.startAnimation();
    }
    
    this.state.lastTouchX = touch.clientX;
    this.state.lastTouchY = touch.clientY;
  }

  handleTouchEnd() {
    this.isPressed = false;
    
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
      this.touchTimeout = null;
    }
    
    setTimeout(() => {
      this.state.isScrolling = false;
      this.state.scrollDirection = null;
      this.resetTilt();
      this.startAnimation();
    }, this.options.touchDelay);
  }

  handleOrientation(e) {
    if (!e.gamma || !e.beta || this.isPressed || this.state.isScrolling) return;

    const gamma = Math.min(Math.max(e.gamma, -10), 10);
    const beta = Math.min(Math.max(e.beta, -10), 10);

    this.state.targetRotateX = beta;
    this.state.targetRotateY = gamma;
    this.startAnimation();
  }

  handleClick() {
    const itemId = this.element.dataset.id;
    if (itemId) {
      window.location.hash = itemId;
    }
  }

  destroy() {
    const events = [
      ['mousemove', this.handleMouseMove],
      ['mouseenter', this.handleMouseEnter],
      ['mouseleave', this.handleMouseLeave],
      ['mousedown', this.handleMouseDown],
      ['mouseup', this.handleMouseUp],
      ['click', this.handleClick],
      ['touchstart', this.handleTouchStart],
      ['touchmove', this.handleTouchMove],
      ['touchend', this.handleTouchEnd]
    ];

    events.forEach(([event, handler]) => {
      this.element.removeEventListener(event, handler);
    });

    if (window.DeviceOrientationEvent) {
      window.removeEventListener('deviceorientation', this.handleOrientation);
    }

    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }
    
    if (this.state.animationFrameId) {
        cancelAnimationFrame(this.state.animationFrameId);
    }
  }
}

export const initInteractiveElements = () => {
  document.querySelectorAll('.grid-item').forEach(card => {
    new InteractiveElement(card, {
        touchMoveTolerance: 10,
        maxTilt: 10,
        perspective: 2500,
        scale: 0.97,
        ease: 0.1,
        scrollThreshold: 5,
        touchDelay: 100
      });
  });
};
