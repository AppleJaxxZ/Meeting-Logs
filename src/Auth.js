import React, { useState } from 'react';
import {
  registerUser,
  loginUser,
  resetPassword,
  resendVerificationEmail
} from './firebase';
import './Auth.css';

function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    });
    setErrors({});
    setMessage('');
  };

  const checkPasswordCriteria = (password) => {
    const rules = {
      length: password.length >= 8,
      uppercase: new RegExp("[A-Z]").test(password),
      lowercase: new RegExp("[a-z]").test(password),
      number: new RegExp("\\d").test(password),
      special: new RegExp("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]").test(password)
    };
  
    setPasswordCriteria(rules);
  };
  

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!isForgot) {
      if (!formData.password) newErrors.password = 'Password is required';
      else {
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,20}$/;

        if (!strongRegex.test(formData.password)) {
          newErrors.password =
            'Password must be 8–20 chars and include uppercase, lowercase, number, and special character.';
        }
      }

      if (isSignup) {
        if (!formData.displayName) newErrors.displayName = 'Name is required';
        if (formData.password !== formData.confirmPassword)
          newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'password' && isSignup) checkPasswordCriteria(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isForgot) {
        const result = await resetPassword(formData.email);
        if (result.success) {
          setMessage('Password reset email sent!');
          resetForm();
          setTimeout(() => setMode('login'), 5000);
        } else {
          setErrors({ general: result.error });
        }
      } else if (isLogin) {
        const result = await loginUser(formData.email, formData.password);
        if (result.success) {
          if (!result.emailVerified) {
            setShowVerificationMessage(true);
            setMessage('Please verify your email to continue.');
          }
          if (onAuthSuccess) onAuthSuccess(result.user);
        } else {
          setErrors({ general: result.error });
        }
      } else {
        const result = await registerUser(
          formData.email,
          formData.password,
          formData.displayName
        );
        if (result.success) {
          setShowVerificationMessage(true);
          setMessage(result.message || 'Account created! Check your email.');
          resetForm();
          setTimeout(() => setMode('login'), 5000);
        } else {
          setErrors({ general: result.error });
        }
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    const result = await resendVerificationEmail();
    if (result.success) setMessage(result.message);
    else setErrors({ general: result.error });
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">
            {isForgot ? 'Reset Password' : isLogin ? 'Meeting Logger' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {isForgot
              ? 'Enter your email to receive a reset link'
              : isLogin
              ? 'Sign in to access your attendance records'
              : 'Sign up to start tracking your meetings'}
          </p>
        </div>

        {showVerificationMessage && (
          <div className="verification-notice">
            <div className="verification-icon">📧</div>
            <h3>Check Your Email!</h3>
            <p>We've sent a verification link to your email address.</p>
            <button
              onClick={handleResendVerification}
              className="resend-button"
              disabled={loading}
            >
              Resend Verification Email
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {errors.general && <div className="error-message general-error">{errors.general}</div>}
          {message && <div className="success-message">{message}</div>}

          {isSignup && (
            <div className="form-group">
              <label htmlFor="displayName">Full Name</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={errors.displayName ? 'error' : ''}
              />
              {errors.displayName && <span className="error-message">{errors.displayName}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={errors.email ? 'error' : ''}
              autoComplete="email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          {!isForgot && (
            <>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={errors.password ? 'error' : ''}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              {isSignup && (
                <>
                  <ul className="password-criteria">
                    <li className={passwordCriteria.length ? 'valid' : 'invalid'}>✅ At least 8 characters</li>
                    <li className={passwordCriteria.uppercase ? 'valid' : 'invalid'}>✅ One uppercase letter</li>
                    <li className={passwordCriteria.lowercase ? 'valid' : 'invalid'}>✅ One lowercase letter</li>
                    <li className={passwordCriteria.number ? 'valid' : 'invalid'}>✅ One number</li>
                    <li className={passwordCriteria.special ? 'valid' : 'invalid'}>✅ One special character</li>
                  </ul>

                  <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      className={errors.confirmPassword ? 'error' : ''}
                      autoComplete="new-password"
                    />
                    {errors.confirmPassword && (
                      <span className="error-message">{errors.confirmPassword}</span>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : isForgot ? 'Send Reset Email' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>

          {isLogin && !isForgot && (
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => setMode('forgot')}
            >
              Forgot your password?
            </button>
          )}
        </form>

        <div className="auth-footer">
          {isForgot ? (
            <p>
              Remember your password?{' '}
              <button onClick={() => setMode('login')} className="auth-link">
                Back to login
              </button>
            </p>
          ) : (
            <p>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => setMode(isLogin ? 'signup' : 'login')}
                className="auth-link"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
