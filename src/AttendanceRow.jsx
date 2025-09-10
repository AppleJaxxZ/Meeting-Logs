import React, { useState, useRef, useEffect } from 'react';
import SignaturePad from './SignaturePad';
import CurrentAddressButton from './CurrentAddressButton';
import SignatureCanvas from 'react-signature-canvas';

function AttendanceRow({ index, rowData, updateRow }) {
  const [isSigning, setIsSigning] = useState(false);
  const sigRef = useRef();

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
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataURL = sigRef.current.getCanvas().toDataURL('image/png');
      localStorage.setItem(`signature-${index}`, dataURL);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`signature-${index}`);
    if (saved && sigRef.current) {
      sigRef.current.fromDataURL(saved);
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
          <div onClick={() => setIsSigning(true)}>
            <SignaturePad index={index} />
          </div>
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
            ref={sigRef}
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
