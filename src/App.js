import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import AttendanceRow from './AttendanceRow';
import './index.css';

function App() {
  
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

    const canvas = await html2canvas(sheetRef.current, { scale: 2 });
    const image = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = image;
    link.download = 'AttendanceSheet.png';
    link.click();
  };

  const openEmailClient = () => {
    const subject = 'AA Attendance Sheet Submission';
    const body = `Hi Officer,\n\nPlease find my attendance sheet attached as an image.\n\nName: ${name}\nDate Range: ${dateRange}\n\nBest,\nAlex`;
    window.location.href = `mailto:officer@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
 
  return (
    <div>
      <div ref={sheetRef} className="container">
        <h2>NORTHAMPTON COUNTY RECOVERY COURT SELF-HELP MEETING ATTENDANCE RECORD</h2>

        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
        </div>
        <div className="form-group">
          <label>Date Range</label>
          <input value={dateRange} onChange={e => setDateRange(e.target.value)} placeholder="09-10-2025 to 10-15-2025" />
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