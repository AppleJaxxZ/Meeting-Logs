import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import AttendanceRow from './AttendanceRow';
import jsPDF from 'jspdf';
import './index.css';

function App() {

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
    (If not attached yet, please attach the file named "AttendanceSheet.pdf" before sending.)\n\nBest,\nAlex`;
    window.location.href = `mailto:officer@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
 
  return (
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
  );
}

export default App;