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
  const [signatureImage, setSignatureImage] = useState(null);

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
    setSignatureImage(dataURL);
  };

  // Restore saved signature with proper scaling
  useLayoutEffect(() => {
    if (!savedSignature || !sigRef.current) return;

    const { dataURL, width: origWidth, height: origHeight } = savedSignature;
    setSignatureImage(dataURL);
    
    const canvas = sigRef.current.getCanvas();
    const context = canvas.getContext('2d');
    
    // Clear the canvas first
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create image and draw it scaled to fit
    const img = new Image();
    img.onload = () => {
      // Get the actual canvas dimensions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate scaling to fit signature in canvas with padding
      const padding = 10;
      const availableWidth = canvasWidth - (padding * 2);
      const availableHeight = canvasHeight - (padding * 2);
      
      const scaleX = availableWidth / origWidth;
      const scaleY = availableHeight / origHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down if needed
      
      const scaledWidth = origWidth * scale;
      const scaledHeight = origHeight * scale;
      
      // Center the signature
      const x = (canvasWidth - scaledWidth) / 2;
      const y = (canvasHeight - scaledHeight) / 2;
      
      // Draw the scaled signature
      context.drawImage(img, x, y, scaledWidth, scaledHeight);
    };
    img.src = dataURL;
  }, [savedSignature]);

  const clearSignature = () => {
    if (!isLocked && sigRef.current) {
      sigRef.current.clear();
      localStorage.removeItem(`signature-${index}`);
      setSignatureImage(null);
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
      <div style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
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
            style: { 
              backgroundColor: 'white',
              display: signatureImage && isLocked ? 'none' : 'block'
            }
          }}
        />
        
        {/* Display the signature as an image when locked */}
        {signatureImage && isLocked && (
          <div 
            style={{
              width: '100%',
              maxWidth: '240px',
              height: '80px',
              border: '1px solid #aaa',
              borderRadius: '8px',
              backgroundColor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px',
              boxSizing: 'border-box'
            }}
          >
            <img 
              src={signatureImage} 
              alt="Signature"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          </div>
        )}
      </div>

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