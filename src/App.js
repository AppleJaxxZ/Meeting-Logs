// App.js
import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import AttendanceRow from './AttendanceRow';
import jsPDF from 'jspdf';
import Auth from './Auth';
import EmailVerification from './EmailVerification';
import Navbar from './NavBar';
import DeleteAccount from './DeleteAccount';
import SoberSocial from './SoberSocial';
import {
  auth,
  logoutUser,
  getMeetingLogs,
  saveFormMeta,
  clearMeetingLogs,
  onAuthStateChanged
} from './firebase';
import debounce from 'lodash.debounce';

import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';
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
  openEmailClient,
  metaStatus
}) {
  const handleClearPage = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the form? This will erase all inputs and stored logs.'
    );
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

  const renderStatus = (field) => {
    if (metaStatus[field] === 'saved')
      return <span className="status-saved">✅</span>;
    if (metaStatus[field] === 'error')
      return <span className="status-error">❌</span>;
    if (metaStatus[field] === 'saving')
      return <span className="status-saving">💾</span>;
    return null;
  };

  return (
    <div>
      {/* Main Attendance Form */}
      <div ref={sheetRef} id="form-capture" className="form-capture-desktop">
        <div className="container">
          <h2>
            NORTHAMPTON COUNTY RECOVERY COURT SELF-HELP MEETING ATTENDANCE RECORD
          </h2>

          <div className="form-group">
            <label>Name</label>
            <div className="input-with-status">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
              />
              <div className="field-status">{renderStatus('name')}</div>
            </div>
          </div>
          <div className="form-group">
            <label>Date Range</label>
            <div className="input-with-status">
              <input
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                placeholder="09-10-2025 to 10-15-2025"
              />
              <div className="field-status">{renderStatus('dateRange')}</div>
            </div>
          </div>
          <div className="form-group">
            <label>IMPORTANT</label>
            <p>
              📍 Note: Your browser will ask for location permission. If you don't
              see a prompt, check your browser's address bar for a location icon.
            </p>
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
                <AttendanceRow
                  key={i}
                  index={i}
                  rowData={row}
                  updateRow={(index, newData) => {
                    const updated = [...rows];
                    updated[index] = newData;
                    setRows(updated);
                  }}
                  user={user}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="button-bar">
          <button onClick={captureAndDownload} className="submit-button">
            📸 Save Attendance Sheet as Image
          </button>

          <button
            onClick={() => openEmailClient('officer@example.com')}
            className="submit-button"
          >
            📧 Email F.O Cynthia 
          </button>

          <button
            onClick={() => openEmailClient('second.officer@example.com')}
            className="submit-button"
          >
            📧 Email F.O Matt
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

  const [metaStatus, setMetaStatus] = useState({}); // track name/dateRange status
  const sheetRef = useRef();
  const debouncedSaveRef = useRef();

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

            const normalized = Array(16)
              .fill()
              .map((_, idx) => {
                return (
                  fetchedRows[idx] || {
                    date: '',
                    time: '',
                    meetingName: '',
                    location: '',
                    impact: '',
                    signature: null
                  }
                );
              });

            setRows(normalized);
            setName(meta.name || currentUser.displayName || '');
            setDateRange(meta.dateRange || '');
          } else {
            setName(currentUser.displayName || '');
          }
        } catch (err) {
          console.error('Error loading meeting logs:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Build debounced save function
  useEffect(() => {
    if (!user?.uid) return;

    debouncedSaveRef.current = debounce(async (field, value) => {
      setMetaStatus((prev) => ({ ...prev, [field]: 'saving' }));
      try {
        const res = await saveFormMeta(user.uid, {
          name,
          dateRange
        });
        if (res.success) {
          setMetaStatus((prev) => ({ ...prev, [field]: 'saved' }));
          setTimeout(
            () => setMetaStatus((prev) => ({ ...prev, [field]: '' })),
            2000
          );
        } else {
          setMetaStatus((prev) => ({ ...prev, [field]: 'error' }));
        }
      } catch (err) {
        console.error('Meta save error:', err);
        setMetaStatus((prev) => ({ ...prev, [field]: 'error' }));
      }
    }, 800);

    return () => {
      if (debouncedSaveRef.current) debouncedSaveRef.current.cancel();
    };
  }, [user?.uid, name, dateRange]);

  // Trigger debounced save when name or dateRange changes
  useEffect(() => {
    if (!user?.uid) return;
    if (debouncedSaveRef.current) {
      if (name) debouncedSaveRef.current('name', name);
      if (dateRange) debouncedSaveRef.current('dateRange', dateRange);
    }
  }, [name, dateRange, user?.uid]);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) setUser(null);
  };

  const handleAuthSuccess = (user) => {
    setUser(user);
  };

  const handleVerificationComplete = (verifiedUser) => {
    setUser(verifiedUser);
    window.location.reload();
  };

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
      sheetRef.current.style.width = '900px';
      sheetRef.current.style.transform = 'scale(1)';
      sheetRef.current.style.position = 'absolute';
      sheetRef.current.style.left = '-9999px';
      sheetRef.current.style.top = '0';
      sheetRef.current.style.background = 'white';
      sheetRef.current.style.height = 'auto';
      sheetRef.current.style.overflow = 'visible';

      sheetRef.current.classList.add('force-desktop-capture');

      document
        .querySelectorAll('.location-display')
        .forEach((el) => el.classList.remove('hide-on-export'));
      document
        .querySelectorAll('.location-textarea')
        .forEach((el) => el.classList.add('hide-on-export'));

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

      document
        .querySelectorAll('.location-display')
        .forEach((el) => el.classList.add('hide-on-export'));
      document
        .querySelectorAll('.location-textarea')
        .forEach((el) => el.classList.remove('hide-on-export'));

      sheetRef.current.classList.remove('force-desktop-capture');

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
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight > 297 ? pdfHeight : 297]
      });

      if (pdfHeight > 297) {
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
      alert(
        '✅ PDF saved as "AttendanceSheet.pdf". Please attach it manually to your email before sending.'
      );
    } catch (error) {
      console.error('Error capturing PDF:', error);
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

  const openEmailClient = (email = 'officer@example.com') => {
    const subject = 'AA Attendance Sheet Submission';
    const body = `Hi Officer,\n\nPlease find my attendance sheet attached as an image.\n\nName: ${name}\nDate Range: ${dateRange}\n\nBest,\n${
      name || 'Your Name'
    }`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
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
        ></div>
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
              metaStatus={metaStatus}
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
