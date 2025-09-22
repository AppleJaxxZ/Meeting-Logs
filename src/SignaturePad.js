import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
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
  const [forceRedraw, setForceRedraw] = useState(0);

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

  // Function to draw signature on canvas
  const drawSignatureOnCanvas = () => {
    if (!savedSignature || !sigRef.current) return;

    try {
      const { dataURL, width: origWidth, height: origHeight } = savedSignature;
      const canvas = sigRef.current.getCanvas();
      
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      
      // Wait for next frame to ensure canvas is ready
      requestAnimationFrame(() => {
        // Get the actual display dimensions
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width || 240;
        const displayHeight = rect.height || 80;
        
        // Set canvas internal dimensions to match display size * DPR for clarity
        const dpr = window.devicePixelRatio || 1;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // Ensure canvas style dimensions match
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
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
      });
    } catch (error) {
      console.error('Error drawing signature:', error);
    }
  };

  // Initial load of saved signature
  useLayoutEffect(() => {
    drawSignatureOnCanvas();
  }, [savedSignature, forceRedraw]);

  // Handle orientation changes and window resizing
  useEffect(() => {
    let resizeTimeout;
    
    const handleOrientationChange = () => {
      // Clear any existing timeout
      clearTimeout(resizeTimeout);
      
      // Set a new timeout to redraw after orientation change settles
      resizeTimeout = setTimeout(() => {
        setForceRedraw(prev => prev + 1); // Force a redraw
        drawSignatureOnCanvas();
      }, 300); // Increased delay to ensure DOM has updated
    };

    // Listen for various orientation change events
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen for visibility change (when app comes back to foreground)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          drawSignatureOnCanvas();
        }, 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [savedSignature]);

  const clearSignature = () => {
    if (!isLocked && sigRef.current) {
      sigRef.current.clear();
      localStorage.removeItem(`signature-${index}`);
      
      // Reset canvas dimensions using actual display size
      const canvas = sigRef.current.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width || 240;
      const displayHeight = rect.height || 80;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
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
    // Redraw signature when unlocking
    setTimeout(() => {
      drawSignatureOnCanvas();
    }, 50);
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

export default SignaturePad