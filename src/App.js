// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import AttendanceRow from './AttendanceRow';
import jsPDF from 'jspdf';
import Auth from './Auth';
import EmailVerification from './EmailVerification';
import Navbar from './NavBar';
import DeleteAccount from './DeleteAccount';
import SoberSocial from './SoberSocial';
import { auth, logoutUser, getMeetingLogs, saveFormMeta, clearMeetingLogs, onAuthStateChanged } from './firebase';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import debounce from 'lodash.debounce';
import './index.css';
import './App.css';

function MeetingLogPage({
  user,
  name,
  setName,
  dateRange,
  setDateRange,
  rows,
  setRows,
  sheetRef,
  captureAndDownload,
  openEmailClient
}) {
  // per-field meta status for name and dateRange
  const [metaStatus, setMetaStatus] = useState({ name: '', dateRange: '' });

  const updateRow = (index, newData) => {
    const updated = [...rows];
    updated[index] = newData;
    setRows(updated);
  };

  const handleClearPage = async () => {
    const confirmed = window.confirm('Are you sure you want to clear the form? This will erase all inputs and stored logs.');
    if (!confirmed) return;

    // Reset UI state
    setName('');
    setDateRange('');
    setRows(
      Array(16)
        .fill()
        .map(() => ({
          date: '',
          time: '',
          meetingName: '',
          location: '',
          impact: '',
          signature: null
        }))
    );

    // Clear Firestore
    if (user?.uid) {
      const res = await clearMeetingLogs(user.uid);
      if (!res.success) {
        console.error('Clear logs error:', res.error);
        alert('Error clearing logs on server. Check console.');
      }
    }
  };

  // save helpers (meta)
  const doSaveMeta = async (field) => {
    if (!user?.uid) return;
    setMetaStatus((prev) => ({ ...prev, [field]: 'saving' }));
    try {
      // save both name and dateRange together (consistent meta document)
      await saveFormMeta(user.uid, { name, dateRange });
      setMetaStatus((prev) => ({ ...prev, [field]: 'saved' }));
      // clear saved indicator after a moment
      setTimeout(() => {
        setMetaStatus((prev) => ({ ...prev, [field]: '' }));
      }, 2000);
    } catch (err) {
      console.error('Meta save error:', err);
      setMetaStatus((prev) => ({ ...prev, [field]: 'error' }));
    }
  };

  // debounced wrapper so typing doesn't spam saves
  const debouncedSaveMeta = useCallback(
    debounce((field) => {
      doSaveMeta(field);
    }, 800),
    [user, name, dateRange]
  );

  const handleMetaChange = (field, setter) => (e) => {
    const value = e.target.value;
    setter(value);
    // show saving indicator for that field while debounced save will run
    setMetaStatus((prev) => ({ ...prev, [field]: 'saving' }));
    debouncedSaveMeta(field);
  };

  const renderMetaStatus = (field) => {
    if (metaStatus[field] === 'saved') return <span className="status-saved">✅</span>;
    if (metaStatus[field] === 'error') return <span className="status-error">❌</span>;
    if (metaStatus[field] === 'saving') return <span className="status-saving">💾</span>;
    return null;
  };

  return (
    <div>
      {/* Main Attendance Form */}
      <div ref={sheetRef} id="form-capture" className="form-capture-desktop">
        <div className="container">
          <h2>NORTHAMPTON COUNTY RECOVERY COURT SELF-HELP MEETING ATTENDANCE RECORD</h2>

          <div className="form-group">
            <label>Name</label>
            <div className="input-with-status">
              <input value={name} onChange={handleMetaChange('name', setName)} placeholder="Enter name" />
              <div className="field-status">{renderMetaStatus('name')}</div>
            </div>
          </div>

          <div className="form-group">
            <label>Date Range</label>
            <div className="input-with-status">
              <input value={dateRange} onChange={handleMetaChange('dateRange', setDateRange)} placeholder="09-10-2025 to 10-15-2025" />
              <div className="field-status">{renderMetaStatus('dateRange')}</div>
            </div>
          </div>

          <div className="form-group">
            <label>IMPORTANT</label>
            <p> 📍 Note: Your browser will ask for location permission. If you don't see a prompt, check your browser's address bar for a location icon.</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Meeting Name</th>
                <th>Location</th>
                <th>Chair Signature</th>
                <th>How the Meeting Affected Me</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <AttendanceRow key={i} index={i} rowData={row} updateRow={updateRow} user={user} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="button-bar">
          <button onClick={captureAndDownload} className="submit-button">
            📸 Save Attendance Sheet as Image
          </button>

          <button onClick={() => openEmailClient('officer@example.com')} className="submit-button">
            📧 Email My Officer
          </button>

          <button onClick={() => openEmailClient('second.officer@example.com')} className="submit-button">
            📧 Email Second Officer
          </button>

          <button onClick={handleClearPage} className="clear-page-button">
            🗑️ Clear Page
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [rows, setRows] = useState(
    Array(16)
      .fill()
      .map(() => ({
        date: '',
        time: '',
        meetingName: '',
        location: '',
        impact: '',
        signature: null
      }))
  );

  const sheetRef = useRef();

  // Auth listener & load Firestore data on login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser && currentUser.emailVerified) {
        try {
          const res = await getMeetingLogs(currentUser.uid);
          if (res.success) {
            const meta = res.meta || {};
            const fetchedRows = res.rows || [];
            // Normalize to exactly 16 rows
            const normalized = Array(16)
              .fill()
              .map((_, idx) => {
                const r = fetchedRows[idx] || {};
                return {
                  date: r.date || '',
                  time: r.time || '',
                  meetingName: r.meetingName || '',
                  location: r.location || '',
                  impact: r.impact || '',
                  signature: r.signature || null
                };
              });
            setRows(normalized);
            setName(meta.name || currentUser.displayName || '');
            setDateRange(meta.dateRange || '');
          } else {
            // no saved logs, fill defaults and set name if available
            setRows(
              Array(16)
                .fill()
                .map(() => ({
                  date: '',
                  time: '',
                  meetingName: '',
                  location: '',
                  impact: '',
                  signature: null
                }))
            );
            setName(currentUser.displayName || '');
          }
        } catch (err) {
          console.error('Error loading meeting logs:', err);
        }
      } else {
        // Not logged in or not verified; keep defaults
      }
    });

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch {}
    };
  }, []);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) setUser(null);
  };

  const handleAuthSuccess = (userObj) => {
    setUser(userObj);
  };

  const handleVerificationComplete = (verifiedUser) => {
    setUser(verifiedUser);
    // reload to ensure everything refreshes
    window.location.reload();
  };

  // capture & download (keeps desktop look during capture)
  const captureAndDownload = async () => {
    if (!sheetRef.current) return;

    const originalStyles = {
      width: sheetRef.current.style.width,
      transform: sheetRef.current.style.transform,
      position: sheetRef.current.style.position,
      left: sheetRef.current.style.left,
      background: sheetRef.current.style.background,
      height: sheetRef.current.style.height,
      overflow: sheetRef.current.style.overflow,
      top: sheetRef.current.style.top
    };

    const originalScrollPosition = window.scrollY;

    try {
      // Force desktop layout for capture
      sheetRef.current.style.width = '900px';
      sheetRef.current.style.transform = 'scale(1)';
      sheetRef.current.style.position = 'absolute';
      sheetRef.current.style.left = '-9999px';
      sheetRef.current.style.top = '0';
      sheetRef.current.style.background = 'white';
      sheetRef.current.style.height = 'auto';
      sheetRef.current.style.overflow = 'visible';

      sheetRef.current.classList.add('force-desktop-capture');

      // show location-display and hide location-textarea for export
      document.querySelectorAll('.location-display').forEach((el) => el.classList.remove('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach((el) => el.classList.add('hide-on-export'));

      // small delay for layout
      await new Promise((resolve) => setTimeout(resolve, 200));

      const contentHeight = sheetRef.current.scrollHeight;
      const contentWidth = 900;

      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        backgroundColor: 'white',
        scrollY: 0,
        scrollX: 0,
        y: 0,
        x: 0
      });

      // Restore hide/show classes
      document.querySelectorAll('.location-display').forEach((el) => el.classList.add('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach((el) => el.classList.remove('hide-on-export'));

      sheetRef.current.classList.remove('force-desktop-capture');

      // Restore original styles
      Object.keys(originalStyles).forEach((key) => {
        const value = originalStyles[key];
        if (value !== undefined && value !== '') {
          sheetRef.current.style[key] = value;
        } else {
          sheetRef.current.style.removeProperty(key);
        }
      });

      window.scrollTo(0, originalScrollPosition);

      const imgData = canvas.toDataURL('image/jpeg', 0.9);

      const pdfWidth = 210; // mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight > 297 ? pdfHeight : 297]
      });

      if (pdfHeight > 297) {
        // Single large image splat across pages (approx)
        const pageHeight = 297;
        const imgHeight = pdfHeight;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save('AttendanceSheet.pdf');
      alert('✅ PDF saved as "AttendanceSheet.pdf". Please attach it manually to your email before sending.');
    } catch (error) {
      console.error('Error capturing PDF:', error);
      // restore styles on error
      Object.keys(originalStyles).forEach((key) => {
        const value = originalStyles[key];
        if (value !== undefined && value !== '') {
          sheetRef.current.style[key] = value;
        } else {
          sheetRef.current.style.removeProperty(key);
        }
      });
      sheetRef.current.classList.remove('force-desktop-capture');
      window.scrollTo(0, originalScrollPosition);
      alert('Error creating PDF. Please try again.');
    }
  };

  // open email client helper
  const openEmailClient = (email = 'officer@example.com') => {
    const subject = 'AA Attendance Sheet Submission';
    const body = `Hi Officer,\n\nPlease find my attendance sheet attached as an image.\n\nName: ${name}\nDate Range: ${dateRange}\n\nBest,\n${name || 'Your Name'}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            border: '5px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            borderTopColor: 'white',
            animation: 'spin 1s linear infinite'
          }}
        />
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (user && !user.emailVerified) {
    return <EmailVerification onVerified={handleVerificationComplete} />;
  }

  return (
    <Router>
      <Navbar handleLogout={handleLogout} />
      <Routes>
        <Route
          path="/"
          element={
            <MeetingLogPage
              user={user}
              name={name}
              setName={setName}
              dateRange={dateRange}
              setDateRange={setDateRange}
              rows={rows}
              setRows={setRows}
              sheetRef={sheetRef}
              captureAndDownload={captureAndDownload}
              openEmailClient={openEmailClient}
            />
          }
        />
        <Route path="/sober" element={<SoberSocial />} />
        <Route path="/delete" element={<DeleteAccount />} />
      </Routes>
    </Router>
  );
}

export default App;
