import { useEffect, useState } from "react";
import { db } from "./firebase.js";
import { collection, getDocs } from "firebase/firestore";
import { getAllMedicines } from "./db.js";

const card = { background: "white", borderRadius: "var(--radius-lg)", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #e8eaf0" };

export default function ActivityLog() {
  const [log, setLog] = useState([]);
  const [medicines, setMedicines] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    async function load() {
      const meds = await getAllMedicines();
      const medMap = {};
      meds.forEach(m => { medMap[m.id] = m.name; });
      setMedicines(medMap);
      const [dispSnap, recSnap] = await Promise.all([getDocs(collection(db, "dispense_log")), getDocs(collection(db, "receive_log"))]);
      const combined = [
        ...dispSnap.docs.map(d => ({ id: d.id, ...d.data(), logType: "dispensed", medicineName: medMap[d.data().medicineId] || d.data().medicineId, timestamp: d.data().dispensedAt })),
        ...recSnap.docs.map(d => ({ id: d.id, ...d.data(), logType: d.data().type === "new_medicine" ? "new_medicine" : "received", timestamp: d.data().receivedAt })),
      ].sort((a, b) => {
        const at = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bt = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bt - at;
      });
      setLog(combined);
      setLoading(false);
    }
    load();
  }, []);

  function inRange(entry) {
    if (dateRange === "all") return true;
    const ts = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
    const now = new Date();
    if (dateRange === "today") return ts.toDateString() === now.toDateString();
    if (dateRange === "week") { const w = new Date(); w.setDate(now.getDate() - 7); return ts >= w; }
    if (dateRange === "month") { const m = new Date(); m.setDate(now.getDate() - 30); return ts >= m; }
    return true;
  }

  const filtered = log.filter(e => {
    const matchType = filter === "all" || (filter === "dispensed" && e.logType === "dispensed") || (filter === "received" && e.logType !== "dispensed");
    const matchSearch = e.medicineName?.toLowerCase().includes(search.toLowerCase()) || e.batchNo?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch && inRange(e);
  });

  const totalOut = log.filter(e => e.logType === "dispensed").reduce((s, e) => s + (e.quantityDispensed || 0), 0);
  const totalIn = log.filter(e => e.logType !== "dispensed").reduce((s, e) => s + (e.quantityReceived || 0), 0);
  const today = new Date();
  const todayIn = log.filter(e => e.logType !== "dispensed" && (e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp)).toDateString() === today.toDateString()).reduce((s, e) => s + (e.quantityReceived || 0), 0);
  const todayOut = log.filter(e => e.logType === "dispensed" && (e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.timestamp)).toDateString() === today.toDateString()).reduce((s, e) => s + (e.quantityDispensed || 0), 0);

  function badge(logType) {
    if (logType === "dispensed") return { label: "Dispensed", bg: "#fee2e2", color: "var(--red)" };
    if (logType === "new_medicine") return { label: "New medicine", bg: "#f3e8ff", color: "var(--teal)" };
    return { label: "Restocked", bg: "#dcfce7", color: "var(--green)" };
  }

  return (
    <div>
      <h2 className="page-title">Activity Log</h2>
      <p className="page-subtitle">Complete audit trail of all stock movements</p>

      {/* STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--radius-lg)", marginBottom: "var(--radius-xl)" }}>
        {[
          { label: "Total transactions", value: log.length, bg: "#eff6ff", border: "#bfdbfe", color: "var(--navy)" },
          { label: `Dispenses (${log.filter(e => e.logType === "dispensed").length})`, value: `${totalOut} units`, bg: "#fef2f2", border: "#fecaca", color: "var(--red)" },
          { label: `Receipts (${log.filter(e => e.logType !== "dispensed").length})`, value: `${totalIn} units`, bg: "#f0fdf4", border: "#bbf7d0", color: "var(--green)" },
          { label: "Today's net movement", value: `+${todayIn} / -${todayOut}`, bg: "var(--bg-subtle)", border: "var(--border)", color: "var(--text-primary)" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: "var(--radius-lg)", padding: "16px 18px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "500", marginBottom: "var(--radius-sm)" }}>{s.label}</div>
            <div style={{ fontSize: "var(--radius-xl)", fontWeight: "800", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: "var(--radius-lg)", display: "flex", gap: "var(--radius-md)", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", background: "var(--bg-hover)", borderRadius: "var(--radius-md)", padding: "3px", gap: "2px" }}>
          {[{ id: "all", label: "All" }, { id: "dispensed", label: "Dispensed" }, { id: "received", label: "Received" }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: "6px 14px", border: "none", borderRadius: "var(--radius-sm)",
              background: filter === f.id ? "white" : "transparent",
              color: filter === f.id ? "var(--navy)" : "var(--text-secondary)",
              fontWeight: filter === f.id ? "700" : "400",
              cursor: "pointer", fontSize: "var(--radius-md)", fontFamily: "var(--font)",
              boxShadow: filter === f.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", background: "var(--bg-hover)", borderRadius: "var(--radius-md)", padding: "3px", gap: "2px" }}>
          {[{ id: "today", label: "Today" }, { id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "all", label: "All time" }].map(f => (
            <button key={f.id} onClick={() => setDateRange(f.id)} style={{
              padding: "6px 12px", border: "none", borderRadius: "var(--radius-sm)",
              background: dateRange === f.id ? "white" : "transparent",
              color: dateRange === f.id ? "var(--navy)" : "var(--text-secondary)",
              fontWeight: dateRange === f.id ? "700" : "400",
              cursor: "pointer", fontSize: "var(--radius-md)", fontFamily: "var(--font)",
              boxShadow: dateRange === f.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}>{f.label}</button>
          ))}
        </div>

        <input type="text" placeholder="Search medicine or batch..." value={search} onChange={e => setSearch(e.target.value)} style={{
          flex: 1, minWidth: "180px", padding: "8px 14px", borderRadius: "var(--radius-md)",
          border: "1.5px solid #e5e7eb", fontSize: "13px", fontFamily: "var(--font)",
          outline: "none", background: "var(--bg-subtle)"
        }} />
      </div>

      {/* TABLE */}
      <div style={{ ...card, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: "28px", marginBottom: "var(--radius-md)" }}>⏳</div>
            <div style={{ fontSize: "var(--radius-lg)" }}>Loading activity log...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--text-tertiary)" }}>
            <div style={{ fontSize: "28px", marginBottom: "var(--radius-md)" }}>📋</div>
            <div style={{ fontSize: "var(--radius-lg)" }}>No activity found for this filter.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                {["Type", "Medicine", "Batch", "Quantity", "Performed By", "Date & Time"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontWeight: "600", color: "var(--text-secondary)", fontSize: "var(--radius-md)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const ts = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
                const b = badge(entry.logType);
                const qty = entry.logType === "dispensed" ? `-${entry.quantityDispensed}` : `+${entry.quantityReceived}`;
                const qtyColor = entry.logType === "dispensed" ? "var(--red)" : "var(--green)";
                return (
                  <tr key={entry.id + entry.logType} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "var(--bg-subtle)" }}>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ background: b.bg, color: b.color, padding: "3px 10px", borderRadius: "var(--radius-xl)", fontSize: "11px", fontWeight: "600" }}>{b.label}</span>
                    </td>
                    <td style={{ padding: "11px 16px", fontWeight: "600", color: "var(--text-primary)" }}>{entry.medicineName}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text-secondary)" }}>{entry.batchNo}</td>
                    <td style={{ padding: "11px 16px", fontWeight: "700", color: qtyColor }}>{qty} units</td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ fontSize: "var(--radius-md)", fontWeight: "500", color: "var(--text-primary)" }}>
                        {entry.logType === "dispensed" ? (entry.dispensedBy || "—") : (entry.receivedBy || "—")}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {entry.logType === "dispensed" ? (entry.dispensedByRole || "") : (entry.receivedByRole || "")}
                      </div>
                    </td>
                    <td style={{ padding: "11px 16px", color: "var(--text-secondary)", fontSize: "var(--radius-md)" }}>
                      {ts.toLocaleDateString("en-IN")} · {ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
