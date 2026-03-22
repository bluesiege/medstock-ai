import { useEffect, useState } from "react";
import { getAllMedicines, getAllBatches } from "./db.js";
import { db } from "./firebase.js";
import { doc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";

const card = { background: "white", borderRadius: "var(--radius-lg)", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #e8eaf0" };
const inputStyle = { width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1.5px solid #e5e7eb", fontSize: "13px", fontFamily: "var(--font)", background: "var(--bg-subtle)", color: "var(--text-primary)", boxSizing: "border-box", colorScheme: "light" };
const btnPrimary = { padding: "8px 18px", background: "linear-gradient(135deg, #1a237e, #283593)", color: "white", border: "none", borderRadius: "var(--radius-sm)", fontWeight: "600", cursor: "pointer", fontSize: "13px", fontFamily: "var(--font)" };
const btnDanger = { padding: "8px 18px", background: "#fef2f2", color: "var(--red)", border: "1px solid #fecaca", borderRadius: "var(--radius-sm)", fontWeight: "600", cursor: "pointer", fontSize: "13px", fontFamily: "var(--font)" };
const btnGray = { padding: "8px 18px", background: "var(--bg-hover)", color: "var(--text-primary)", border: "none", borderRadius: "var(--radius-sm)", fontWeight: "600", cursor: "pointer", fontSize: "13px", fontFamily: "var(--font)" };

export default function EditDatabase() {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState("");
  const [editingMed, setEditingMed] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const [selectedMedId, setSelectedMedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("medicines");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [meds, bats] = await Promise.all([getAllMedicines(), getAllBatches()]);
    setMedicines(meds);
    setBatches(bats);
    setLoading(false);
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // ── MEDICINE EDIT ────────────────────────────────────────
  async function saveMedicine() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "medicines", editingMed.id), {
        name: editingMed.name,
        category: editingMed.category,
        unit: editingMed.unit,
        threshold: Number(editingMed.threshold),
      });
      setMedicines(prev => prev.map(m => m.id === editingMed.id ? editingMed : m));
      setEditingMed(null);
      showMessage("success", "Medicine updated successfully.");
    } catch { showMessage("error", "Failed to update. Try again."); }
    setSaving(false);
  }

  // ── MEDICINE DELETE ──────────────────────────────────────
  async function deleteMedicine(medId) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, "medicines", medId));
      // Delete all batches for this medicine
      const medBatches = batches.filter(b => b.medicineId === medId);
      await Promise.all(medBatches.map(b => deleteDoc(doc(db, "batches", b.id))));
      setMedicines(prev => prev.filter(m => m.id !== medId));
      setBatches(prev => prev.filter(b => b.medicineId !== medId));
      setConfirmDelete(null);
      setSelectedMedId(null);
      showMessage("success", "Medicine and all its batches deleted.");
    } catch { showMessage("error", "Failed to delete. Try again."); }
    setSaving(false);
  }

  // ── BATCH EDIT ───────────────────────────────────────────
  async function saveBatch() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "batches", editingBatch.id), {
        quantity: Number(editingBatch.quantity),
        unitPrice: Number(editingBatch.unitPrice),
        expiryDate: new Date(editingBatch.expiryDateStr),
      });
      setBatches(prev => prev.map(b => b.id === editingBatch.id ? {
        ...b,
        quantity: Number(editingBatch.quantity),
        unitPrice: Number(editingBatch.unitPrice),
        expiryDate: { toDate: () => new Date(editingBatch.expiryDateStr) }
      } : b));
      setEditingBatch(null);
      showMessage("success", "Batch updated successfully.");
    } catch { showMessage("error", "Failed to update batch."); }
    setSaving(false);
  }

  // ── BATCH DELETE ─────────────────────────────────────────
  async function deleteBatch(batchId) {
    setSaving(true);
    try {
      await deleteDoc(doc(db, "batches", batchId));
      setBatches(prev => prev.filter(b => b.id !== batchId));
      setConfirmDelete(null);
      showMessage("success", "Batch deleted.");
    } catch { showMessage("error", "Failed to delete batch."); }
    setSaving(false);
  }

  const filtered = medicines.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMedBatches = batches.filter(b => b.medicineId === selectedMedId);
  const selectedMed = medicines.find(m => m.id === selectedMedId);

  function formatExpiry(expiryDate) {
    if (!expiryDate) return "";
    const d = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    return d.toISOString().split("T")[0];
  }

  function daysLeft(expiryDate) {
    const d = expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate);
    return Math.ceil((d - new Date()) / 86400000);
  }

  function daysColor(d) {
    return d <= 7 ? "var(--red)" : d <= 14 ? "var(--amber)" : d <= 21 ? "var(--teal)" : "var(--green)";
  }

  if (loading) return (
    <div style={{ padding: "60px", textAlign: "center", color: "var(--text-tertiary)" }}>
      <div style={{ fontSize: "28px", marginBottom: "var(--radius-md)" }}>⏳</div>
      <div>Loading database...</div>
    </div>
  );

  return (
    <div>
      <h2 className="page-title">Edit Database</h2>
      <p className="page-subtitle">Edit medicine details, thresholds, batch quantities and expiry dates directly</p>

      {/* Message toast */}
      {message && (
        <div style={{
          position: "fixed", top: "80px", right: "24px", zIndex: 999,
          padding: "12px 20px", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "13px",
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: message.type === "success" ? "var(--green)" : "var(--red)",
          border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          boxShadow: "0 4px 14px rgba(0,0,0,0.1)"
        }}>
          {message.text}
        </div>
      )}

      {/* Tab toggle */}
      <div style={{ display: "flex", background: "var(--bg-hover)", borderRadius: "var(--radius-md)", padding: "4px", marginBottom: "var(--radius-xl)", width: "fit-content", gap: "4px" }}>
        {[{ id: "medicines", label: `Medicines (${medicines.length})` }, { id: "batches", label: "Batch Editor" }].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedMedId(null); }} style={{
            padding: "9px 20px", border: "none", borderRadius: "9px",
            background: activeTab === t.id ? "white" : "transparent",
            color: activeTab === t.id ? "var(--navy)" : "var(--text-secondary)",
            fontWeight: activeTab === t.id ? "700" : "400",
            cursor: "pointer", fontSize: "13px", fontFamily: "var(--font)",
            boxShadow: activeTab === t.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
          }}>{t.label}</button>
        ))}
      </div>

      {/* MEDICINES TAB */}
      {activeTab === "medicines" && (
        <div>
          {/* Search */}
          <input
            type="text" placeholder="Search by name or category..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: "var(--radius-lg)", padding: "10px 14px" }}
          />

          <div style={{ ...card, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  {["Medicine Name", "Category", "Unit", "Threshold", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: "600", color: "var(--text-secondary)", fontSize: "var(--radius-md)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "var(--bg-subtle)" }}>
                    {editingMed?.id === m.id ? (
                      <>
                        <td style={{ padding: "8px 16px" }}><input value={editingMed.name} onChange={e => setEditingMed(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></td>
                        <td style={{ padding: "8px 12px" }}><input value={editingMed.category} onChange={e => setEditingMed(p => ({ ...p, category: e.target.value }))} style={inputStyle} /></td>
                        <td style={{ padding: "8px 12px" }}>
                          <select value={editingMed.unit} onChange={e => setEditingMed(p => ({ ...p, unit: e.target.value }))} style={inputStyle}>
                            {["strip", "vial", "bottle", "tablet", "injection", "inhaler", "sachet", "tube"].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "8px 12px" }}><input type="number" value={editingMed.threshold} onChange={e => setEditingMed(p => ({ ...p, threshold: e.target.value }))} style={inputStyle} /></td>
                        <td style={{ padding: "8px 16px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={saveMedicine} disabled={saving} style={btnPrimary}>{saving ? "..." : "Save"}</button>
                            <button onClick={() => setEditingMed(null)} style={btnGray}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "11px 16px", fontWeight: "500", color: "var(--text-primary)" }}>{m.name}</td>
                        <td style={{ padding: "11px 16px", color: "var(--text-secondary)" }}>{m.category}</td>
                        <td style={{ padding: "11px 16px", color: "var(--text-secondary)" }}>{m.unit}</td>
                        <td style={{ padding: "11px 16px" }}>{m.threshold}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => setEditingMed({ ...m })} style={btnGray}>Edit</button>
                            <button onClick={() => { setActiveTab("batches"); setSelectedMedId(m.id); }} style={{ ...btnGray, color: "var(--navy)" }}>Batches</button>
                            <button onClick={() => setConfirmDelete({ type: "medicine", id: m.id, name: m.name })} style={btnDanger}>Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BATCHES TAB */}
      {activeTab === "batches" && (
        <div>
          {/* Medicine selector */}
          <div style={{ marginBottom: "var(--radius-lg)" }}>
            <select
              value={selectedMedId || ""}
              onChange={e => setSelectedMedId(e.target.value || null)}
              style={{ ...inputStyle, padding: "10px 14px", cursor: "pointer" }}
            >
              <option value="">— Select a medicine to view its batches —</option>
              {medicines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {selectedMedId && (
            <div style={{ ...card, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "var(--radius-lg)", fontWeight: "700", color: "var(--text-primary)" }}>{selectedMed?.name}</span>
                  <span style={{ fontSize: "var(--radius-md)", color: "var(--text-secondary)", marginLeft: "var(--radius-md)" }}>{selectedMedBatches.length} batches</span>
                </div>
              </div>

              {selectedMedBatches.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-tertiary)" }}>No batches found for this medicine.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-subtle)" }}>
                      {["Batch No", "Expiry Date", "Days Left", "Quantity", "Unit Price", "Actions"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: "600", color: "var(--text-secondary)", fontSize: "var(--radius-md)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMedBatches.map((b, i) => {
                      const days = daysLeft(b.expiryDate);
                      return (
                        <tr key={b.id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "var(--bg-subtle)" }}>
                          {editingBatch?.id === b.id ? (
                            <>
                              <td style={{ padding: "8px 14px", color: "var(--text-secondary)" }}>{b.batchNo}</td>
                              <td style={{ padding: "8px 10px" }}><input type="date" value={editingBatch.expiryDateStr} onChange={e => setEditingBatch(p => ({ ...p, expiryDateStr: e.target.value }))} style={inputStyle} /></td>
                              <td style={{ padding: "8px 10px", fontWeight: "700", color: daysColor(days) }}>{days}d</td>
                              <td style={{ padding: "8px 10px" }}><input type="number" value={editingBatch.quantity} onChange={e => setEditingBatch(p => ({ ...p, quantity: e.target.value }))} style={inputStyle} /></td>
                              <td style={{ padding: "8px 10px" }}><input type="number" value={editingBatch.unitPrice} onChange={e => setEditingBatch(p => ({ ...p, unitPrice: e.target.value }))} style={inputStyle} /></td>
                              <td style={{ padding: "8px 14px" }}>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button onClick={saveBatch} disabled={saving} style={btnPrimary}>{saving ? "..." : "Save"}</button>
                                  <button onClick={() => setEditingBatch(null)} style={btnGray}>Cancel</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: "11px 14px", fontWeight: "500" }}>{b.batchNo}</td>
                              <td style={{ padding: "11px 14px", color: "var(--text-secondary)", fontSize: "var(--radius-md)" }}>
                                {b.expiryDate?.toDate ? b.expiryDate.toDate().toDateString() : new Date(b.expiryDate).toDateString()}
                              </td>
                              <td style={{ padding: "11px 14px", fontWeight: "700", color: daysColor(days) }}>{days}d</td>
                              <td style={{ padding: "11px 14px" }}>{b.quantity}</td>
                              <td style={{ padding: "11px 14px" }}>₹{b.unitPrice || "—"}</td>
                              <td style={{ padding: "11px 14px" }}>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button onClick={() => setEditingBatch({ ...b, expiryDateStr: formatExpiry(b.expiryDate) })} style={btnGray}>Edit</button>
                                  <button onClick={() => setConfirmDelete({ type: "batch", id: b.id, name: b.batchNo })} style={btnDanger}>Delete</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="overlay-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "400px", width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "var(--radius-sm)" }}>Confirm Delete</h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
            </p>
            {confirmDelete.type === "medicine" && (
              <p style={{ fontSize: "13px", color: "var(--red)", marginBottom: "var(--radius-xl)" }}>
                This will also delete ALL batches for this medicine. This cannot be undone.
              </p>
            )}
            {confirmDelete.type === "batch" && (
              <p style={{ fontSize: "13px", color: "var(--red)", marginBottom: "var(--radius-xl)" }}>
                This batch will be permanently removed. This cannot be undone.
              </p>
            )}
            <div style={{ display: "flex", gap: "var(--radius-md)" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ ...btnGray, flex: 1, padding: "11px" }}>Cancel</button>
              <button
                onClick={() => confirmDelete.type === "medicine" ? deleteMedicine(confirmDelete.id) : deleteBatch(confirmDelete.id)}
                disabled={saving}
                style={{ flex: 1, padding: "11px", background: "var(--red)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: "700", fontSize: "var(--radius-lg)", fontFamily: "var(--font)" }}
              >{saving ? "Deleting..." : "Yes, Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
