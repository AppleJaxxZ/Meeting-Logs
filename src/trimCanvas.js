// Utility: Trim transparent edges from canvas
const trimCanvas = (canvas) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
  
    let top = null, bottom = null, left = null, right = null;
  
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = imageData.data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          top ??= y;
          bottom = y;
          left = left === null ? x : Math.min(left, x);
          right = right === null ? x : Math.max(right, x);
        }
      }
    }
  
    if (top === null) return null;
  
    const trimmedWidth = right - left + 1;
    const trimmedHeight = bottom - top + 1;
    const trimmedData = ctx.getImageData(left, top, trimmedWidth, trimmedHeight);
  
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    trimmedCanvas.getContext('2d').putImageData(trimmedData, 0, 0);
  
    return trimmedCanvas;
  };
  export default trimCanvas;