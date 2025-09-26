import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import AttendanceRow from './AttendanceRow';
import jsPDF from 'jspdf';
import Auth from './Auth';
import EmailVerification from './EmailVerification';
import Navbar from './NavBar';
import DeleteAccount from './DeleteAccount';
import SoberSocial from './SoberSocial';
import { auth, logoutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate
} from 'react-router-dom';
import './index.css';

function MeetingLogPage({ name, setName, dateRange, setDateRange, rows, setRows, sheetRef, captureAndDownload, openEmailClient }) {
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
      // Only set name if email is verified
      if (currentUser && currentUser.emailVerified && currentUser.displayName && !name) {
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
    // Don't set name yet if email not verified
    if (user.displayName && user.emailVerified) {
      setName(user.displayName);
    }
  };

  const handleVerificationComplete = (verifiedUser) => {
    setUser(verifiedUser);
    if (verifiedUser.displayName) {
      setName(verifiedUser.displayName);
    }
    // Force re-render to show main app
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
      overflow: sheetRef.current.style.overflow
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
      
      // Add a class to force desktop table layout
      sheetRef.current.classList.add('force-desktop-capture');
      
      // Hide textareas and show display divs for location
      document.querySelectorAll('.location-display').forEach(el => el.classList.remove('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach(el => el.classList.add('hide-on-export'));

      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get the actual height of the content
      const contentHeight = sheetRef.current.scrollHeight;
      const contentWidth = 900;

      // Capture with higher quality settings and full height
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

      // Restore visibility
      document.querySelectorAll('.location-display').forEach(el => el.classList.add('hide-on-export'));
      document.querySelectorAll('.location-textarea').forEach(el => el.classList.remove('hide-on-export'));
      
      // Remove the desktop force class
      sheetRef.current.classList.remove('force-desktop-capture');
      
      // Restore original styles
      Object.keys(originalStyles).forEach(key => {
        if (originalStyles[key] !== undefined) {
          sheetRef.current.style[key] = originalStyles[key];
        } else {
          sheetRef.current.style.removeProperty(key);
        }
      });
      
      // Restore scroll position
      window.scrollTo(0, originalScrollPosition);

      // Convert to PDF with proper sizing
      const imgData = canvas.toDataURL('image/jpeg', 0.9);

      // Calculate PDF dimensions
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Create PDF with dynamic page height or split into multiple pages
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight > 297 ? pdfHeight : 297] // Use A4 height minimum
      });

      // If content is taller than one page, we might need to split it
      if (pdfHeight > 297) {
        // For very long content, you might want to use standard A4 and let it overflow
        const pageHeight = 297;
        const imgHeight = pdfHeight;
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      } else {
        // Single page PDF
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save('AttendanceSheet.pdf');
      alert('✅ PDF saved as "AttendanceSheet.pdf". Please attach it manually to your email before sending.');
      
    } catch (error) {
      console.error('Error capturing PDF:', error);
      // Restore original styles in case of error
      Object.keys(originalStyles).forEach(key => {
        if (originalStyles[key] !== undefined) {
          sheetRef.current.style[key] = originalStyles[key];
        } else {
          sheetRef.current.style.removeProperty(key);
        }
      });
      sheetRef.current.classList.remove('force-desktop-capture');
      window.scrollTo(0, originalScrollPosition);
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

  // Show login/signup screen if not authenticated
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Check if user needs to verify email
  if (user && !user.emailVerified) {
    return <EmailVerification onVerified={handleVerificationComplete} />;
  }

  // Show the main app only if authenticated AND email is verified
  return (
    <Router>
      <Navbar handleLogout={handleLogout} />
      <Routes>
        <Route path="/" element={
          <MeetingLogPage 
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
        } />
        <Route path="/sober" element={<SoberSocial />} />
        <Route path="/delete" element={<DeleteAccount />} />
      </Routes>
    </Router>
  );
}
    
export default App;