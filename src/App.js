import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import AttendanceRow from './AttendanceRow';
import jsPDF from 'jspdf';
import Auth from './Auth';
import Navbar from './NavBar';
import { auth, logoutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';
import './index.css';

function MeetingLogPage({ user, name, setName, dateRange, setDateRange, rows, setRows, sheetRef, captureAndDownload, openEmailClient, handleLogout }) {
  const updateRow = (index, newData) => {
    const updated = [...rows];
    updated[index] = newData;
    setRows(updated);
  };

  return (
    <div>
      

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

function SoberSocial() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Under Construction</h2>
    </div>
  );
}

function DeleteAccount() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");

  const handleDelete = async () => {
    try {
      await auth.currentUser.delete();
      setStatus("✅ Account successfully deleted.");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setStatus("Error deleting account: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Delete My Account</h2>
      <p>This will permanently remove your account.</p>
      <button onClick={handleDelete} className="submit-button">Delete Account</button>
      {status && <p>{status}</p>}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const sheetRef = useRef();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser && currentUser.displayName && !name) {
        setName(currentUser.displayName);
      }
    });
    return () => unsubscribe();
  }, [name]);

  useEffect(() => {
    localStorage.setItem('attendanceName', name);
  }, [name]);
  
  useEffect(() => {
    localStorage.setItem('attendanceDateRange', dateRange);
  }, [dateRange]);

  useEffect(() => {
    localStorage.setItem('attendanceRows', JSON.stringify(rows));
  }, [rows]);

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      setUser(null);
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
    const originalStyles = {
      width: sheetRef.current.style.width,
      transform: sheetRef.current.style.transform,
      position: sheetRef.current.style.position,
      left: sheetRef.current.style.left,
      background: sheetRef.current.style.background
    };

    try {
      sheetRef.current.style.width = '900px';
      sheetRef.current.style.transform = 'scale(1)';
      sheetRef.current.style.position = 'absolute';
      sheetRef.current.style.left = '-9999px';
      sheetRef.current.style.background = 'white';
      sheetRef.current.classList.add('force-desktop-capture');
      document.querySelectorAll('.location-display').forEach(el => el.classList.remove('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach(el => el.classList.add('hide-on-export'));
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 900,
        width: 900,
        backgroundColor: 'white'
      });
      document.querySelectorAll('.location-display').forEach(el => el.classList.add('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach(el => el.classList.remove('hide-on-export'));
      sheetRef.current.classList.remove('force-desktop-capture');
      Object.keys(originalStyles).forEach(key => {
        sheetRef.current.style[key] = originalStyles[key];
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdfWidth = 210;
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
      Object.keys(originalStyles).forEach(key => {
        sheetRef.current.style[key] = originalStyles[key];
      });
      sheetRef.current.classList.remove('force-desktop-capture');
      alert('Error creating PDF. Please try again.');
    }
  };

  const openEmailClient = () => {
    const subject = 'AA Attendance Sheet Submission';
    const body = `Hi Officer,\n\nPlease find my attendance sheet attached as an image.\n\nName: ${name}\nDate Range: ${dateRange}\n\n (If not attached yet, please attach the file named "AttendanceSheet.pdf" before sending.)\n\nBest,\n${name || 'Your Name'}`;
    window.location.href = `mailto:officer@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Router>
      <Navbar handleLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<MeetingLogPage user={user} name={name} setName={setName} dateRange={dateRange} setDateRange={setDateRange} rows={rows} setRows={setRows} sheetRef={sheetRef} captureAndDownload={captureAndDownload} openEmailClient={openEmailClient} handleLogout={handleLogout} />} />
        <Route path="/sober" element={<SoberSocial />} />
        <Route path="/delete" element={<DeleteAccount />} />
      </Routes>
    </Router>
  );
}

    
export default App;
