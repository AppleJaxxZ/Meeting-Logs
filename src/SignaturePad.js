import React, { useRef, useState, useLayoutEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './SignaturePad.css';

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

  // Restore saved signature with DPR scaling
  useLayoutEffect(() => {
    if (!savedSignature || !sigRef.current) return;

    const { dataURL, width = 300, height = 150 } = savedSignature;
    const canvas = sigRef.current.getCanvas();
    const context = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width / dpr}px`;
    canvas.style.height = `${height / dpr}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    sigRef.current.fromDataURL(dataURL);
  }, [savedSignature]);

  const clearSignature = () => {
    if (!isLocked && sigRef.current) {
      sigRef.current.clear();
      localStorage.removeItem(`signature-${index}`);
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
