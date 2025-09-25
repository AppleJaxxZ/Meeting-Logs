// Auth.js
import React, { useState } from 'react';
import { registerUser, loginUser, resetPassword, resendVerificationEmail } from './firebase';
import './Auth.css';

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!isForgotPassword) {
      // Password validation
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      // Sign up specific validation
      if (!isLogin) {
        if (!formData.displayName) {
          newErrors.displayName = 'Name is required';
        }
        
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    const result = await resendVerificationEmail();
    if (result.success) {
      setMessage(result.message);
    } else {
      setErrors({ general: result.error });
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isForgotPassword) {
        const result = await resetPassword(formData.email);
        if (result.success) {
          setMessage('Password reset email sent! Check your inbox and spam folder.');
          setFormData({ email: '', password: '', confirmPassword: '', displayName: '' });
          setTimeout(() => {
            setIsForgotPassword(false);
            setMessage('');
          }, 5000);
        } else {
          setErrors({ general: result.error });
        }
      } else if (isLogin) {
        const result = await loginUser(formData.email, formData.password);
        if (result.success) {
          if (!result.emailVerified) {
            setShowVerificationMessage(true);
            setMessage('Please verify your email to continue. Check your inbox for the verification link.');
            // Still allow login but show warning
            if (onAuthSuccess) {
              onAuthSuccess(result.user);
            }
          } else {
            setMessage('Login successful!');
            if (onAuthSuccess) {
              onAuthSuccess(result.user);
            }
          }
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
          setMessage(result.message || 'Account created! Please check your email to verify your account.');
          // Clear form
          setFormData({ email: '', password: '', confirmPassword: '', displayName: '' });
          // Switch to login after 5 seconds
          setTimeout(() => {
            setIsLogin(true);
            setShowVerificationMessage(false);
          }, 5000);
        } else {
          setErrors({ general: result.error });
        }
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setShowVerificationMessage(false);
    setFormData({ email: '', password: '', confirmPassword: '', displayName: '' });
    setErrors({});
    setMessage('');
  };

  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setShowVerificationMessage(false);
    setErrors({});
    setMessage('');
  };

  const backToLogin = () => {
    setIsForgotPassword(false);
    setIsLogin(true);
    setShowVerificationMessage(false);
    setErrors({});
    setMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">
            {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {isForgotPassword 
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
            <p>We've sent a verification link to your email address. Please click the link to verify your account.</p>
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
          {errors.general && (
            <div className="error-message general-error">
              {errors.general}
            </div>
          )}
          
          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          {!isLogin && !isForgotPassword && (
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
              {errors.displayName && (
                <span className="error-message">{errors.displayName}</span>
              )}
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
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          {!isForgotPassword && (
            <>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={errors.password ? 'error' : ''}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                {errors.password && (
                  <span className="error-message">{errors.password}</span>
                )}
              </div>

              {!isLogin && (
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
              )}
            </>
          )}

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              isForgotPassword ? 'Send Reset Email' : isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>

          {!isForgotPassword && isLogin && (
            <button 
              type="button" 
              className="forgot-password-link"
              onClick={handleForgotPassword}
            >
              Forgot your password?
            </button>
          )}
        </form>

        <div className="auth-footer">
          {isForgotPassword ? (
            <p>
              Remember your password?{' '}
              <button onClick={backToLogin} className="auth-link">
                Back to login
              </button>
            </p>
          ) : (
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button onClick={switchMode} className="auth-link">
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