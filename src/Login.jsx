import { useState } from "react";
import { loginUser } from "./firebase.js";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await loginUser(email, password);
      if (mode === "staff" && user.role === "customer") {
        setError("This is a customer account. Please use Customer Login."); setLoading(false); return;
      }
      if (mode === "customer" && user.role !== "customer") {
        setError("This is a staff account. Please use Staff Login."); setLoading(false); return;
      }
      onLogin(user);
    } catch { setError("Invalid email or password."); }
    setLoading(false);
  }

  // ── HOMEPAGE ────────────────────────────────────────────────
  if (!mode) return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font)", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .login-card { transition: transform 0.2s, box-shadow 0.2s; }
        .login-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.12) !important; }
        .feature-pill { display: inline-block; padding: 5px 14px; border-radius: 20px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; margin: 4px; }
      `}</style>

      {/* Split layout — left dark, right light */}
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* LEFT — brand panel */}
        <div style={{ width: "45%", background: "var(--navy)", display: "flex", flexDirection: "column", padding: "48px", position: "relative", overflow: "hidden" }}>
          {/* Background grid pattern */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
          {/* Teal accent circle */}
          <div style={{ position: "absolute", bottom: "-80px", right: "-80px", width: "320px", height: "320px", borderRadius: "50%", background: "radial-gradient(circle, rgba(8,145,178,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div className="reveal reveal-1" style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "64px" }}>
<div style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              fontSize: "20px"
            }}>✚</div>
              <div>
                <div style={{ fontSize: "17px", fontWeight: "700", color: "white" }}>MedStock <span style={{ color: "#0891B2" }}>AI</span></div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Hospital Pharmacy</div>
              </div>
            </div>

            <div className="reveal reveal-1" style={{ marginBottom: "40px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Intelligent Pharmacy Management</div>
              <h1 style={{ fontSize: "36px", fontWeight: "700", color: "white", lineHeight: "1.2", letterSpacing: "-0.5px", marginBottom: "16px" }}>
                Eliminating waste.<br />Preventing shortages.
              </h1>
              <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", lineHeight: "1.7", maxWidth: "340px" }}>
                AI-powered FEFO enforcement and demand forecasting for government hospital pharmacies across India.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "48px" }}>
              {[
                { icon: "⚡", title: "FEFO Enforcement", desc: "Always dispenses the soonest-expiring batch automatically" },
                { icon: "🧠", title: "ML Demand Forecast", desc: "4-algorithm auto-selection with outlier removal" },
                { icon: "🛒", title: "Patient Storefront", desc: "Direct ordering with real-time inventory updates" },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "white", marginBottom: "2px" }}>{f.title}</div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["265 Medicines", "Real-time Firebase", "Drug Interactions", "PDF Reports", "Waste Analytics"].map(f => (
                <span key={f} className="feature-pill">{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — login options */}
        <div style={{ flex: 1, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px" }}>
          <div style={{ width: "100%", maxWidth: "420px" }}>
            <div className="reveal reveal-1" style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "26px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px", letterSpacing: "-0.3px" }}>Welcome back</h2>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Choose how you'd like to sign in</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "32px" }}>
              {/* Staff card */}
              <div className="login-card reveal reveal-1" onClick={() => setMode("staff")} style={{ background: "white", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px", cursor: "pointer", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #EEF0F8, #E0E8FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, boxShadow: "0 2px 8px rgba(27,42,107,0.1)" }}>🏥</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "3px" }}>Staff Login</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Pharmacists, managers and administrators</div>
                </div>
                <div style={{ fontSize: "18px", color: "var(--text-tertiary)" }}>→</div>
              </div>

              {/* Customer card */}
              <div className="login-card reveal reveal-2" onClick={() => setMode("customer")} style={{ background: "white", border: "1px solid var(--border)", borderRadius: "14px", padding: "20px 22px", cursor: "pointer", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0, boxShadow: "0 2px 8px rgba(5,150,105,0.1)" }}>🛒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "3px" }}>Patient / Customer</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Browse and order medicines directly</div>
                </div>
                <div style={{ fontSize: "18px", color: "var(--text-tertiary)" }}>→</div>
              </div>
            </div>

            <div style={{ textAlign: "center", fontSize: "12px", color: "var(--text-tertiary)" }}>
              MedStock AI · Government Hospital Pharmacy System
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── LOGIN FORM ───────────────────────────────────────────────
  const isStaff = mode === "staff";
  const accentColor = isStaff ? "var(--navy)" : "var(--green)";

  return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font)", display: "flex" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Narrow left accent */}
      <div style={{ width: "5px", background: isStaff ? "var(--navy)" : "var(--green)", flexShrink: 0 }} />

      <div style={{ flex: 1, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>

          {/* Back */}
          <button onClick={() => { setMode(null); setError(""); setEmail(""); setPassword(""); }}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", fontFamily: "var(--font)", marginBottom: "32px", padding: 0 }}>
            ← Back to home
          </button>

          <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "36px", boxShadow: "var(--shadow-md)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "28px", paddingBottom: "24px", borderBottom: "1px solid var(--border)" }}>
<div style={{
              width: "44px", height: "44px", borderRadius: "12px",
              background: isStaff ? "#EEF0F8" : "var(--green-light)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
            }}>{isStaff ? "🏥" : "🛒"}</div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {isStaff ? "Staff Login" : "Patient Login"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {isStaff ? "Sign in with your hospital credentials" : "Sign in to browse medicines"}
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: "16px" }}>
                <label className="label">Email address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={isStaff ? "pharmacist@hospital.com" : "customer@gmail.com"} className="input" />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label className="label">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="input" />
              </div>

              {error && (
                <div className="alert alert-red" style={{ marginBottom: "16px" }}>
                  <span>⚠</span> {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-full btn-lg" style={{ background: loading ? "var(--border)" : accentColor, color: "white", fontSize: "14px" }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Demo accounts */}
            <div style={{ marginTop: "20px", padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "var(--text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>Demo accounts — click to fill</div>
              {isStaff ? [
                { label: "Pharmacist", email: "pharmacist@hospital.com", pass: "pharma123" },
                { label: "Store Manager", email: "manager@hospital.com", pass: "manager123" },
                { label: "Admin", email: "admin@hospital.com", pass: "admin123" },
              ].map(a => (
                <div key={a.label} onClick={() => { setEmail(a.email); setPassword(a.pass); }}
                  style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: "12px" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>{a.label}</span>
                  <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>{a.email}</span>
                </div>
              )) : (
                <div onClick={() => { setEmail("customer@gmail.com"); setPassword("customer123"); }}
                  style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", cursor: "pointer", fontSize: "12px" }}
                >
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>Customer</span>
                  <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>customer@gmail.com</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
