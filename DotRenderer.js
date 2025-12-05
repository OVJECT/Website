export class DotRenderer {
  constructor(canvasSelector, containerSelector) {
    this.canvas = document.querySelector(canvasSelector);
    this.container = document.querySelector(containerSelector);
    if (!this.canvas || !this.container) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.image = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetX = 0;
    this.targetY = 0;
    
    // Settings
    this.dotSize = 8; // Base dot size
    this.color = '#333'; // Dot color
    
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    this.loop();
  }

  async loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = src;
      img.onload = () => {
        this.image = img;
        this.draw();
        resolve();
      };
      img.onerror = reject;
    });
  }

  resize() {
    if (!this.container) return;
    this.canvas.width = this.container.offsetWidth;
    this.canvas.height = this.container.offsetHeight;
    if (this.image) this.draw();
  }

  handleMouseMove(e) {
    // Calculate normalized mouse position (-1 to 1)
    this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  draw() {
    if (!this.image) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // 1. Create temp canvas for image processing
    // We scale down the image to match the number of dots
    // This acts as a pixelation step
    const scale = 0.15; // Adjust this for dot density
    const bufferDots = 10; // Number of extra dot rows/cols to render outside bounds
    
    // Add buffer to dimensions
    const scaledW = Math.ceil(width * scale) + bufferDots * 2;
    const scaledH = Math.ceil(height * scale) + bufferDots * 2;
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = scaledW;
    tempCanvas.height = scaledH;

    // 2. Draw Image with 'cover' fit (Robust Formula)
    // Note: We are drawing into a larger (buffered) canvas, so the image covers the buffer too
    const scaleFactor = Math.max(scaledW / this.image.width, scaledH / this.image.height);
    const drawW = this.image.width * scaleFactor;
    const drawH = this.image.height * scaleFactor;
    const offsetX = (scaledW - drawW) / 2;
    const offsetY = (scaledH - drawH) / 2;

    tempCtx.drawImage(this.image, offsetX, offsetY, drawW, drawH);
    
    // 3. Read Pixel Data
    const imageData = tempCtx.getImageData(0, 0, scaledW, scaledH).data;
    
    // 4. Draw Dots on Main Canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = this.color;

    // Calculate step size based on the ORIGINAL (unbuffered) dimensions
    // This ensures dot size/density remains consistent with screen size
    const originalScaledW = scaledW - bufferDots * 2;
    const originalScaledH = scaledH - bufferDots * 2;
    const stepX = width / originalScaledW;
    const stepY = height / originalScaledH;

    for (let y = 0; y < scaledH; y++) {
        for (let x = 0; x < scaledW; x++) {
            const i = (y * scaledW + x) * 4;
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            
            const brightness = (r + g + b) / 3;

            // Draw dots for almost all pixels (threshold 0)
            if (brightness > 0) {
                // Center of the dot in screen coordinates
                // Subtract bufferDots to align (0,0) of the image with (0,0) of the screen
                // effectively placing buffer dots off-screen initially
                const screenX = (x - bufferDots) * stepX + stepX / 2;
                const screenY = (y - bufferDots) * stepY + stepY / 2;

                // Dot radius based on brightness (subtly increased)
                const adjustedBrightness = Math.min(255, brightness * 1.1); // Increase brightness by 10%
                const radius = (adjustedBrightness / 255) * (Math.min(stepX, stepY) / 2) * 0.9;

                // Depth/Parallax Effect
                // Brighter pixels move more (closer)
                const depthFactor = brightness / 255;
                const parallaxX = this.targetX * 30 * depthFactor; // 30 px range
                const parallaxY = this.targetY * 30 * depthFactor; // 30 px range

                ctx.beginPath();
                ctx.arc(screenX + parallaxX, screenY + parallaxY, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
  }

  loop() {
    // Smooth interpolation for mouse movement
    this.targetX += (this.mouseX - this.targetX) * 0.05;
    this.targetY += (this.mouseY - this.targetY) * 0.05;
    
    // Only redraw if needed to save battery/perf
    if (Math.abs(this.mouseX - this.targetX) > 0.001 || Math.abs(this.mouseY - this.targetY) > 0.001) {
        this.draw();
    }
    
    requestAnimationFrame(this.loop.bind(this));
  }
}