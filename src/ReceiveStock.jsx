import { useEffect, useState } from "react";
import { getAllMedicines } from "./db.js";
import { db } from "./firebase.js";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";

const card = { background: "white", borderRadius: "var(--radius-lg)", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", padding: "24px", border: "1px solid #e8eaf0" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1.5px solid #e5e7eb", fontSize: "var(--radius-lg)", outline: "none", boxSizing: "border-box", fontFamily: "var(--font)", background: "var(--bg-subtle)", color: "var(--text-primary)", colorScheme: "light" };
const labelStyle = { display: "block", marginBottom: "7px", fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" };
const fieldStyle = { marginBottom: "var(--radius-lg)" };

export default function ReceiveStock({ user }) {
  const [medicines, setMedicines] = useState([]);
  const [mode, setMode] = useState("existing");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState("");
  const [currentStock, setCurrentStock] = useState(null);
  const [batchNo, setBatchNo] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("strip");
  const [newThreshold, setNewThreshold] = useState("");
  const [newBatchNo, setNewBatchNo] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => { getAllMedicines().then(setMedicines); }, []);

  async function handleMedSelect(e) {
    const medId = e.target.value;
    setSelectedMed(medId);
    setMessage(null);
    if (medId) {
      const { getAllBatches, getBatchesByFEFO } = await import("./db.js");

      // Use all batches (including empty ones) to find highest batch number
      const allBatches = await getAllBatches();
      const medBatches = allBatches.filter(b => b.medicineId === medId);

      // Current stock — only count batches with quantity > 0
      const activeBatches = await getBatchesByFEFO(medId);
      const total = activeBatches.reduce((s, b) => s + b.quantity, 0);
      setCurrentStock(total);

      // Find highest numbered batch to auto-increment
      const lastBatch = medBatches.sort((a, b) => {
        const aNo = parseInt(a.batchNo.replace(/\D/g, "")) || 0;
        const bNo = parseInt(b.batchNo.replace(/\D/g, "")) || 0;
        return bNo - aNo;
      })[0];

      if (lastBatch) {
        const prefix = lastBatch.batchNo.replace(/\d+$/, "");
        const num = parseInt(lastBatch.batchNo.match(/\d+$/)?.[0] || "0") + 1;
        setBatchNo(`${prefix}${String(num).padStart(3, "0")}`);
      } else {
        // No existing batches — generate a prefix from medicine name
        const med = medicines.find(m => m.id === medId);
        const prefix = med?.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3) || "MED";
        setBatchNo(`${prefix}-001`);
      }
    } else { setCurrentStock(null); setBatchNo(""); }
  }

  function reset() { setSelectedMed(""); setBatchNo(""); setQuantity(""); setExpiryDate(""); setUnitPrice(""); setCurrentStock(null); }
  function resetNew() { setNewName(""); setNewCategory(""); setNewUnit("strip"); setNewThreshold(""); setNewBatchNo(""); setNewQuantity(""); setNewExpiry(""); setNewPrice(""); }

  async function handleAddBatch() {
    if (!selectedMed) return setMessage({ type: "error", text: "Please select a medicine." });
    if (!batchNo) return setMessage({ type: "error", text: "Batch number is required." });
    if (!quantity || quantity < 1) return setMessage({ type: "error", text: "Enter a valid quantity." });
    if (!expiryDate) return setMessage({ type: "error", text: "Expiry date is required." });
    setLoading(true);
    try {
      await addDoc(collection(db, "batches"), { medicineId: selectedMed, batchNo, quantity: Number(quantity), expiryDate: new Date(expiryDate), unitPrice: Number(unitPrice) || 0 });
      const medName = medicines.find(m => m.id === selectedMed)?.name || selectedMed;
      await addDoc(collection(db, "receive_log"), { medicineId: selectedMed, medicineName: medName, batchNo, quantityReceived: Number(quantity), unitPrice: Number(unitPrice) || 0, expiryDate: new Date(expiryDate), receivedAt: new Date(), type: "restock", receivedBy: user?.name || "Unknown", receivedByEmail: user?.email || "", receivedByRole: user?.role || "" });
      setMessage({ type: "success", text: `Batch ${batchNo} added successfully for ${medName}!` });
      reset();
    } catch { setMessage({ type: "error", text: "Failed to add batch. Try again." }); }
    setLoading(false);
  }

  async function handleAddNewMedicine() {
    if (!newName || !newCategory || !newThreshold || !newBatchNo || !newQuantity || !newExpiry)
      return setMessage({ type: "error", text: "Please fill in all required fields." });
    setLoading(true);
    try {
      const medId = newName.toLowerCase().replace(/\s+/g, "_");
      // Check if medicine already exists
      const existing = medicines.find(m =>
        m.id === medId ||
        m.name?.toLowerCase().trim() === newName.toLowerCase().trim()
      );
      if (existing) {
        setMessage({ type: "error", text: `"${newName}" already exists in the database. Use "Add batch to existing medicine" instead.` });
        setLoading(false);
        return;
      }
      await setDoc(doc(db, "medicines", medId), { name: newName, category: newCategory, unit: newUnit, threshold: Number(newThreshold) });
      await addDoc(collection(db, "batches"), { medicineId: medId, batchNo: newBatchNo, quantity: Number(newQuantity), expiryDate: new Date(newExpiry), unitPrice: Number(newPrice) || 0 });
      await addDoc(collection(db, "receive_log"), { medicineId: medId, medicineName: newName, batchNo: newBatchNo, quantityReceived: Number(newQuantity), unitPrice: Number(newPrice) || 0, expiryDate: new Date(newExpiry), receivedAt: new Date(), type: "new_medicine", receivedBy: user?.name || "Unknown", receivedByEmail: user?.email || "", receivedByRole: user?.role || "" });
      setMessage({ type: "success", text: `${newName} added with batch ${newBatchNo}!` });
      setMedicines(await getAllMedicines());
      resetNew();
    } catch { setMessage({ type: "error", text: "Failed to add medicine. Try again." }); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <h2 className="page-title">Receive Stock</h2>
      <p className="page-subtitle">Add new stock when it arrives from the manufacturer</p>

      <div style={card}>
        {/* Mode toggle */}
        <div style={{ display: "flex", background: "var(--bg-hover)", borderRadius: "var(--radius-md)", padding: "4px", marginBottom: "24px" }}>
          {[{ id: "existing", label: "Add to existing medicine" }, { id: "new", label: "Add new medicine" }].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setMessage(null); }} style={{
              flex: 1, padding: "9px 12px", border: "none", borderRadius: "9px",
              background: mode === m.id ? "white" : "transparent",
              color: mode === m.id ? "var(--navy)" : "var(--text-secondary)",
              fontWeight: mode === m.id ? "700" : "400",
              cursor: "pointer", fontSize: "13px", fontFamily: "var(--font)",
              boxShadow: mode === m.id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s"
            }}>{m.label}</button>
          ))}
        </div>

        {message && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", marginBottom: "18px", fontSize: "13px", fontWeight: "600", background: message.type === "success" ? "#f0fdf4" : "#fef2f2", color: message.type === "success" ? "var(--green)" : "var(--red)", border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}` }}>
            {message.text}
          </div>
        )}

        {mode === "existing" && (
          <div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Select Medicine</label>
              <select value={selectedMed} onChange={handleMedSelect} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">— Select a medicine —</option>
                {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {currentStock !== null && selectedMed && (
                <div style={{ marginTop: "var(--radius-sm)", fontSize: "var(--radius-md)", color: "var(--text-secondary)", padding: "8px 12px", background: "#f0f4ff", borderRadius: "var(--radius-sm)", border: "1px solid #c7d2fe" }}>
                  Currently in stock: <strong style={{ color: "var(--navy)" }}>{currentStock} units</strong>
                </div>
              )}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Batch Number</label>
              <input type="text" placeholder="e.g. INS-003" value={batchNo} onChange={e => setBatchNo(e.target.value)} style={inputStyle} />
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "5px" }}>
                Auto-assigned based on last batch — edit if needed
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--radius-md)" }}>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Quantity Received</label>
                <input type="number" min="1" placeholder="e.g. 100" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Unit Price (₹)</label>
                <input type="number" min="0" placeholder="e.g. 180" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} style={inputStyle} />
            </div>
            <button onClick={handleAddBatch} disabled={loading} style={{ width: "100%", padding: "13px", background: loading ? "#d1d5db" : "linear-gradient(135deg, #16a34a, #15803d)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--radius-lg)", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font)", boxShadow: loading ? "none" : "0 4px 14px rgba(22,163,74,0.3)" }}>
              {loading ? "Adding..." : "Add Batch to Stock"}
            </button>
          </div>
        )}

        {mode === "new" && (
          <div>
            <div style={{ display: "flex", gap: "var(--radius-md)" }}>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Medicine Name</label>
                <input type="text" placeholder="e.g. Ciprofloxacin" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Category</label>
                <input type="text" placeholder="e.g. Antibiotic" value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--radius-md)" }}>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Unit Type</label>
                <select value={newUnit} onChange={e => setNewUnit(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  {["strip", "vial", "bottle", "tablet", "injection"].map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ ...fieldStyle, flex: 1 }}>
                <label style={labelStyle}>Low Stock Threshold</label>
                <input type="number" min="1" placeholder="e.g. 20" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "var(--radius-lg)", marginBottom: "4px" }}>
              <div style={{ fontSize: "var(--radius-md)", color: "var(--text-tertiary)", fontWeight: "500", marginBottom: "var(--radius-lg)" }}>FIRST BATCH DETAILS</div>
              <div style={{ display: "flex", gap: "var(--radius-md)" }}>
                <div style={{ ...fieldStyle, flex: 1 }}>
                  <label style={labelStyle}>Batch Number</label>
                  <input type="text" placeholder="e.g. CIP-001" value={newBatchNo} onChange={e => setNewBatchNo(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ ...fieldStyle, flex: 1 }}>
                  <label style={labelStyle}>Quantity</label>
                  <input type="number" min="1" placeholder="e.g. 50" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "var(--radius-md)" }}>
                <div style={{ ...fieldStyle, flex: 1 }}>
                  <label style={labelStyle}>Expiry Date</label>
                  <input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ ...fieldStyle, flex: 1 }}>
                  <label style={labelStyle}>Unit Price (₹)</label>
                  <input type="number" min="0" placeholder="e.g. 25" value={newPrice} onChange={e => setNewPrice(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
            <button onClick={handleAddNewMedicine} disabled={loading} style={{ width: "100%", padding: "13px", background: loading ? "#d1d5db" : "linear-gradient(135deg, #1a237e, #283593)", color: "white", border: "none", borderRadius: "var(--radius-md)", fontSize: "var(--radius-lg)", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font)", boxShadow: loading ? "none" : "0 4px 14px rgba(26,35,126,0.3)" }}>
              {loading ? "Adding..." : "Add New Medicine + Batch"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
