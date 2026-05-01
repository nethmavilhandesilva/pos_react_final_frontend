import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const LoginPage = () => {
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
    
    // Load saved credentials if remember me was checked
    const savedUserId = localStorage.getItem("saved_user_id");
    const savedRememberMe = localStorage.getItem("remember_me") === "true";
    if (savedUserId && savedRememberMe) {
      setUserId(savedUserId);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    // Password strength checker
    if (password) {
      let strength = 0;
      if (password.length >= 6) strength++;
      if (password.match(/[a-z]/)) strength++;
      if (password.match(/[A-Z]/)) strength++;
      if (password.match(/[0-9]/)) strength++;
      if (password.match(/[^a-zA-Z0-9]/)) strength++;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  const handleMouseMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/login", {
        user_id,
        password,
      });

      if (response.data.success && response.data.token) {
        localStorage.setItem("token", response.data.token);

        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
          localStorage.setItem("userData", JSON.stringify(response.data.user));
        }

        if (rememberMe) {
          localStorage.setItem("saved_user_id", user_id);
          localStorage.setItem("remember_me", "true");
        } else {
          localStorage.removeItem("saved_user_id");
          localStorage.removeItem("remember_me");
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

        const userRole = response.data.user?.role;
        
        // Add success animation before redirect
        const button = document.querySelector('.login-button');
        if (button) {
          button.classList.add('success-animation');
        }
        
        setTimeout(() => {
          if (userRole === 'level2') {
            navigate('/printed-bills', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 500);
      } else {
        setError(response.data.message || "Invalid credentials");
        // Shake animation on error
        const card = document.querySelector('.login-card');
        if (card) {
          card.classList.add('shake-animation');
          setTimeout(() => card.classList.remove('shake-animation'), 500);
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
      // Shake animation on error
      const card = document.querySelector('.login-card');
      if (card) {
        card.classList.add('shake-animation');
        setTimeout(() => card.classList.remove('shake-animation'), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength <= 2) return { text: "Weak", color: "#ef4444" };
    if (passwordStrength <= 3) return { text: "Fair", color: "#f59e0b" };
    if (passwordStrength <= 4) return { text: "Good", color: "#10b981" };
    return { text: "Strong", color: "#059669" };
  };

  const strengthInfo = getPasswordStrengthText();

  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'radial-gradient(circle at 20% 50%, #2d1b4e 0%, #1a1a2e 50%, #0f0f23 100%)',
      fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      zIndex: 9999,
    },
    animatedBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    },
    gradientOrb1: {
      position: 'absolute',
      top: '-20%',
      right: '-10%',
      width: '60%',
      height: '60%',
      background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0) 70%)',
      borderRadius: '50%',
      animation: 'float1 15s ease-in-out infinite',
    },
    gradientOrb2: {
      position: 'absolute',
      bottom: '-20%',
      left: '-10%',
      width: '50%',
      height: '50%',
      background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(236,72,153,0) 70%)',
      borderRadius: '50%',
      animation: 'float2 18s ease-in-out infinite',
    },
    gradientOrb3: {
      position: 'absolute',
      top: '30%',
      left: '30%',
      width: '40%',
      height: '40%',
      background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
      borderRadius: '50%',
      animation: 'float3 20s ease-in-out infinite',
    },
    mouseGlow: {
      position: 'absolute',
      width: '500px',
      height: '500px',
      background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0) 50%)`,
      pointerEvents: 'none',
      transition: 'background 0.1s ease',
    },
    card: {
      position: 'relative',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '32px',
      padding: '48px 40px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
      width: '480px',
      maxWidth: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      zIndex: 10,
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    },
    logoSection: {
      textAlign: 'center',
      marginBottom: '32px',
      animation: 'fadeInDown 0.6s ease-out',
    },
    logoWrapper: {
      position: 'relative',
      display: 'inline-block',
    },
    logoIcon: {
      fontSize: '56px',
      marginBottom: '12px',
      display: 'inline-block',
      animation: 'pulse 2s infinite',
    },
    logoGlow: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80px',
      height: '80px',
      background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0) 70%)',
      borderRadius: '50%',
      animation: 'pulse 2s infinite',
    },
    title: {
      textAlign: 'center',
      margin: '0 0 8px 0',
      fontSize: '32px',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #3b82f6 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '-0.5px',
    },
    subtitle: {
      textAlign: 'center',
      color: '#6b7280',
      fontSize: '14px',
      margin: 0,
    },
    errorAlert: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      padding: '12px 16px',
      borderRadius: '16px',
      marginBottom: '24px',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      border: '1px solid #fecaca',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      fontSize: '12px',
      color: '#4b5563',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    inputWrapper: {
      position: 'relative',
    },
    inputIcon: {
      position: 'absolute',
      left: '14px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '16px',
      opacity: 0.5,
    },
    input: {
      width: '100%',
      padding: '14px 14px 14px 42px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '16px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#000000',
      outline: 'none',
      transition: 'all 0.3s ease',
      backgroundColor: '#ffffff',
    },
    passwordWrapper: {
      position: 'relative',
    },
    passwordInput: {
      width: '100%',
      padding: '14px 52px 14px 42px',
      border: '1.5px solid #e5e7eb',
      borderRadius: '16px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#000000',
      outline: 'none',
      transition: 'all 0.3s ease',
      backgroundColor: '#ffffff',
    },
    capsLockWarning: {
      position: 'absolute',
      right: '52px',
      top: '50%',
      transform: 'translateY(-50%)',
      fontSize: '10px',
      color: '#f59e0b',
      background: '#fff3e0',
      padding: '2px 6px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
    },
    togglePassword: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      fontSize: '16px',
      padding: '4px',
      color: '#9ca3af',
      transition: 'color 0.3s ease',
    },
    passwordStrengthBar: {
      marginTop: '8px',
      height: '4px',
      backgroundColor: '#e5e7eb',
      borderRadius: '2px',
      overflow: 'hidden',
    },
    strengthFill: {
      width: `${(passwordStrength / 5) * 100}%`,
      height: '100%',
      backgroundColor: strengthInfo.color || '#10b981',
      borderRadius: '2px',
      transition: 'width 0.3s ease, background-color 0.3s ease',
    },
    strengthText: {
      fontSize: '10px',
      color: strengthInfo.color || '#9ca3af',
      marginTop: '4px',
      textAlign: 'right',
    },
    rememberMe: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '24px',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#8b5cf6',
    },
    rememberMeLabel: {
      fontSize: '13px',
      color: '#4b5563',
      cursor: 'pointer',
    },
    button: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '16px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    },
    features: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '28px',
      gap: '12px',
    },
    feature: {
      flex: 1,
      textAlign: 'center',
      fontSize: '11px',
      color: '#6b7280',
      padding: '10px',
      borderRadius: '12px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    featureIcon: {
      fontSize: '20px',
      marginBottom: '6px',
      display: 'block',
    },
    footer: {
      textAlign: 'center',
      marginTop: '28px',
      paddingTop: '20px',
      borderTop: '1px solid #e5e7eb',
    },
    footerText: {
      fontSize: '13px',
      color: '#6b7280',
      margin: 0,
    },
    link: {
      color: '#8b5cf6',
      textDecoration: 'none',
      fontWeight: '600',
      marginLeft: '4px',
      transition: 'color 0.3s ease',
    },
  };

  // Handle input focus styles
  const [inputFocus, setInputFocus] = useState({
    user_id: false,
    password: false,
  });

  const handleInputFocus = (field) => {
    setInputFocus(prev => ({ ...prev, [field]: true }));
  };

  const handleInputBlur = (field) => {
    setInputFocus(prev => ({ ...prev, [field]: false }));
  };

  return (
    <div 
      ref={containerRef}
      style={styles.container}
      onMouseMove={handleMouseMove}
    >
      <div style={styles.animatedBg}>
        <div style={styles.gradientOrb1}></div>
        <div style={styles.gradientOrb2}></div>
        <div style={styles.gradientOrb3}></div>
        <div style={styles.mouseGlow}></div>
      </div>

      <div className="login-card" style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoWrapper}>
            <div style={styles.logoGlow}></div>
            <div style={styles.logoIcon}>🏪</div>
          </div>
          <h2 style={styles.title}>POS System</h2>
          <p style={styles.subtitle}>Next-Gen Sales Management Platform</p>
        </div>
        
        {error && (
          <div style={styles.errorAlert}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div style={styles.formGroup}>
            <label style={styles.label}>USER ID</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>👤</span>
              <input
                type="text"
                style={{
                  ...styles.input,
                  ...(inputFocus.user_id && { borderColor: '#8b5cf6' }),
                }}
                value={user_id}
                onChange={(e) => setUserId(e.target.value)}
                onFocus={() => handleInputFocus('user_id')}
                onBlur={() => handleInputBlur('user_id')}
                required
                disabled={loading}
                placeholder="Enter your user ID"
                autoComplete="username"
              />
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>PASSWORD</label>
            <div style={styles.passwordWrapper}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                style={{
                  ...styles.passwordInput,
                  ...(inputFocus.password && { borderColor: '#8b5cf6' }),
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => handleInputFocus('password')}
                onBlur={() => handleInputBlur('password')}
                onKeyDown={handleKeyDown}
                required
                disabled={loading}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {capsLockOn && (
                <span style={styles.capsLockWarning}>Caps Lock ON</span>
              )}
              <button
                type="button"
                style={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                onMouseEnter={(e) => e.currentTarget.style.color = '#8b5cf6'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
              >
                {showPassword ? "👁️" : "🔒"}
              </button>
            </div>
            {password && (
              <>
                <div style={styles.passwordStrengthBar}>
                  <div style={styles.strengthFill}></div>
                </div>
                <div style={styles.strengthText}>
                  Password strength: {strengthInfo.text}
                </div>
              </>
            )}
          </div>

          <div style={styles.rememberMe}>
            <input
              type="checkbox"
              id="rememberMe"
              style={styles.checkbox}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe" style={styles.rememberMeLabel}>
              Remember me
            </label>
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            style={styles.button}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 30px -5px rgba(139,92,246,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div style={styles.features}>
          {[
            { icon: "📊", label: "Analytics" },
            { icon: "💳", label: "Payments" },
            { icon: "🖨️", label: "Printing" },
            { icon: "📈", label: "Reports" },
          ].map((feature, index) => (
            <div
              key={index}
              style={styles.feature}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={styles.featureIcon}>{feature.icon}</span>
              <div>{feature.label}</div>
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            New to the system? 
            <a href="/register" style={styles.link}> Create account</a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(120deg); }
          66% { transform: translate(-20px, 20px) rotate(240deg); }
        }
        
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-30px, 30px) rotate(-120deg); }
          66% { transform: translate(20px, -20px) rotate(-240deg); }
        }
        
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -20px) scale(1.2); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        
        .shake-animation {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        
        .success-animation {
          animation: successPulse 0.5s ease-out;
        }
        
        @keyframes successPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
          100% { transform: scale(1); }
        }
        
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px white inset !important;
          -webkit-text-fill-color: #000000 !important;
          font-weight: 600 !important;
          box-shadow: 0 0 0 30px white inset !important;
        }
        
        /* Custom scrollbar for card */
        .login-card::-webkit-scrollbar {
          width: 6px;
        }
        
        .login-card::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .login-card::-webkit-scrollbar-thumb {
          background: #c7d2fe;
          border-radius: 3px;
        }
        
        .login-card::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }
        
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;