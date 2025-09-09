import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './SignaturePad.css';

function SignaturePad() {
  const sigRef = useRef();
  const [isLocked, setIsLocked] = useState(false);

  const clear = () => {
    if (!isLocked && sigRef.current) {
      sigRef.current.clear();
    }
  };

  const lock = () => {
    if (sigRef.current) {
      sigRef.current.off(); // disables drawing
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
        canvasProps={{ className: 'signature-canvas' }}
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