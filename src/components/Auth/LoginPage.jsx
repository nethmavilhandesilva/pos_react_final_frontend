import React, { useState } from "react";
import api from "../../api";

const LoginPage = () => {
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  React.useEffect(() => {
    const savedUserId = localStorage.getItem("remembered_user");
    if (savedUserId) {
      setUserId(savedUserId);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await api.post("/login", {
        user_id,
        password,
      });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }

        if (rememberMe) {
          localStorage.setItem("remembered_user", user_id);
        } else {
          localStorage.removeItem("remembered_user");
        }

        window.location.href = "/sms_new_frontend_50500/sales";
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated Grid Background */}
      <div style={styles.bgGrid}></div>
      <div style={styles.bgGradient}></div>
      
      {/* Floating Elements */}
      <div style={styles.floatingOrb1}></div>
      <div style={styles.floatingOrb2}></div>
      <div style={styles.floatingOrb3}></div>

      <div style={styles.mainWrapper}>
        {/* Left Side - Branding Section */}
        <div style={styles.brandSide}>
          <div style={styles.brandContent}>
            <div style={styles.posBadge}>
              <span style={styles.posBadgeText}>POS v3.0</span>
            </div>
            <div style={styles.logoContainer}>
              <svg style={styles.logoIcon} viewBox="0 0 24 24" fill="none">
                <path d="M3 9L12 3L21 9L12 15L3 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12V18L12 22L19 18V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7.5L16 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={styles.brandTitle}>POS<br />Trading System</h1>
            <p style={styles.brandDesc}>Next-generation Point of Sale<br />& Inventory Management Platform</p>
            
            <div style={styles.features}>
              <div style={styles.feature}>
                <svg style={styles.featureIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Real-time Inventory</span>
              </div>
              <div style={styles.feature}>
                <svg style={styles.featureIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Fast Checkout</span>
              </div>
              <div style={styles.feature}>
                <svg style={styles.featureIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Analytics Dashboard</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div style={styles.formSide}>
          <div style={styles.formContainer}>
            <div style={styles.formHeader}>
              <h2 style={styles.welcomeText}>Welcome back</h2>
              <p style={styles.signInText}>Sign in to your account to continue</p>
            </div>

            {error && (
              <div style={styles.errorAlert}>
                <svg style={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <svg style={styles.labelIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  User ID / Email
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={user_id}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                  required
                  disabled={isLoading}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  <svg style={styles.labelIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Password
                </label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    style={styles.input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.toggleBtn}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div style={styles.optionsBar}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span>Remember me</span>
                </label>
                <a href="/sms_new_frontend_50500/forgot-password" style={styles.forgotLink}>
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                style={{
                  ...styles.loginBtn,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span style={styles.loaderWrapper}>
                    <svg style={styles.spinner} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  "Sign In →"
                )}
              </button>

              <div style={styles.registerWrapper}>
                <span style={styles.registerText}>New to POS Trading?</span>
                <a href="/sms_new_frontend_50500/register" style={styles.registerLink}>
                  Create an account
                </a>
              </div>
            </form>

            <div style={styles.demoHint}>
              <svg style={styles.hintIcon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Demo: admin / password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100vh",
    margin: 0,
    padding: 0,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#0a0e27",
    overflow: "hidden",
  },
  bgGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: "linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)",
    backgroundSize: "50px 50px",
    pointerEvents: "none",
  },
  bgGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
    pointerEvents: "none",
  },
  floatingOrb1: {
    position: "absolute",
    top: "10%",
    right: "15%",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent)",
    borderRadius: "50%",
    filter: "blur(60px)",
    animation: "float1 20s infinite",
    pointerEvents: "none",
  },
  floatingOrb2: {
    position: "absolute",
    bottom: "10%",
    left: "10%",
    width: "250px",
    height: "250px",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent)",
    borderRadius: "50%",
    filter: "blur(60px)",
    animation: "float2 25s infinite",
    pointerEvents: "none",
  },
  floatingOrb3: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(236, 72, 153, 0.1), transparent)",
    borderRadius: "50%",
    filter: "blur(80px)",
    transform: "translate(-50%, -50%)",
    animation: "float3 30s infinite",
    pointerEvents: "none",
  },
  mainWrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    boxSizing: "border-box",
  },
  brandSide: {
    flex: 1,
    maxWidth: "480px",
    height: "600px",
    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))",
    backdropFilter: "blur(20px)",
    borderRadius: "32px 0 0 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid rgba(255, 255, 255, 0.1)",
    boxSizing: "border-box",
  },
  brandContent: {
    padding: "48px",
    color: "white",
  },
  posBadge: {
    display: "inline-block",
    background: "rgba(59, 130, 246, 0.3)",
    backdropFilter: "blur(10px)",
    padding: "4px 12px",
    borderRadius: "20px",
    marginBottom: "24px",
    border: "1px solid rgba(59, 130, 246, 0.5)",
  },
  posBadgeText: {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "1px",
  },
  logoContainer: {
    marginBottom: "24px",
  },
  logoIcon: {
    width: "48px",
    height: "48px",
    color: "#3b82f6",
  },
  brandTitle: {
    fontSize: "36px",
    fontWeight: "700",
    margin: "0 0 16px 0",
    lineHeight: "1.2",
    letterSpacing: "-1px",
  },
  brandDesc: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: "1.6",
    marginBottom: "32px",
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  feature: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.8)",
  },
  featureIcon: {
    width: "16px",
    height: "16px",
    color: "#3b82f6",
  },
  formSide: {
    flex: 1,
    maxWidth: "480px",
    height: "600px",
    background: "white",
    borderRadius: "0 32px 32px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  formContainer: {
    width: "100%",
    padding: "48px",
  },
  formHeader: {
    marginBottom: "32px",
  },
  welcomeText: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 8px 0",
    letterSpacing: "-0.5px",
  },
  signInText: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fee2e2",
    borderLeft: "3px solid #ef4444",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "13px",
    color: "#dc2626",
  },
  errorIcon: {
    width: "16px",
    height: "16px",
    fill: "#dc2626",
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "8px",
  },
  labelIcon: {
    width: "14px",
    height: "14px",
    fill: "#3b82f6",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: "10px",
    outline: "none",
    transition: "all 0.2s",
    fontFamily: "inherit",
    boxSizing: "border-box",
    background: "#f9fafb",
  },
  passwordWrapper: {
    position: "relative",
  },
  toggleBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    fontSize: "12px",
    fontWeight: "600",
    color: "#3b82f6",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  optionsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#6b7280",
    cursor: "pointer",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
    accentColor: "#3b82f6",
  },
  forgotLink: {
    fontSize: "13px",
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: "500",
  },
  loginBtn: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    marginBottom: "20px",
  },
  loaderWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  spinner: {
    width: "16px",
    height: "16px",
    animation: "spin 1s linear infinite",
  },
  registerWrapper: {
    textAlign: "center",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
  },
  registerText: {
    fontSize: "13px",
    color: "#6b7280",
    marginRight: "8px",
  },
  registerLink: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#3b82f6",
    textDecoration: "none",
  },
  demoHint: {
    marginTop: "20px",
    padding: "10px",
    background: "#f3f4f6",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "11px",
    color: "#6b7280",
  },
  hintIcon: {
    width: "14px",
    height: "14px",
    fill: "#9ca3af",
  },
};

// Add animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes float1 {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(30px, -30px) rotate(120deg); }
    66% { transform: translate(-20px, 20px) rotate(240deg); }
  }
  @keyframes float2 {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(-30px, -20px) rotate(120deg); }
    66% { transform: translate(20px, 30px) rotate(240deg); }
  }
  @keyframes float3 {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.1); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  input:focus {
    border-color: #3b82f6;
    background: white;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  a:hover {
    text-decoration: underline;
  }
`;

document.head.appendChild(styleSheet);

export default LoginPage;