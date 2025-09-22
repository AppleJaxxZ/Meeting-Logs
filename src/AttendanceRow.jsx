import React, { useState, useRef, useEffect } from 'react';
import SignaturePad from './SignaturePad';
import CurrentAddressButton from './CurrentAddressButton';
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

function AttendanceRow({ index, rowData, updateRow }) {
  const [isSigning, setIsSigning] = useState(false);
  const [savedSignature, setSavedSignature] = useState(null);
  const sigRef = useRef();
  const fullScreenSigRef = useRef();

  const handleActivateSignature = () => {
    setIsSigning(true);
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
            className="date-input"
            placeholder="Enter Date"
            value={rowData.date}
            onChange={e => handleChange('date', e.target.value)}
            maxLength={10}
          />
        </td>
        <td>
          <input
            className="time-input"
            placeholder="Enter Time"
            value={rowData.time}
            onChange={e => handleChange('time', e.target.value)}
            maxLength={10}
          />
        </td>
        <td>
  <textarea
    className="meeting-input"
    placeholder="Name Of Meeting"
    value={rowData.meetingName}
    onChange={e => handleChange('meetingName', e.target.value)}
    maxLength={22}
    onInput={e => {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    }}
    style={{
      minHeight: '40px',
      resize: 'none',
      overflow: 'hidden',
      width: '100%',
      fontSize: '1rem',
      padding: '10px 12px',
      boxSizing: 'border-box',
    }}
  />
</td>
<td className="location-cell">
  <CurrentAddressButton
    onAddressFetched={handleAddressUpdate}
    onClearAddress={handleAddressClear}
  />
 {/* Display-only version for snapshot */}
<div className="location-display hide-on-export">
  {rowData.location}
</div>

{/* Editable textarea for user input */}
<textarea
  className="location-textarea"
  value={rowData.location}
  onChange={e => handleChange('location', e.target.value)}
  maxLength={100}
  placeholder="📍 Your current address"
  onInput={e => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }}

   
  />
</td>
        <td>
          <SignaturePad
            index={index}
            onActivate={handleActivateSignature}
            savedSignature={savedSignature}
          />
        </td>
        <td>
          <textarea
            className="impact-textarea"
            value={rowData.impact}
            onChange={e => handleChange('impact', e.target.value)}
            maxLength={30}
            placeholder="How the meeting affected me"
            style={{minHeight: '100px'}}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </td>
      </tr>

      {isSigning && (
  <div className="signature-overlay">
    <div className="signature-frame">
      <SignatureCanvas
        ref={fullScreenSigRef}
        penColor="black"
        canvasProps={{ 
          className: 'signature-canvas-full',
          style: { 
            width: '100%', 
            height: '100%',
            touchAction: 'none'
          }
        }}
      />
    </div>
    <div className="signature-action-buttons">
      <button
        onClick={() => fullScreenSigRef.current.clear()}
        className="signature-clear-button"
      >
        Clear
      </button>
      <button
        onClick={() => {
          saveSignature();
          setIsSigning(false);
        }}
        className="signature-done-button-large"
      >
        Done
      </button>
    </div>
  </div>
)}

    </>
  );
}

export default AttendanceRow;
