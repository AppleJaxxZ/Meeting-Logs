// import React, { useState, useEffect } from 'react';
// import { sendOTP, verifyOTP, cleanupRecaptcha } from './firebase';
// import './Auth.css';

// function PhoneAuth({ onAuthSuccess, onSwitchToEmail }) {
//   const [phoneNumber, setPhoneNumber] = useState('');
//   const [countryCode, setCountryCode] = useState('+1'); // Default to US
//   const [otpCode, setOtpCode] = useState('');
//   const [showOTPInput, setShowOTPInput] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [errors, setErrors] = useState({});
//   const [message, setMessage] = useState('');
//   const [resendTimer, setResendTimer] = useState(0);

//   useEffect(() => {
//     // Cleanup on unmount
//     return () => {
//       cleanupRecaptcha();
//     };
//   }, []);

//   useEffect(() => {
//     // Countdown timer for resend
//     if (resendTimer > 0) {
//       const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
//       return () => clearTimeout(timer);
//     }
//   }, [resendTimer]);

//   const formatPhoneNumber = (value) => {
//     // Remove all non-numeric characters
//     const cleaned = value.replace(/\D/g, '');
    
//     // Format as (XXX) XXX-XXXX for US numbers
//     if (countryCode === '+1') {
//       if (cleaned.length <= 3) {
//         return cleaned;
//       } else if (cleaned.length <= 6) {
//         return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
//       } else {
//         return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
//       }
//     }
    
//     return cleaned;
//   };

//   const handlePhoneChange = (e) => {
//     const formatted = formatPhoneNumber(e.target.value);
//     setPhoneNumber(formatted);
//     if (errors.phone) {
//       setErrors({ ...errors, phone: '' });
//     }
//   };

//   const handleOTPChange = (e) => {
//     const value = e.target.value.replace(/\D/g, '').slice(0, 6);
//     setOtpCode(value);
//     if (errors.otp) {
//       setErrors({ ...errors, otp: '' });
//     }
//   };

//   const validatePhone = () => {
//     const cleaned = phoneNumber.replace(/\D/g, '');
//     if (!cleaned) {
//       setErrors({ phone: 'Phone number is required' });
//       return false;
//     }
//     if (countryCode === '+1' && cleaned.length !== 10) {
//       setErrors({ phone: 'Please enter a valid 10-digit phone number' });
//       return false;
//     }
//     return true;
//   };

//   const handleSendOTP = async () => {
//     if (!validatePhone()) return;

//     setLoading(true);
//     setErrors({});
//     setMessage('');

//     const fullNumber = countryCode + phoneNumber.replace(/\D/g, '');
//     const result = await sendOTP(fullNumber, 'send-otp-button');

//     if (result.success) {
//       setShowOTPInput(true);
//       setMessage('Verification code sent to your phone!');
//       setResendTimer(60); // 60 second cooldown
//     } else {
//       setErrors({ general: result.error });
//     }

//     setLoading(false);
//   };

//   const handleVerifyOTP = async () => {
//     if (!otpCode || otpCode.length !== 6) {
//       setErrors({ otp: 'Please enter a 6-digit code' });
//       return;
//     }

//     setLoading(true);
//     setErrors({});

//     const result = await verifyOTP(otpCode);

//     if (result.success) {
//       setMessage('Phone verified successfully!');
//       if (onAuthSuccess) {
//         setTimeout(() => onAuthSuccess(result.user), 1000);
//       }
//     } else {
//       setErrors({ otp: result.error });
//     }

//     setLoading(false);
//   };

//   const handleResendOTP = async () => {
//     if (resendTimer > 0) return;
    
//     cleanupRecaptcha(); // Clear existing recaptcha
//     await handleSendOTP();
//   };

//   return (
//     <div className="auth-container">
//       <div className="auth-card">
//         <div className="auth-header">
//           <h2 className="auth-title">Phone Sign In</h2>
//           <p className="auth-subtitle">
//             {showOTPInput 
//               ? 'Enter the verification code sent to your phone'
//               : 'Sign in using your phone number'}
//           </p>
//         </div>

//         <form onSubmit={(e) => e.preventDefault()} className="auth-form">
//           {errors.general && (
//             <div className="error-message general-error">
//               {errors.general}
//             </div>
//           )}
          
//           {message && (
//             <div className="success-message">
//               {message}
//             </div>
//           )}

//           {!showOTPInput ? (
//             <>
//               <div className="form-group">
//                 <label htmlFor="phone">Phone Number</label>
//                 <div style={{ display: 'flex', gap: '10px' }}>
//                   <select
//                     value={countryCode}
//                     onChange={(e) => setCountryCode(e.target.value)}
//                     style={{
//                       width: '100px',
//                       padding: '12px',
//                       border: '2px solid #e0e0e0',
//                       borderRadius: '10px',
//                       fontSize: '1rem',
//                       background: '#fafafa'
//                     }}
//                   >
//                     <option value="+1">🇺🇸 +1</option>
//                     <option value="+44">🇬🇧 +44</option>
//                     <option value="+91">🇮🇳 +91</option>
//                     <option value="+86">🇨🇳 +86</option>
//                     <option value="+81">🇯🇵 +81</option>
//                     <option value="+49">🇩🇪 +49</option>
//                     <option value="+33">🇫🇷 +33</option>
//                     <option value="+39">🇮🇹 +39</option>
//                     <option value="+34">🇪🇸 +34</option>
//                     <option value="+61">🇦🇺 +61</option>
//                   </select>
//                   <input
//                     type="tel"
//                     id="phone"
//                     value={phoneNumber}
//                     onChange={handlePhoneChange}
//                     placeholder={countryCode === '+1' ? '(555) 123-4567' : 'Phone number'}
//                     className={errors.phone ? 'error' : ''}
//                     style={{ flex: 1 }}
//                   />
//                 </div>
//                 {errors.phone && (
//                   <span className="error-message">{errors.phone}</span>
//                 )}
//               </div>

//               <button
//                 id="send-otp-button"
//                 type="button"
//                 onClick={handleSendOTP}
//                 className="auth-button"
//                 disabled={loading}
//               >
//                 {loading ? (
//                   <span className="loading-spinner"></span>
//                 ) : (
//                   'Send Verification Code'
//                 )}
//               </button>
//             </>
//           ) : (
//             <>
//               <div className="form-group">
//                 <label htmlFor="otp">Verification Code</label>
//                 <input
//                   type="text"
//                   id="otp"
//                   value={otpCode}
//                   onChange={handleOTPChange}
//                   placeholder="Enter 6-digit code"
//                   maxLength="6"
//                   className={errors.otp ? 'error' : ''}
//                   style={{
//                     fontSize: '1.5rem',
//                     letterSpacing: '0.5em',
//                     textAlign: 'center',
//                     fontWeight: 'bold'
//                   }}
//                   autoComplete="one-time-code"
//                 />
//                 {errors.otp && (
//                   <span className="error-message">{errors.otp}</span>
//                 )}
//               </div>

//               <div style={{ display: 'flex', gap: '10px' }}>
//                 <button
//                   type="button"
//                   onClick={handleVerifyOTP}
//                   className="auth-button"
//                   disabled={loading}
//                   style={{ flex: 1 }}
//                 >
//                   {loading ? (
//                     <span className="loading-spinner"></span>
//                   ) : (
//                     'Verify Code'
//                   )}
//                 </button>

//                 <button
//                   type="button"
//                   onClick={handleResendOTP}
//                   disabled={resendTimer > 0 || loading}
//                   style={{
//                     flex: 1,
//                     padding: '14px 20px',
//                     border: '2px solid #667eea',
//                     background: resendTimer > 0 ? '#f0f0f0' : 'transparent',
//                     color: resendTimer > 0 ? '#999' : '#667eea',
//                     borderRadius: '10px',
//                     cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
//                     fontWeight: '600',
//                     fontSize: '1rem',
//                     transition: 'all 0.3s ease'
//                   }}
//                 >
//                   {resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend Code'}
//                 </button>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => {
//                   setShowOTPInput(false);
//                   setOtpCode('');
//                   setErrors({});
//                   setMessage('');
//                   cleanupRecaptcha();
//                 }}
//                 style={{
//                   background: 'none',
//                   border: 'none',
//                   color: '#667eea',
//                   cursor: 'pointer',
//                   fontSize: '0.9rem',
//                   marginTop: '10px',
//                   textDecoration: 'underline'
//                 }}
//               >
//                 Change phone number
//               </button>
//             </>
//           )}

//           {/* Invisible reCAPTCHA container */}
//           <div id="recaptcha-container"></div>
//         </form>

//         <div className="auth-footer">
//           <p>
//             Prefer to use email?{' '}
//             <button onClick={onSwitchToEmail} className="auth-link">
//               Sign in with Email
//             </button>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default PhoneAuth;