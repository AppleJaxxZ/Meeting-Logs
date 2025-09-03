import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './SignaturePad.css'

function SignaturePad() {
  const sigRef = useRef();
  const [isLocked, setIsLocked] = useState(false);

  const clear = () => {
    if (!isLocked) {
        sigRef.current.clear(); // if its not locked then clear the pad.
    }
    
  };
  const lock = () => {
    setIsLocked(true);
    sigRef.current.off(); //disables drawing
  }

  const unlock = () => {
    setIsLocked(false);
    sigRef.current.on(); //enables drawing
  }
  return (
    <div className="signature-wrapper">
      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        canvasProps={{ className: 'signature-canvas' }}
      />
      <button onClick={clear} disabled={isLocked}>Clear</button>
      {isLocked ? (<button onClick={unlock}>Clear</button>) :( <button onClick={lock}>Lock</button>)}
      
    </div>
  );
}

export default SignaturePad;