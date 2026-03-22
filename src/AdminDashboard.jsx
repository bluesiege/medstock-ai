import { useState, useEffect } from "react";
import {
  LayoutDashboard, Package, Brain, Settings, Search, Bell,
  AlertTriangle, TrendingUp, Zap, ChevronRight, Clock,
  Pill, Activity, ArrowUpRight, ArrowDownRight, ShieldAlert
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, ReferenceLine
} from "recharts";

const forecastData = [
  { day: "Mar 15", actual: 42, predicted: 44 },
  { day: "Mar 16", actual: 38, predicted: 41 },
  { day: "Mar 17", actual: 51, predicted: 49 },
  { day: "Mar 18", actual: 47, predicted: 50 },
  { day: "Mar 19", actual: 53, predicted: 52 },
  { day: "Mar 20", actual: 49, predicted: 54 },
  { day: "Mar 21", actual: 55, predicted: 57 },
  { day: "Mar 22", actual: null, predicted: 61 },
  { day: "Mar 23", actual: null, predicted: 64 },
  { day: "Mar 24", actual: null, predicted: 60 },
  { day: "Mar 25", actual: null, predicted: 66 },
];

const alerts = [
  { id: 1, type: "expiry", label: "URGENT", medicine: "Insulin INS-001", detail: "Expires in 6 days", color: "red" },
  { id: 2, type: "expiry", label: "WARNING", medicine: "Amlodipine AML-001", detail: "Expires in 10 days", color: "orange" },
  { id: 3, type: "stock", label: "CRITICAL", medicine: "Insulin", detail: "Only 8 vials — below threshold", color: "red" },
  { id: 4, type: "expiry", label: "WARNING", medicine: "Amoxicillin AMX-001", detail: "Expires in 12 days", color: "orange" },
  { id: 5, type: "stock", label: "LOW", medicine: "Amlodipine", detail: "4 strips remaining", color: "orange" },
];

const dispenseLog = [
  { id: 1, medicine: "Paracetamol", batch: "PAR-001", qty: 5, time: "2 min ago", status: "completed" },
  { id: 2, medicine: "Amoxicillin", batch: "AMX-002", qty: 12, time: "18 min ago", status: "completed" },
  { id: 3, medicine: "Insulin", batch: "INS-002", qty: 3, time: "1 hr ago", status: "completed" },
  { id: 4, medicine: "Metformin", batch: "MET-001", qty: 8, time: "3 hrs ago", status: "completed" },
];

