import React, { useRef, useState, useLayoutEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './App.css';

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

function SignaturePad({ index, onActivate, savedSignature }) {
  const sigRef = useRef();
  const [isLocked, setIsLocked] = useState(false);

  // Save trimmed signature to localStorage
  const saveSignature = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;

    const rawCanvas = sigRef.current.getCanvas();
    const trimmedCanvas = trimCanvas(rawCanvas);
    if (!trimmedCanvas) return;

    const dataURL = trimmedCanvas.toDataURL('image/png');
    const { width, height } = trimmedCanvas;
    const payload = JSON.stringify({ dataURL, width, height });

    localStorage.setItem(`signature-${index}`, payload);
  };

  // Restore saved signature with proper scaling for small box
  useLayoutEffect(() => {
    if (!savedSignature || !sigRef.current) return;

    const { dataURL, width: origWidth, height: origHeight } = savedSignature;
    const canvas = sigRef.current.getCanvas();
    const context = canvas.getContext('2d');
    
    // Get the display dimensions (CSS pixels)
    const displayWidth = 240;  // max-width from CSS
    const displayHeight = 80;   // height from CSS
    
    // Set canvas internal dimensions to match display size * DPR for clarity
    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Scale context to match DPR
    context.scale(dpr, dpr);
    
    // Clear the canvas
    context.clearRect(0, 0, displayWidth, displayHeight);
    
    // Load and draw the signature
    const img = new Image();
    img.onload = () => {
      // Calculate scaling to fit signature in display area with padding
      const padding = 10;
      const availableWidth = displayWidth - (padding * 2);
      const availableHeight = displayHeight - (padding * 2);
      
      const scaleX = availableWidth / origWidth;
      const scaleY = availableHeight / origHeight;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = origWidth * scale;
      const scaledHeight = origHeight * scale;
      
      // Center the signature
      const x = (displayWidth - scaledWidth) / 2;
      const y = (displayHeight - scaledHeight) / 2;
      
      // Draw the scaled signature
      context.drawImage(img, x, y, scaledWidth, scaledHeight);
    };
    img.src = dataURL;
  }, [savedSignature]);

  const clearSignature = () => {
    if (!isLocked && sigRef.current) {
      sigRef.current.clear();
      localStorage.removeItem(`signature-${index}`);
      
      // Reset canvas dimensions
      const canvas = sigRef.current.getCanvas();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 240 * dpr;
      canvas.height = 80 * dpr;
      canvas.getContext('2d').scale(dpr, dpr);
    }
  };

  const lockSignature = () => {
    saveSignature();
    sigRef.current?.off();
    setIsLocked(true);
  };

  const unlockSignature = () => {
    sigRef.current?.on();
    setIsLocked(false);
  };

  return (
    <div className="signature-wrapper">
      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        onBegin={() => {
          if (!isLocked && typeof onActivate === 'function') {
            onActivate();
          }
        }}
        canvasProps={{
          className: 'signature-canvas',
          style: { backgroundColor: 'white' }
        }}
      />

      <div className="signature-controls">
        <button onClick={clearSignature} disabled={isLocked}>Clear</button>
        {isLocked ? (
          <button onClick={unlockSignature}>Unlock</button>
        ) : (
          <button onClick={lockSignature}>Lock</button>
        )}
      </div>
    </div>
  );
}

export default SignaturePad;