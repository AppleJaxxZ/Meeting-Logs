// SignaturePad.js
import React from 'react';
import './App.css';

/**
 * SignaturePad (preview + controls)
 * - savedSignature: { dataURL, width, height } | null
 * - onActivate(): open fullscreen signing (provided by parent)
 * - onClearSignature(): clear saved signature (optional)
 */

function SignaturePad({ index, onActivate, savedSignature, onClearSignature }) {
  return (
    <div className="signature-preview-wrapper">
      {savedSignature ? (
        <>
          <div className="signature-preview">
            <img src={savedSignature.dataURL} alt={`signature-${index}`} />
          </div>

          <div className="signature-actions">
            <button onClick={onActivate} className="signature-btn signature-add-btn">✍️ Change</button>
            <button onClick={() => onClearSignature && onClearSignature()} className="signature-btn signature-clear-preview">🧹 Clear</button>
          </div>
        </>
      ) : (
        <>
          <div className="signature-preview">
            <span style={{ color: '#666' }}>No signature</span>
          </div>

          <div className="signature-actions">
            <button onClick={onActivate} className="signature-btn signature-add-btn">✍️ Add</button>
          </div>
        </>
      )}
    </div>
  );
}

export default SignaturePad;
