import React, { useState, useEffect } from 'react';
import { auth, resendVerificationEmail, logoutUser } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './Auth.css';

function EmailVerification({ onVerified }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [checkingVerification, setCheckingVerification] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.emailVerified) {
        onVerified(currentUser);
      }
    });

    return () => unsubscribe();
  }, [onVerified]);

  // Check verification status every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (user && !checkingVerification) {
        setCheckingVerification(true);
        try {
          await user.reload(); // Refresh user data from Firebase
          if (user.emailVerified) {
            setMessage('Email verified! Redirecting...');
            setTimeout(() => onVerified(user), 1500);
          }
        } catch (error) {
          console.error('Error checking verification:', error);
        }
        setCheckingVerification(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, onVerified, checkingVerification]);

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const result = await resendVerificationEmail();
      if (result.success) {
        setMessage('Verification email sent! Please check your inbox and spam folder.');
      } else {
        setError(result.error || 'Failed to send email. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  const handleCheckVerification = async () => {
    if (!user) return;
    
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      await user.reload(); // Force refresh user data
      if (user.emailVerified) {
        setMessage('Email verified! Redirecting...');
        setTimeout(() => onVerified(user), 1500);
      } else {
        setError('Email not verified yet. Please check your email and click the verification link.');
      }
    } catch (err) {
      setError('Error checking verification status. Please try again.');
    }
    
    setLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.reload(); // Reload to go back to login
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="verification-wrapper">
          <div className="verification-icon" style={{ fontSize: '4rem', textAlign: 'center' }}>
            📧
          </div>
          
          <h2 style={{ textAlign: 'center', marginTop: '20px', color: '#333' }}>
            Verify Your Email
          </h2>
          
          <p style={{ 
            textAlign: 'center', 
            color: '#666', 
            marginTop: '15px',
            lineHeight: '1.6'
          }}>
            We've sent a verification link to:
          </p>
          
          <p style={{ 
            textAlign: 'center', 
            fontWeight: 'bold', 
            color: '#2563eb',
            fontSize: '1.1rem',
            margin: '10px 0 20px'
          }}>
            {user?.email}
          </p>
          
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #0284c7',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#0c4a6e', margin: 0, fontSize: '0.95rem' }}>
              <strong>Next steps:</strong>
            </p>
            <ol style={{ 
              color: '#075985', 
              marginTop: '10px',
              marginBottom: 0,
              paddingLeft: '20px',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}>
              <li>Check your email inbox</li>
              <li>Click the verification link in the email</li>
              <li>Return to this page</li>
              <li>Click "Check Verification" or wait for automatic redirect</li>
            </ol>
          </div>

          {message && (
            <div className="success-message" style={{ marginBottom: '15px' }}>
              {message}
            </div>
          )}
          
          {error && (
            <div className="error-message general-error" style={{ marginBottom: '15px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleCheckVerification}
              disabled={loading}
              className="auth-button"
              style={{ width: '100%' }}
            >
              {loading ? <span className="loading-spinner"></span> : 'Check Verification'}
            </button>
            
            <button
              onClick={handleResendEmail}
              disabled={loading}
              style={{
                padding: '12px 20px',
                border: '2px solid #667eea',
                background: 'transparent',
                color: '#667eea',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#667eea';
              }}
            >
              Resend Verification Email
            </button>
          </div>

          <div style={{
            marginTop: '25px',
            paddingTop: '20px',
            borderTop: '1px solid #e0e0e0',
            textAlign: 'center'
          }}>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px' }}>
              Wrong email address?
            </p>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textDecoration: 'underline'
              }}
            >
              Sign out and use a different email
            </button>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px'
          }}>
            <p style={{ 
              color: '#991b1b', 
              fontSize: '0.85rem', 
              margin: 0,
              lineHeight: '1.5'
            }}>
              <strong>Note:</strong> Check your spam/junk folder if you don't see the email. 
              The email will come from noreply@{auth.currentUser?.email.split('@')[1] || 'your-domain'}.firebaseapp.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerification;