import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function TestPad() {
  const sigRef = useRef();

  const handleSave = () => {
    const canvas = sigRef.current.getTrimmedCanvas();
    console.log('Trimmed canvas:', canvas);
  };

  return (
    <div>
      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        canvasProps={{ width: 300, height: 150, style: { backgroundColor: 'white' } }}
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
