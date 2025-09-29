// AttendanceRow.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import debounce from "lodash.debounce";
import CurrentAddressButton from "./CurrentAddressButton";
import SignaturePad from "./SignaturePad";
import SignatureCanvas from "react-signature-canvas";
import { saveMeetingLog } from "./firebase";
import "./App.css";

/* Helper: Trim transparent edges from canvas */
const trimCanvas = (canvas) => {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);

  let top = null,
    bottom = null,
    left = null,
    right = null;
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

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  trimmedCanvas.getContext("2d").putImageData(trimmedData, 0, 0);

  return trimmedCanvas;
};

function AttendanceRow({ index, rowData, updateRow, user }) {
  const [isSigning, setIsSigning] = useState(false);
  const [savedSignature, setSavedSignature] = useState(rowData.signature || null);
  const [fieldStatus, setFieldStatus] = useState({}); // track per-field status
  const fullScreenSigRef = useRef(null);

  // debounce ref
  const debouncedSaveRef = useRef();
  const doSave = useCallback(async (row, field) => {
    setFieldStatus((prev) => ({ ...prev, [field]: "saving" }));
    try {
      const payload = {
        date: row.date || "",
        time: row.time || "",
        meetingName: row.meetingName || "",
        location: row.location || "",
        impact: row.impact || "",
        signature: row.signature || null,
      };
  
      const res = await saveMeetingLog(user.uid, `row-${index}`, payload);
      if (res.success) {
        setFieldStatus((prev) => ({ ...prev, [field]: "saved" }));
        setTimeout(
          () => setFieldStatus((prev) => ({ ...prev, [field]: "" })),
          2000
        );
      } else {
        console.error("Save row error:", res.error);
        setFieldStatus((prev) => ({ ...prev, [field]: "error" }));
      }
    } catch (err) {
      console.error("Unexpected save error:", err);
      setFieldStatus((prev) => ({ ...prev, [field]: "error" }));
    }
  }, [user?.uid, index]);
  

  useEffect(() => {
    // rebuild debounced save when user or row index changes
    debouncedSaveRef.current = debounce((nextRow, field) => {
      doSave(nextRow, field);
    }, 1000);

    return () => {
      if (debouncedSaveRef.current) debouncedSaveRef.current.cancel();
    };
  }, [user?.uid, index, doSave]);

  useEffect(() => {
    setSavedSignature(rowData.signature || null);
  }, [rowData.signature]);

  /* ---------------- Saving Helpers ---------------- */

  

  const handleChange = (field, value) => {
    const next = { ...rowData, [field]: value };
    updateRow(index, next);
    if (debouncedSaveRef.current) {
      debouncedSaveRef.current(next, field);
    }
  };

  const handleImmediateSave = (field, value) => {
    const next = { ...rowData, [field]: value };
    updateRow(index, next);
    doSave(next, field);
  };

  /* ---------------- Signature ---------------- */

  const saveSignatureFromFullScreen = () => {
    try {
      if (fullScreenSigRef.current && !fullScreenSigRef.current.isEmpty()) {
        const rawCanvas = fullScreenSigRef.current.getCanvas();
        const trimmed = trimCanvas(rawCanvas) || rawCanvas;
        const dataURL = trimmed.toDataURL("image/png");
        const signaturePayload = {
          dataURL,
          width: trimmed.width,
          height: trimmed.height,
        };

        setSavedSignature(signaturePayload);
        handleImmediateSave("signature", signaturePayload);
      }
    } catch (err) {
      console.error("Signature save error:", err);
    } finally {
      setIsSigning(false);
    }
  };

  const clearSignature = () => {
    setSavedSignature(null);
    handleImmediateSave("signature", null);
    try {
      if (fullScreenSigRef.current) fullScreenSigRef.current.clear();
    } catch {}
  };

  /* ---------------- JSX ---------------- */

  const renderStatus = (field) => {
    if (fieldStatus[field] === "saved")
      return <span className="status-saved">✅</span>;
    if (fieldStatus[field] === "error")
      return <span className="status-error">❌</span>;
    if (fieldStatus[field] === "saving")
      return <span className="status-saving">💾</span>;
    return null;
  };

  return (
    <>
      <tr>
        {/* Date */}
        <td>
          <div className="input-with-status">
            <input
              className="date-input"
              placeholder="Enter Date"
              value={rowData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              maxLength={10}
            />
            <div className="field-status">{renderStatus("date")}</div>
          </div>
        </td>

        {/* Time */}
        <td>
          <div className="input-with-status">
            <input
              className="time-input"
              placeholder="Enter Time"
              value={rowData.time}
              onChange={(e) => handleChange("time", e.target.value)}
              maxLength={10}
            />
            <div className="field-status">{renderStatus("time")}</div>
          </div>
        </td>

        {/* Meeting Name */}
        <td>
          <div className="input-with-status">
            <textarea
              className="meeting-input"
              placeholder="Name Of Meeting"
              value={rowData.meetingName}
              onChange={(e) => handleChange("meetingName", e.target.value)}
              maxLength={120}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              style={{
                minHeight: "40px",
                resize: "none",
                overflow: "hidden",
                width: "100%",
              }}
            />
            <div className="field-status">{renderStatus("meetingName")}</div>
          </div>
        </td>

        {/* Location */}
        <td className="location-cell">
          <CurrentAddressButton
            onAddressFetched={(addr) => handleImmediateSave("location", addr)}
            onClearAddress={() => handleImmediateSave("location", "")}
          />

          <div
            className="location-display hide-on-export"
            style={{ marginTop: 8 }}
          >
            {rowData.location}
          </div>

          <div className="input-with-status">
            <textarea
              className="location-textarea"
              value={rowData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              maxLength={200}
              placeholder="📍 Your current address"
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
            />
            <div className="field-status">{renderStatus("location")}</div>
          </div>
        </td>

        {/* Signature */}
        <td className="signature-cell">
          <div className="signature-wrapper">
            <SignaturePad
              index={index}
              onActivate={() => setIsSigning(true)}
              savedSignature={savedSignature}
              onClearSignature={clearSignature}
            />
            <div className="signature-status" aria-hidden>
              {renderStatus("signature")}
            </div>
          </div>
        </td>

        {/* Impact */}
        <td>
          <div className="input-with-status">
            <textarea
              className="impact-textarea"
              value={rowData.impact}
              onChange={(e) => handleChange("impact", e.target.value)}
              maxLength={300}
              placeholder="How the meeting affected me"
              style={{ minHeight: "100px" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
            />
            <div className="field-status">{renderStatus("impact")}</div>
          </div>
        </td>
      </tr>

      {/* Fullscreen Signature Overlay */}
      {isSigning && (
        <div className="signature-overlay" role="dialog" aria-modal="true">
          <div className="signature-frame">
            <SignatureCanvas
              ref={fullScreenSigRef}
              penColor="black"
              canvasProps={{ className: "signature-canvas-full" }}
            />
          </div>

          <div className="signature-action-buttons">
            <button
              onClick={() => {
                try {
                  if (fullScreenSigRef.current) fullScreenSigRef.current.clear();
                } catch {}
              }}
              className="signature-clear-button"
            >
              Clear
            </button>
            <button
              onClick={saveSignatureFromFullScreen}
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
