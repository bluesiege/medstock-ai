import { useEffect, useState } from "react";
import { getAllMedicines, getAllBatches } from "./db.js";

const card = { background: "white", borderRadius: "var(--radius-lg)", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #e8eaf0" };

export default function WasteAnalytics() {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [meds, bats] = await Promise.all([getAllMedicines(), getAllBatches()]);
      setMedicines(meds);
      setBatches(bats);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ padding: "60px", textAlign: "center", color: "var(--text-tertiary)" }}>
      <div style={{ fontSize: "28px", marginBottom: "var(--radius-md)" }}>⏳</div>
      Analysing waste data...
    </div>
  );

  const today = new Date();

  // Find expired batches with quantity remaining (actual waste)
  const expiredWithStock = batches.filter(b => {
    const expiry = b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
    return expiry < today && b.quantity > 0;
  });

  // Find batches expiring within 30 days (at-risk waste)
  const atRisk = batches.filter(b => {
    const expiry = b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
    const days = Math.ceil((expiry - today) / 86400000);
    return days > 0 && days <= 30 && b.quantity > 0;
  });

  // Calculate waste value per medicine
  const wasteByMed = {};
  expiredWithStock.forEach(b => {
    const med = medicines.find(m => m.id === b.medicineId);
    const name = med?.name || b.medicineId;
    if (!wasteByMed[name]) wasteByMed[name] = { value: 0, units: 0, category: med?.category || "Unknown" };
    wasteByMed[name].value += b.quantity * (b.unitPrice || 0);
    wasteByMed[name].units += b.quantity;
  });

  // At-risk value
  const atRiskByMed = {};
  atRisk.forEach(b => {
    const med = medicines.find(m => m.id === b.medicineId);
    const name = med?.name || b.medicineId;
    if (!atRiskByMed[name]) atRiskByMed[name] = { value: 0, units: 0 };
    atRiskByMed[name].value += b.quantity * (b.unitPrice || 0);
    atRiskByMed[name].units += b.quantity;
  });

  const totalWasteValue = Object.values(wasteByMed).reduce((s, v) => s + v.value, 0);
  const totalAtRiskValue = Object.values(atRiskByMed).reduce((s, v) => s + v.value, 0);
  const totalWasteUnits = Object.values(wasteByMed).reduce((s, v) => s + v.units, 0);

  // By category
  const byCategory = {};
  Object.values(wasteByMed).forEach(v => {
    if (!byCategory[v.category]) byCategory[v.category] = 0;
    byCategory[v.category] += v.value;
  });


  return (
    <div>
      <h2 className="page-title">Waste Analytics</h2>
      <p className="page-subtitle">Tracks expired stock with remaining quantity and at-risk medicines expiring within 30 days</p>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--radius-lg)", marginBottom: "24px" }}>
        {[
          { label: "Total waste value", value: `₹${totalWasteValue.toLocaleString()}`, color: "var(--red)", bg: "#fef2f2", border: "#fecaca" },
          { label: "Waste units (expired)", value: totalWasteUnits, color: "var(--red)", bg: "#fef2f2", border: "#fecaca" },
          { label: "At-risk value (30d)", value: `₹${totalAtRiskValue.toLocaleString()}`, color: "var(--amber)", bg: "#fffbeb", border: "#fde68a" },
          { label: "Medicines with waste", value: Object.keys(wasteByMed).length, color: "var(--navy)", bg: "#eff6ff", border: "#bfdbfe" },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: "18px 20px", background: s.bg, border: `1px solid ${s.border}` }}>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "500", marginBottom: "var(--radius-sm)" }}>{s.label}</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {totalWasteValue === 0 && totalAtRiskValue === 0 && (
        <div className="card" style={{ padding: "60px", textAlign: "center", color: "var(--text-tertiary)" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--green)", marginBottom: "6px" }}>No waste detected</div>
          <div style={{ fontSize: "13px" }}>All medicines are within expiry and no expired stock with remaining quantity found.</div>
        </div>
      )}

      {/* Detailed waste table */}
      {Object.keys(wasteByMed).length > 0 && (
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: "var(--radius-lg)", fontWeight: "700", color: "var(--text-primary)" }}>Detailed waste breakdown</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                {["Medicine", "Category", "Wasted Units", "Waste Value", "Action"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "var(--text-secondary)", fontSize: "var(--radius-md)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(wasteByMed).sort((a, b) => b[1].value - a[1].value).map(([name, v], i) => (
                <tr key={name} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "var(--bg-subtle)" }}>
                  <td style={{ padding: "11px 16px", fontWeight: "500", color: "var(--text-primary)" }}>{name}</td>
                  <td style={{ padding: "11px 16px", color: "var(--text-secondary)" }}>{v.category}</td>
                  <td style={{ padding: "11px 16px", fontWeight: "700", color: "var(--red)" }}>{v.units} units</td>
                  <td style={{ padding: "11px 16px", fontWeight: "700", color: "var(--red)" }}>₹{v.value.toLocaleString()}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "#fee2e2", color: "var(--red)", fontWeight: "600" }}>
                      Remove expired batch
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
