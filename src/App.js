import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import AttendanceRow from './AttendanceRow';
import jsPDF from 'jspdf';
import Auth from './Auth';
import { auth, logoutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set --vh custom property to match actual viewport height
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  window.addEventListener('resize', setViewportHeight);
  setViewportHeight();

  const [name, setName] = useState(() => localStorage.getItem('attendanceName') || '');
  const [dateRange, setDateRange] = useState(() => localStorage.getItem('attendanceDateRange') || '');

  const [rows, setRows] = useState(() => {
    const saved = localStorage.getItem('attendanceRows');
    return saved ? JSON.parse(saved) : Array(16).fill().map(() => ({
      date: '',
      time: '',
      meetingName: '',
      location: '',
      impact: ''
    }));
  });

  const sheetRef = useRef(); // Ref for capturing the sheet

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // If user is logged in and has a display name, set it as the default name
      if (currentUser && currentUser.displayName && !name) {
        setName(currentUser.displayName);
      }
    });

    return () => unsubscribe();
  }, [name]); // Added name as dependency

  useEffect(() => {
    localStorage.setItem('attendanceName', name);
  }, [name]);
  
  useEffect(() => {
    localStorage.setItem('attendanceDateRange', dateRange);
  }, [dateRange]);

  useEffect(() => {
    localStorage.setItem('attendanceRows', JSON.stringify(rows));
  }, [rows]);

  const updateRow = (index, newData) => {
    const updated = [...rows];
    updated[index] = newData;
    setRows(updated);
  };

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      setUser(null);
      // Optionally clear local storage on logout
      // localStorage.clear();
    }
  };

  const handleAuthSuccess = (user) => {
    setUser(user);
    if (user.displayName) {
      setName(user.displayName);
    }
  };

  const captureAndDownload = async () => {
    if (!sheetRef.current) return;

    // Store original styles
    const originalStyles = {
      width: sheetRef.current.style.width,
      transform: sheetRef.current.style.transform,
      position: sheetRef.current.style.position,
      left: sheetRef.current.style.left,
      background: sheetRef.current.style.background
    };

    try {
      // Force desktop layout for capture
      sheetRef.current.style.width = '900px';
      sheetRef.current.style.transform = 'scale(1)';
      sheetRef.current.style.position = 'absolute';
      sheetRef.current.style.left = '-9999px';
      sheetRef.current.style.background = 'white';
      
      // Add a class to force desktop table layout
      sheetRef.current.classList.add('force-desktop-capture');
      
      // Hide textareas and show display divs for location
      document.querySelectorAll('.location-display').forEach(el => el.classList.remove('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach(el => el.classList.add('hide-on-export'));

      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture with higher quality settings
      const canvas = await html2canvas(sheetRef.current, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        windowWidth: 900,
        width: 900,
        backgroundColor: 'white'
      });

      // Restore visibility
      document.querySelectorAll('.location-display').forEach(el => el.classList.add('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach(el => el.classList.remove('hide-on-export'));
      
      // Remove the desktop force class
      sheetRef.current.classList.remove('force-desktop-capture');
      
      // Restore original styles
      Object.keys(originalStyles).forEach(key => {
        sheetRef.current.style[key] = originalStyles[key];
      });

      // Convert to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.8);

      // Calculate PDF dimensions to maintain aspect ratio
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('AttendanceSheet.pdf');
      alert('✅ PDF saved as "AttendanceSheet.pdf". Please attach it manually to your email before sending.');
      
    } catch (error) {
      console.error('Error capturing PDF:', error);
      // Restore original styles in case of error
      Object.keys(originalStyles).forEach(key => {
        sheetRef.current.style[key] = originalStyles[key];
      });
      sheetRef.current.classList.remove('force-desktop-capture');
      alert('Error creating PDF. Please try again.');
    }
  };

  const openEmailClient = () => {
    const subject = 'AA Attendance Sheet Submission';
    const body = `Hi Officer,\n\nPlease find my attendance sheet attached as an image.\n\nName: ${name}\nDate Range: ${dateRange}\n\n 
    (If not attached yet, please attach the file named "AttendanceSheet.pdf" before sending.)\n\nBest,\n${name || 'Your Name'}`;
    window.location.href = `mailto:officer@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '5px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          borderTopColor: 'white',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  // Show login/signup screen if not authenticated
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Show the attendance form if authenticated
  return (
    <div>
      {/* User Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '15px 20px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div>
          <span style={{ fontSize: '1rem', fontWeight: '600' }}>
            Welcome, {user.displayName || user.email}
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Main Attendance Form */}
      <div ref={sheetRef} id="form-capture" className="form-capture-desktop">
        <div className="container">
          <h2>NORTHAMPTON COUNTY RECOVERY COURT SELF-HELP MEETING ATTENDANCE RECORD</h2>

          <div className="form-group">
            <label>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
          </div>
          <div className="form-group">
            <label>Date Range</label>
            <input value={dateRange} onChange={e => setDateRange(e.target.value)} placeholder="09-10-2025 to 10-15-2025" />
          </div>
          <div className="form-group">
            <label>IMPORTANT</label>
            <p> 📍 Note: Your browser will ask for location permission. If you don't see a prompt, check your browser's address bar for a location icon.
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
                <AttendanceRow key={i} index={i} rowData={row} updateRow={updateRow} />
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button onClick={captureAndDownload} className="submit-button">
            📸 Save Attendance Sheet as Image
          </button>
          <button onClick={openEmailClient} className="submit-button">
            📧 Email My Officer
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;