const stats = [
  { label: "Total Stock Value", value: "₹2,84,650", change: "+12%", up: true, icon: TrendingUp },
  { label: "Units Dispensed Today", value: "147", change: "+8%", up: true, icon: Activity },
  { label: "Active Alerts", value: "5", change: "2 urgent", up: false, icon: ShieldAlert },
  { label: "ML Forecast Accuracy", value: "94.2%", change: "+1.3%", up: true, icon: Brain },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Package, label: "Inventory", active: false },
  { icon: Brain, label: "AI Forecasts", active: false },
  { icon: Settings, label: "Settings", active: false },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(15,23,42,0.95)", border: "1px solid rgba(99,102,241,0.3)",
        borderRadius: "12px", padding: "12px 16px", backdropFilter: "blur(12px)"
      }}>
        <p style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "6px", fontFamily: "monospace" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: "13px", fontWeight: "600", margin: "2px 0" }}>
            {p.name === "predicted" ? "AI Forecast" : "Actual"}: {p.value ?? "—"} units
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [time, setTime] = useState(new Date());
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [medicine, setMedicine] = useState("");
  const [qty, setQty] = useState("");
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const p = setInterval(() => setPulse(v => !v), 1200);
    return () => clearInterval(p);
  }, []);

  const timeStr = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = time.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{
      display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#060c1a", color: "#e2e8f0"
    }}>

      {/* ── SIDEBAR ─────────────────────────────────── */}
      <div style={{
        width: "72px", background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(20px)", borderRight: "1px solid rgba(99,102,241,0.15)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 0", gap: "8px", position: "sticky", top: 0, height: "100vh",
        flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{
          width: "40px", height: "40px", borderRadius: "12px", marginBottom: "24px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(99,102,241,0.5)"
        }}>
          <Pill size={20} color="white" />
        </div>

        {navItems.map(item => (
          <button
            key={item.label}
            onClick={() => setActiveNav(item.label)}
            title={item.label}
            style={{
              width: "44px", height: "44px", borderRadius: "12px", border: "none",
              background: activeNav === item.label
                ? "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))"
                : "transparent",
              color: activeNav === item.label ? "#818cf8" : "#475569",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: activeNav === item.label ? "0 0 12px rgba(99,102,241,0.2)" : "none",
              outline: activeNav === item.label ? "1px solid rgba(99,102,241,0.3)" : "none"
            }}
          >
            <item.icon size={20} />
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Avatar */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: "700", color: "white",
          boxShadow: "0 0 12px rgba(14,165,233,0.4)"
        }}>
          DS
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          padding: "16px 28px", borderBottom: "1px solid rgba(99,102,241,0.1)",
          background: "rgba(15,23,42,0.6)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 10
        }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.3px" }}>
              Medi<span style={{ color: "#818cf8" }}>Flow</span> AI
            </div>
            <div style={{ fontSize: "11px", color: "#475569", marginTop: "1px" }}>
              Government Hospital Pharmacy System
            </div>
          </div>

          {/* Search */}
          <div style={{
            flex: 1, maxWidth: "360px", marginLeft: "24px",
            display: "flex", alignItems: "center", gap: "10px",
            background: "rgba(30,41,59,0.8)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "10px", padding: "8px 14px"
          }}>
            <Search size={15} color="#475569" />
            <input placeholder="Search medicines, batches..." style={{
              background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: "13px", flex: 1
            }} />
          </div>

          <div style={{ flex: 1 }} />

          {/* Clock */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", fontFamily: "monospace", color: "#818cf8" }}>{timeStr}</div>
            <div style={{ fontSize: "11px", color: "#475569" }}>{dateStr}</div>
          </div>

          {/* Bell */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "10px",
              background: "rgba(30,41,59,0.8)", border: "1px solid rgba(99,102,241,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
            }}>
              <Bell size={16} color="#94a3b8" />
            </div>
            <div style={{
              position: "absolute", top: "-4px", right: "-4px",
              width: "16px", height: "16px", borderRadius: "50%",
              background: "#ef4444", fontSize: "9px", fontWeight: "700",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", border: "2px solid #060c1a"
            }}>5</div>
          </div>

          {/* Profile */}
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: "rgba(30,41,59,0.8)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "10px", padding: "6px 12px", cursor: "pointer"
          }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: "700", color: "white"
            }}>DS</div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: "600" }}>Dr. Smith</div>
              <div style={{ fontSize: "10px", color: "#6366f1" }}>Admin</div>
            </div>
          </div>
        </div>

        {/* ── CONTENT ──────────────────────────────────── */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* STAT CARDS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                background: "rgba(15,23,42,0.8)", border: "1px solid rgba(99,102,241,0.12)",
                borderRadius: "16px", padding: "18px 20px",
                backdropFilter: "blur(12px)", transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>{s.label}</div>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "8px",
                    background: "rgba(99,102,241,0.15)", display: "flex",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <s.icon size={15} color="#818cf8" />
                  </div>
                </div>
                <div style={{ fontSize: "22px", fontWeight: "700", marginBottom: "6px", letterSpacing: "-0.5px" }}>{s.value}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                  {s.up ? <ArrowUpRight size={12} color="#22c55e" /> : <ArrowDownRight size={12} color="#ef4444" />}
                  <span style={{ color: s.up ? "#22c55e" : "#f97316" }}>{s.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* BENTO GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gridTemplateRows: "auto auto", gap: "20px" }}>

            {/* WIDGET 1 — AI FORECAST CHART */}
            <div style={{
              background: "rgba(15,23,42,0.9)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "20px", padding: "24px", gridRow: "1",
              backdropFilter: "blur(16px)", position: "relative", overflow: "hidden"
            }}>
              {/* Glow bg */}
              <div style={{
                position: "absolute", top: "-60px", right: "-60px",
                width: "200px", height: "200px", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
                pointerEvents: "none"
              }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <div style={{
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      borderRadius: "6px", padding: "4px 10px", fontSize: "10px",
                      fontWeight: "700", color: "white", letterSpacing: "0.05em"
                    }}>AI POWERED</div>
                    <Zap size={14} color="#818cf8" />
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "700" }}>Demand Forecast — Amoxicillin</div>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>Linear regression · 94.2% accuracy · Next 4 days predicted</div>
                </div>
                <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "20px", height: "2px", background: "#38bdf8", borderRadius: "2px" }} />
                    <span style={{ color: "#64748b" }}>Actual</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "20px", height: "2px", background: "linear-gradient(90deg, #6366f1, #8b5cf6)", borderRadius: "2px" }} />
                    <span style={{ color: "#64748b" }}>AI Forecast</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                  <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x="Mar 21" stroke="rgba(99,102,241,0.4)" strokeDasharray="4 4" label={{ value: "Today", fill: "#818cf8", fontSize: 11 }} />
                  <Area type="monotone" dataKey="actual" stroke="#38bdf8" strokeWidth={2.5} fill="url(#actualGrad)" dot={false} connectNulls={false} name="actual" />
                  <Area type="monotone" dataKey="predicted" stroke="url(#predLineGrad)" strokeWidth={2.5} fill="url(#predGrad)" dot={false} strokeDasharray="0" name="predicted" filter="url(#glow)"
                    style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.8))" }} />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                {[
                  { label: "Predicted 30d demand", value: "1,847 units", color: "#818cf8" },
                  { label: "Suggested reorder", value: "2,032 units", color: "#22c55e" },
                  { label: "Confidence", value: "HIGH", color: "#818cf8" },
                ].map((m, i) => (
                  <div key={i} style={{
                    flex: 1, background: "rgba(30,41,59,0.6)", borderRadius: "10px",
                    padding: "10px 14px", border: "1px solid rgba(99,102,241,0.1)"
                  }}>
                    <div style={{ fontSize: "10px", color: "#475569", marginBottom: "4px" }}>{m.label}</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* WIDGET 2 — CRITICAL ALERTS */}
            <div style={{
              background: "rgba(15,23,42,0.9)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "20px", padding: "22px", gridRow: "1",
              backdropFilter: "blur(16px)", overflow: "hidden", position: "relative"
            }}>
              <div style={{
                position: "absolute", top: "-40px", right: "-40px", width: "120px", height: "120px",
                borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)",
                pointerEvents: "none"
              }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444",
                    boxShadow: `0 0 ${pulse ? "8px" : "3px"} #ef4444`, transition: "box-shadow 0.6s"
                  }} />
                  <span style={{ fontSize: "15px", fontWeight: "700" }}>Critical Alerts</span>
                </div>
                <div style={{
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "20px", padding: "3px 10px", fontSize: "11px",
                  fontWeight: "700", color: "#ef4444"
                }}>{alerts.length} active</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {alerts.map(a => (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    background: a.color === "red" ? "rgba(239,68,68,0.07)" : "rgba(249,115,22,0.07)",
                    border: `1px solid ${a.color === "red" ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)"}`,
                    borderRadius: "10px", padding: "10px 12px", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateX(3px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}
                  >
                    <AlertTriangle size={14} color={a.color === "red" ? "#ef4444" : "#f97316"} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.medicine}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{a.detail}</div>
                    </div>
                    <div style={{
                      fontSize: "9px", fontWeight: "800", letterSpacing: "0.05em",
                      padding: "2px 7px", borderRadius: "6px", flexShrink: 0,
                      background: a.color === "red" ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)",
                      color: a.color === "red" ? "#ef4444" : "#f97316",
                      border: `1px solid ${a.color === "red" ? "rgba(239,68,68,0.3)" : "rgba(249,115,22,0.3)"}`
                    }}>{a.label}</div>
                  </div>
                ))}
              </div>

              <button style={{
                width: "100%", marginTop: "14px", padding: "9px",
                background: "rgba(30,41,59,0.6)", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "10px", color: "#818cf8", fontSize: "12px", fontWeight: "600",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}>
                View all alerts <ChevronRight size={13} />
              </button>
            </div>

            {/* WIDGET 3 — QUICK DISPENSE */}
            <div style={{
              background: "rgba(15,23,42,0.9)", border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: "20px", padding: "22px", backdropFilter: "blur(16px)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Zap size={14} color="#818cf8" />
                </div>
                <span style={{ fontSize: "15px", fontWeight: "700" }}>Quick Dispense</span>
                <div style={{
                  marginLeft: "auto", fontSize: "10px", color: "#22c55e",
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "6px", padding: "2px 8px", fontWeight: "600"
                }}>FEFO AUTO</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                {/* Medicine select */}
                <div style={{ position: "relative" }}>
                  <label style={{
                    position: "absolute", top: medicine ? "-8px" : "12px", left: "12px",
                    fontSize: medicine ? "10px" : "13px", color: medicine ? "#818cf8" : "#475569",
                    transition: "all 0.2s", pointerEvents: "none", fontWeight: "500",
                    background: medicine ? "rgba(15,23,42,1)" : "transparent", padding: "0 4px",
                    zIndex: 1
                  }}>Medicine</label>
                  <select
                    value={medicine}
                    onChange={e => setMedicine(e.target.value)}
                    style={{
                      width: "100%", padding: "12px", paddingTop: medicine ? "16px" : "12px",
                      background: "rgba(30,41,59,0.8)", border: "1px solid rgba(99,102,241,0.2)",
                      borderRadius: "10px", color: medicine ? "#e2e8f0" : "transparent",
                      fontSize: "13px", outline: "none", cursor: "pointer", boxSizing: "border-box"
                    }}
                  >
                    <option value="">Select...</option>
                    <option value="insulin">Insulin</option>
                    <option value="amoxicillin">Amoxicillin</option>
                    <option value="paracetamol">Paracetamol</option>
                    <option value="metformin">Metformin</option>
                    <option value="amlodipine">Amlodipine</option>
                  </select>
                </div>

                {/* Quantity input */}
                <div style={{ position: "relative" }}>
                  <label style={{
                    position: "absolute", top: qty ? "-8px" : "12px", left: "12px",
                    fontSize: qty ? "10px" : "13px", color: qty ? "#818cf8" : "#475569",
                    transition: "all 0.2s", pointerEvents: "none", fontWeight: "500",
                    background: qty ? "rgba(15,23,42,1)" : "transparent", padding: "0 4px"
                  }}>Quantity</label>
                  <input
                    type="number" min="1"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    style={{
                      width: "100%", padding: "12px",
                      background: "rgba(30,41,59,0.8)", border: "1px solid rgba(99,102,241,0.2)",
                      borderRadius: "10px", color: "#e2e8f0", fontSize: "13px",
                      outline: "none", boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {medicine && (
                <div style={{
                  background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: "10px", padding: "10px 14px", marginBottom: "12px",
                  fontSize: "12px", color: "#818cf8", display: "flex", alignItems: "center", gap: "8px"
                }}>
                  <Brain size={13} />
                  FEFO: Earliest expiring batch will be dispensed first automatically
                </div>
              )}

              <button style={{
                width: "100%", padding: "13px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: "12px", color: "white",
                fontSize: "14px", fontWeight: "700", cursor: "pointer",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                transition: "all 0.2s", letterSpacing: "0.02em"
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.4)"; }}
              >
                <Zap size={16} /> Confirm Dispense
              </button>
            </div>

            {/* WIDGET 4 — DISPENSE LOG */}
            <div style={{
              background: "rgba(15,23,42,0.9)", border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: "20px", padding: "22px", backdropFilter: "blur(16px)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "8px",
                    background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Activity size={14} color="#22c55e" />
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: "700" }}>Live Dispense Log</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{
                    width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e",
                    boxShadow: `0 0 ${pulse ? "6px" : "2px"} #22c55e`, transition: "box-shadow 0.6s"
                  }} />
                  <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "500" }}>Live</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {dispenseLog.map((entry, i) => (
                  <div key={entry.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 12px", borderRadius: "10px",
                    background: i === 0 ? "rgba(99,102,241,0.07)" : "rgba(30,41,59,0.4)",
                    border: i === 0 ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                    transition: "all 0.2s"
                  }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                      background: "rgba(99,102,241,0.15)", display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: "10px",
                      fontWeight: "700", color: "#818cf8"
                    }}>
                      {entry.medicine.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "1px" }}>{entry.medicine}</div>
                      <div style={{ fontSize: "11px", color: "#475569" }}>{entry.batch}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#ef4444", marginBottom: "2px" }}>-{entry.qty} units</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px", justifyContent: "flex-end" }}>
                        <Clock size={9} color="#475569" />
                        <span style={{ fontSize: "10px", color: "#475569" }}>{entry.time}</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: "9px", fontWeight: "700", padding: "3px 8px",
                      borderRadius: "6px", background: "rgba(34,197,94,0.15)",
                      color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)",
                      letterSpacing: "0.05em", flexShrink: 0
                    }}>DONE</div>
                  </div>
                ))}
              </div>

              <button style={{
                width: "100%", marginTop: "14px", padding: "9px",
                background: "rgba(30,41,59,0.6)", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "10px", color: "#818cf8", fontSize: "12px", fontWeight: "600",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}>
                View full activity log <ChevronRight size={13} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
