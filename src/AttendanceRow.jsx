// AttendanceRow.jsx
import React, { useState, useRef, useEffect } from 'react';
import CurrentAddressButton from './CurrentAddressButton';
import SignaturePad from './SignaturePad';
import SignatureCanvas from 'react-signature-canvas';
import { saveMeetingLog } from './firebase';
import './App.css';

/* Helper: Trim transparent edges from canvas */
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

function AttendanceRow({ index, rowData, updateRow, user }) {
  const [isSigning, setIsSigning] = useState(false);
  const [savedSignature, setSavedSignature] = useState(rowData.signature || null);
  const [status, setStatus] = useState(''); // '', 'saving', 'saved', 'error'
  const fullScreenSigRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    // keep the preview in sync when rowData updates (from Firestore load)
    setSavedSignature(rowData.signature || null);
  }, [rowData.signature]);

  // Debounced local update + save trigger for editable fields
  const handleChange = (field, value) => {
    const next = { ...rowData, [field]: value };
    updateRow(index, next);
    triggerSave(next, true);
  };

  // Immediate save for signature & location
  const handleImmediateSave = (nextRow) => {
    updateRow(index, nextRow);
    triggerSave(nextRow, false);
  };

  const triggerSave = (nextRow, debounced = false) => {
    if (!user?.uid) {
      // not signed in — skip remote save
      return;
    }

    if (debounced) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        doSave(nextRow);
      }, 1000); // 1 second debounce
    } else {
      // immediate
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      doSave(nextRow);
    }
  };

  const doSave = async (row) => {
    setStatus('saving');
    try {
      const payload = {
        date: row.date || '',
        time: row.time || '',
        meetingName: row.meetingName || '',
        location: row.location || '',
        impact: row.impact || '',
        signature: row.signature || null
      };
      const res = await saveMeetingLog(user.uid, `row-${index}`, payload);
      if (res.success) {
        setStatus('saved');
        // keep green check visible briefly
        setTimeout(() => setStatus(''), 2000);
      } else {
        console.error('Save row error:', res.error);
        setStatus('error');
      }
    } catch (err) {
      console.error('Unexpected save error:', err);
      setStatus('error');
    }
  };

  /* ---------------- Signature: Fullscreen flow --------------- */
  const saveSignatureFromFullScreen = () => {
    // if canvas has strokes, capture + trim -> save immediately
    try {
      if (fullScreenSigRef.current && !fullScreenSigRef.current.isEmpty()) {
        const rawCanvas = fullScreenSigRef.current.getCanvas();
        const trimmed = trimCanvas(rawCanvas) || rawCanvas;
        const dataURL = trimmed.toDataURL('image/png');
        const signaturePayload = { dataURL, width: trimmed.width, height: trimmed.height };

        // update local preview & persist immediately
        setSavedSignature(signaturePayload);
        handleImmediateSave({ ...rowData, signature: signaturePayload });
      }
    } catch (err) {
      console.error('Signature save error:', err);
    } finally {
      setIsSigning(false);
    }
  };

  const clearSignature = () => {
    setSavedSignature(null);
    handleImmediateSave({ ...rowData, signature: null });
    try {
      if (fullScreenSigRef.current) fullScreenSigRef.current.clear();
    } catch (e) {}
  };

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
            maxLength={120}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            style={{ minHeight: '40px', resize: 'none', overflow: 'hidden', width: '100%' }}
          />
        </td>

        <td className="location-cell">
          <CurrentAddressButton
            onAddressFetched={(addr) => handleImmediateSave({ ...rowData, location: addr })}
            onClearAddress={() => handleImmediateSave({ ...rowData, location: '' })}
          />

          <div className="location-display hide-on-export" style={{ marginTop: 8 }}>
            {rowData.location}
          </div>

          <textarea
            className="location-textarea"
            value={rowData.location}
            onChange={e => handleChange('location', e.target.value)}
            maxLength={200}
            placeholder="📍 Your current address"
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </td>

        {/* ---------- Signature cell (preview + small status) ---------- */}
        <td className="signature-cell">
          <div className="signature-wrapper">
            <SignaturePad
              index={index}
              onActivate={() => setIsSigning(true)}
              savedSignature={savedSignature}
              onClearSignature={clearSignature}
            />

            <div className="signature-status" aria-hidden>
              {status === 'saving' && <span>💾 Saving…</span>}
              {status === 'saved' && <span className="status-saved">✅</span>}
              {status === 'error' && <span className="status-error">❌</span>}
            </div>
          </div>
        </td>

        <td>
          <textarea
            className="impact-textarea"
            value={rowData.impact}
            onChange={e => handleChange('impact', e.target.value)}
            maxLength={300}
            placeholder="How the meeting affected me"
            style={{ minHeight: '100px' }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
          />
        </td>
      </tr>

      {/* Fullscreen signature canvas overlay */}
      {isSigning && (
        <div className="signature-overlay" role="dialog" aria-modal="true">
          <div className="signature-frame">
            <SignatureCanvas
              ref={fullScreenSigRef}
              penColor="black"
              canvasProps={{ className: 'signature-canvas-full' }}
            />
          </div>

          <div className="signature-action-buttons">
            <button
              onClick={() => {
                try { if (fullScreenSigRef.current) fullScreenSigRef.current.clear(); } catch {}
              }}
              className="signature-clear-button"
            >
              Clear
            </button>
            <button onClick={saveSignatureFromFullScreen} className="signature-done-button-large">
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AttendanceRow;
