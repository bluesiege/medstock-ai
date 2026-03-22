import React, { useEffect, useState } from "react";
import { getAllMedicines, getAllBatches, getAlerts } from "./db.js";
import { generateReport } from "./PDFReport.js";

function CollapsibleAlerts({ alerts, alertColors, alertIcon }) {
  const [collapsed, setCollapsed] = React.useState({});
  const groups = [
    { key: "urgent", label: "Urgent", items: alerts.filter(a => a.severity === "urgent") },
    { key: "warning", label: "Warnings", items: alerts.filter(a => a.severity === "warning") },
    { key: "reminder", label: "Reminders", items: alerts.filter(a => a.severity === "reminder") },
  ].filter(g => g.items.length > 0);

  function toggle(key) {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {groups.map(group => {
        const sample = group.items[0];
        const col = alertColors(sample.severity);
        const isCollapsed = collapsed[group.key];
        return (
          <div key={group.key} style={{ border: `1px solid ${col.border}`, borderRadius: "12px", overflow: "hidden" }}>
            <button
              onClick={() => toggle(group.key)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                padding: "11px 14px", background: col.bg, border: "none",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left"
              }}
            >
              <span style={{ fontSize: "14px" }}>{alertIcon(sample.severity)}</span>
              <span style={{ flex: 1, fontSize: "13px", fontWeight: "600", color: col.text }}>
                {group.label} — {group.items.length} alert{group.items.length > 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: "12px", color: col.text, opacity: 0.7 }}>
                {isCollapsed ? "▶ Show" : "▼ Hide"}
              </span>
            </button>
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {group.items.map((a, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "9px 14px 9px 38px",
                    borderTop: `1px solid ${col.border}`,
                    background: "white"
                  }}>
                    <span style={{ flex: 1, fontSize: "13px", color: "#374151" }}>
                      <strong style={{ color: col.text }}>{a.label}:</strong> {a.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
import ForecastChart from "./ForecastChart.jsx";

const card = { background: "white", borderRadius: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #e8eaf0" };

export default function Dashboard({ role }) {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [selectedMed, setSelectedMed] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dispenseLog, setDispenseLog] = useState([]);
  const [alertTab, setAlertTab] = useState("all");
  const [stockSearch, setStockSearch] = useState("");

  useEffect(() => {
    async function load() {
      setDataLoading(true);
      const { getDispenseLog } = await import("./db.js");
      const [meds, bats, alts, logs] = await Promise.all([getAllMedicines(), getAllBatches(), getAlerts(), getDispenseLog()]);
      setMedicines(meds); setBatches(bats); setAlerts(alts); setDispenseLog(logs);
      setDataLoading(false);
    }
    load();
  }, []);

  function getStock(id) { return batches.filter(b => b.medicineId === id).reduce((s, b) => s + b.quantity, 0); }

  function getNearestExpiry(id) {
    const dates = batches.filter(b => b.medicineId === id && b.quantity > 0)
      .map(b => b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate))
      .sort((a, b) => a - b);
    return dates[0] || null;
  }

  function daysUntil(date) { return date ? Math.ceil((date - new Date()) / 86400000) : null; }

  function getDaysOfStock(medId) {
    const stock = getStock(medId);
    if (stock === 0) return 0;
    // Average daily consumption from last 30 days of logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLogs = dispenseLog.filter(l => {
      const t = l.dispensedAt?.toDate ? l.dispensedAt.toDate() : new Date(l.dispensedAt);
      return l.medicineId === medId && t >= thirtyDaysAgo;
    });
    const totalDispensed = recentLogs.reduce((s, l) => s + (l.quantityDispensed || 0), 0);
    const avgDaily = totalDispensed / 30;
    if (avgDaily === 0) return null; // No recent consumption data
    return Math.floor(stock / avgDaily);
  }

  async function fetchForecast() {
    if (!selectedMed) return alert("Select a medicine first.");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/forecast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ drug_name: selectedMed }) });
      setForecast(await res.json());
    } catch { alert("ML server not running. Ask Khushvi to start it."); }
    setLoading(false);
  }

  const totalValue = batches.reduce((s, b) => s + (b.quantity * (b.unitPrice || 0)), 0);
  const stockAlerts = alerts.filter(a => a.type === "lowstock");
  const expiryAlerts = alerts.filter(a => a.type === "expiry");
  const shownAlerts = alertTab === "all" ? alerts : alertTab === "stock" ? stockAlerts : expiryAlerts;

  function alertColors(severity) {
    if (severity === "urgent") return { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", badge: "#fee2e2" };
    if (severity === "warning") return { bg: "#fffbeb", border: "#fde68a", text: "#d97706", badge: "#fef3c7" };
    return { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb", badge: "#dbeafe" };
  }

  function alertIcon(severity) { return severity === "urgent" ? "🔴" : severity === "warning" ? "🟡" : "🔵"; }

  function daysColor(d) { return d === null ? "#9ca3af" : d <= 7 ? "#dc2626" : d <= 14 ? "#d97706" : d <= 21 ? "#2563eb" : "#16a34a"; }

  if (dataLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px", color: "#9ca3af" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
        <div style={{ fontSize: "14px" }}>Loading dashboard...</div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="page-title">{role === "admin" ? "Admin Dashboard" : "Store Manager Dashboard"}</h2>
      <p className="page-subtitle">Real-time inventory overview and alerts</p>

      {/* STAT CARDS — admin only */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {role === "manager" && [
          { label: "Total Inventory Value", value: `₹${totalValue.toLocaleString()}`, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Active Alerts", value: alerts.length, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
          { label: "Medicines Tracked", value: medicines.length, color: "#1a237e", bg: "#eff6ff", border: "#bfdbfe" },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: "20px 24px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "8px" }}>{s.label}</div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: s.color }}>{s.value}</div>
          </div>
        ))}
        {role === "admin" && [
          { label: "Active Sessions", value: "3 users", color: "#1a237e", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "Medicines Tracked", value: medicines.length, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Active Alerts", value: alerts.length, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: "20px 24px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500", marginBottom: "8px" }}>{s.label}</div>
            <div style={{ fontSize: "26px", fontWeight: "800", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div style={{ ...card, padding: "20px 24px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#111827" }}>Active Alerts</div>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                {alerts.filter(a => a.severity === "urgent").length} urgent · {alerts.filter(a => a.severity === "warning").length} warnings · {alerts.filter(a => a.severity === "reminder").length} reminders
              </div>
            </div>
            <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
              {[{ id: "all", label: `All (${alerts.length})` }, { id: "stock", label: `Stock (${stockAlerts.length})` }, { id: "expiry", label: `Expiry (${expiryAlerts.length})` }].map((t, i, arr) => (
                <button key={t.id} onClick={() => setAlertTab(t.id)} style={{
                  padding: "6px 14px", border: "none",
                  borderRight: i < arr.length - 1 ? "1px solid #e5e7eb" : "none",
                  background: alertTab === t.id ? "#1a237e" : "white",
                  color: alertTab === t.id ? "white" : "#6b7280",
                  fontWeight: alertTab === t.id ? "700" : "400",
                  cursor: "pointer", fontSize: "12px", fontFamily: "inherit"
                }}>{t.label}</button>
              ))}
            </div>
          </div>
          <CollapsibleAlerts alerts={shownAlerts} alertColors={alertColors} alertIcon={alertIcon} />
        </div>
      )}

      {/* STOCK TABLE */}
      <div className="card" style={{ marginBottom: "20px", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", flex: 1 }}>Current Stock</div>
          <input
            type="text"
            placeholder="Search medicines..."
            value={stockSearch}
            onChange={e => setStockSearch(e.target.value)}
className="input" style={{ width: "220px" }}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {["Medicine", "Category", "Unit Price", "Total Stock", "Days of Stock", "Nearest Expiry", "Expiry In", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "#6b7280", fontSize: "12px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {medicines.filter(m => !stockSearch || m.name?.toLowerCase().includes(stockSearch.toLowerCase()) || m.category?.toLowerCase().includes(stockSearch.toLowerCase())).map((m, idx) => {
              const stock = getStock(m.id);
              const expiry = getNearestExpiry(m.id);
              const days = daysUntil(expiry);
              const isUrgent = stock < m.threshold * 0.5;
              const isLow = stock < m.threshold;
              const rowBg = idx % 2 === 0 ? "white" : "#fafafa";
              const statusLabel = stock === 0 ? "Out of stock" : isUrgent ? "Critical" : isLow ? "Low stock" : "OK";
              const statusStyle = stock === 0 || isUrgent
                ? { bg: "#fee2e2", color: "#dc2626" }
                : isLow ? { bg: "#fef3c7", color: "#d97706" }
                : { bg: "#dcfce7", color: "#16a34a" };
              return (
                <tr key={m.id} style={{ background: rowBg, borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "11px 16px", fontWeight: "600", color: "#111827" }}>{m.name}</td>
                  <td style={{ padding: "11px 16px", color: "#6b7280" }}>{m.category}</td>
                  <td style={{ padding: "11px 16px", color: "#374151", fontWeight: "500" }}>
                    {(() => {
                      const medBatches = batches.filter(b => b.medicineId === m.id && b.quantity > 0);
                      const price = medBatches.length > 0 ? medBatches[0].unitPrice : null;
                      return price ? `₹${price}` : "—";
                    })()}
                  </td>
                  <td style={{ padding: "11px 16px" }}>{stock} {m.unit}s</td>
                  <td style={{ padding: "11px 16px", color: "#6b7280", fontSize: "12px" }}>{expiry ? expiry.toDateString() : "N/A"}</td>
                  <td style={{ padding: "11px 16px", fontWeight: "700", color: daysColor(days) }}>{days !== null ? `${days}d` : "—"}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: statusStyle.bg, color: statusStyle.color }}>{statusLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ADMIN: export */}
      {role === "manager" && (
        <div className="card" style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "#111827" }}>Export Report</div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Download full inventory and alerts as PDF</div>
          </div>
          <button onClick={() => generateReport(medicines, batches, alerts)} style={{
            padding: "10px 24px", background: "linear-gradient(135deg, #1a237e, #283593)", color: "white",
            border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer",
            fontSize: "13px", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(26,35,126,0.25)"
          }}>Export PDF Report</button>
        </div>
      )}

      {/* ML FORECAST */}
      <div className="card card-accent">
        <div style={{ fontSize: "15px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>ML Demand Forecast</div>
        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
          AI-powered 30-day demand prediction — automatically selects best algorithm from Linear Regression, Polynomial Regression, Random Forest, and Gradient Boosting
        </div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
          <select value={selectedMed} onChange={e => setSelectedMed(e.target.value)} style={{
            flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb",
            fontSize: "13px", fontFamily: "inherit", background: "#fafafa", cursor: "pointer", color: "#111827"
          }}>
            <option value="">— Select a medicine —</option>
            {medicines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
          <button onClick={fetchForecast} disabled={loading} style={{
            padding: "10px 22px", background: loading ? "#d1d5db" : "linear-gradient(135deg, #1a237e, #283593)",
            color: "white", border: "none", borderRadius: "10px", fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "inherit",
            boxShadow: loading ? "none" : "0 4px 14px rgba(26,35,126,0.25)"
          }}>{loading ? "Analysing..." : "Get Forecast"}</button>
        </div>

        {forecast && (
          <div>
            {/* Summary cards */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              {[
                { label: "Predicted demand (30d)", value: forecast.predicted_demand_30d, color: "#1a237e", bg: "#eff6ff", border: "#bfdbfe" },
                { label: "Suggested reorder qty", value: forecast.suggested_reorder_qty, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
                { label: "Confidence", value: forecast.confidence.toUpperCase(),
                  color: forecast.confidence === "high" ? "#16a34a" : forecast.confidence === "medium" ? "#d97706" : "#dc2626",
                  bg: forecast.confidence === "high" ? "#f0fdf4" : forecast.confidence === "medium" ? "#fffbeb" : "#fef2f2",
                  border: forecast.confidence === "high" ? "#bbf7d0" : forecast.confidence === "medium" ? "#fde68a" : "#fecaca" },
                { label: "Best algorithm", value: forecast.best_algorithm?.split(" ")[0] || "—", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
              ].map((m, i) => (
                <div key={i} style={{ flex: 1, minWidth: "130px", background: m.bg, border: `1px solid ${m.border}`, borderRadius: "12px", padding: "12px 16px" }}>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", fontWeight: "500" }}>{m.label}</div>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Forecast chart */}
            <div style={{ marginBottom: "16px", border: "1px solid #e8eaf0", borderRadius: "12px", overflow: "hidden" }}>
              <ForecastChart
                history={forecast.history}
                predictions={forecast.daily_predictions}
                drugName={forecast.drug_name}
              />
            </div>

            {/* Algorithm comparison */}
            {forecast.algorithm_comparison && (
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "10px" }}>
                  Algorithm comparison — system auto-selected the best
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {forecast.algorithm_comparison.map((algo, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 14px", borderRadius: "10px",
                      background: algo.selected ? "#f0f4ff" : "#fafafa",
                      border: `1px solid ${algo.selected ? "#c7d2fe" : "#e5e7eb"}`
                    }}>
                      <div style={{ flex: 1, fontSize: "13px", fontWeight: algo.selected ? "600" : "400", color: algo.selected ? "#1a237e" : "#6b7280" }}>
                        {algo.name}
                        {algo.selected && <span style={{ marginLeft: "8px", fontSize: "10px", background: "#1a237e", color: "white", padding: "2px 7px", borderRadius: "6px" }}>SELECTED</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>R² = {algo.r2}</div>
                      <div style={{ width: "120px", height: "6px", background: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${Math.max(0, Math.min(100, algo.r2 * 100))}%`, height: "100%", background: algo.selected ? "#1a237e" : "#9ca3af", borderRadius: "3px" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {forecast.outliers_removed > 0 && (
                  <div style={{ marginTop: "10px", fontSize: "12px", color: "#6b7280", padding: "8px 12px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a" }}>
                    {forecast.outliers_removed} outlier data points removed before training using IQR method — improves model accuracy
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
