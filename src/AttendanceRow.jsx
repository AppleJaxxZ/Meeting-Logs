import React, { useState, useRef, useEffect } from 'react';
import SignaturePad from './SignaturePad';
import CurrentAddressButton from './CurrentAddressButton';
import SignatureCanvas from 'react-signature-canvas';


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

function AttendanceRow({ index, rowData, updateRow }) {
  const [isSigning, setIsSigning] = useState(false);

  const [savedSignature, setSavedSignature] = useState(null);
  const sigRef = useRef();
  const fullScreenSigRef = useRef();


const handleActivateSignature = () => {
  setIsSigning(true); // Let SignaturePad handle locking internally
};



  const handleChange = (field, value) => {
    updateRow(index, { ...rowData, [field]: value });
  };

  const handleAddressUpdate = (address) => {
    handleChange('location', address);
  };

  const handleAddressClear = () => {
    handleChange('location', '');
  };


  const saveSignature = () => {
    if (fullScreenSigRef.current && !fullScreenSigRef.current.isEmpty()) {
      console.log('fullScreenSigRef.current:', fullScreenSigRef.current); // 👈 Add this line
      console.log('Available methods:', Object.keys(fullScreenSigRef.current));
      const rawCanvas = fullScreenSigRef.current.getCanvas();
      const canvas = trimCanvas(rawCanvas);
            const dataURL = canvas.toDataURL('image/png');
      const width = canvas.width;
      const height = canvas.height;
  
      const payload = JSON.stringify({ dataURL, width, height });
      localStorage.setItem(`signature-${index}`, payload);
      setSavedSignature({ dataURL, width, height });
    }
  };
  
  

useEffect(() => {
  if (savedSignature && sigRef.current) {
    sigRef.current.fromDataURL(savedSignature);
  }
}, [savedSignature]);

useEffect(() => {
  const saved = localStorage.getItem(`signature-${index}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setSavedSignature(parsed);
    } catch (err) {
      console.error('Invalid signature data:', err);
    }
  }
}, [index]);

  return (
    <>
      <tr>
        <td>
          <input
            placeholder="Enter Date"
            value={rowData.date}
            onChange={e => handleChange('date', e.target.value)}
          />
        </td>
        <td>
          <input
            placeholder="Enter Time"
            value={rowData.time}
            onChange={e => handleChange('time', e.target.value)}
          />
        </td>
        <td>
          <input
            placeholder="Name Of Meeting"
            value={rowData.meetingName}
            onChange={e => handleChange('meetingName', e.target.value)}
          />
        </td>
        <td>
          <CurrentAddressButton
            onAddressFetched={handleAddressUpdate}
            onClearAddress={handleAddressClear}
          />
          <input
            value={rowData.location}
            onChange={e => handleChange('location', e.target.value)}
          />
        </td>
        <td>
          
        <SignaturePad index={index} onActivate={handleActivateSignature} savedSignature={savedSignature} />

</td>

        
        <td>
          <textarea
            rows={5}
            cols={50}
            value={rowData.impact}
            onChange={e => handleChange('impact', e.target.value)}
          />
        </td>
      </tr>

      {isSigning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'white',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <SignatureCanvas
            ref={fullScreenSigRef}
            penColor="black"
            canvasProps={{
              width: window.innerWidth,
              height: window.innerHeight * 0.8,
              style: { backgroundColor: 'white' }
            }}
          />
          
          <button
            onClick={() => {
              saveSignature();
              setIsSigning(false);
            }}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              fontSize: '1.2rem',
              backgroundColor: '#333',
              color: 'white',
              borderRadius: '8px'
            }}
          >
            Done
          </button>
        </div>
      )}
    </>
  );
}

export default AttendanceRow;
