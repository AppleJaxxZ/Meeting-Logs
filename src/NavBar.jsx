import React from "react";
import { Link } from "react-router-dom";

function Navbar({ handleLogout }) {
    return (
      <nav style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '15px 20px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>MeetingLog</Link>
          <Link to="/sober" style={{ color: 'white', textDecoration: 'none' }}>Sober Social Event</Link>
          <Link to="/delete" style={{ color: 'white', textDecoration: 'none' }}>Delete My Account</Link>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </nav>
    );
  }
  export default Navbar;