import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './SignaturePad.css';

function SignaturePad({index, onActivate}) {
  const sigRef = useRef();
  const [isLocked, setIsLocked] = useState(false);

  const saveSignature = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const canvas = sigRef.current.getCanvas();
      const dataURL = canvas.toDataURL('image/png');
      const width = canvas.width;
      const height = canvas.height;
  
      const payload = JSON.stringify({ dataURL, width, height });
      localStorage.setItem(`signature-${index}`, payload);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`signature-${index}`);
    if (saved && sigRef.current) {
      try {
        const parsed = JSON.parse(saved);
        const { dataURL } = parsed;
        sigRef.current.fromDataURL(dataURL);
      } catch (err) {
        // Fallback: if it's a raw dataURL, use it directly
        if (saved.startsWith('data:image')) {
          sigRef.current.fromDataURL(saved);
        } else {
          console.error('Invalid signature data:', err);
        }
      }
    }
  }, [index]);

  const clear = () => {
    if (!isLocked && sigRef.current) {
      sigRef.current.clear();
    }
  };

  const lock = () => {
    if (sigRef.current) {
      saveSignature(); // Save before locking
      sigRef.current.off();
      setIsLocked(true);
    }
  };

  const unlock = () => {
    if (sigRef.current) {
      sigRef.current.on(); // enables drawing
      setIsLocked(false);
    }
  };

  return (
    <div className="signature-wrapper">
    
      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        onBegin={onActivate}
        canvasProps={{ className: 'signature-canvas', style: { backgroundColor: 'white' } }}
    />
      
      <button onClick={clear} disabled={isLocked}>Clear</button>
      {isLocked ? (
        <button onClick={unlock}>Unlock</button>
      ) : (
        <button onClick={lock}>Lock</button>
      )}
    </div>
  );
}

export default SignaturePad;