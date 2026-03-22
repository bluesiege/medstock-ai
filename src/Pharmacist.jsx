import React, { useEffect, useState, useRef } from "react";
import { getAllMedicines, getBatchesByFEFO, dispenseMedicine } from "./db.js";
import { db } from "./firebase.js";
import { collection, addDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const INTERACTIONS = {
  "warfarin": ["aspirin", "ibuprofen", "naproxen", "diclofenac"],
  "aspirin": ["warfarin", "ibuprofen"],
  "digoxin": ["amiodarone", "clarithromycin"],
  "amiodarone": ["digoxin", "warfarin"],
  "ciprofloxacin": ["antacid"],
};
const INTERACTION_MESSAGES = {
  "warfarin+aspirin": "Warfarin + Aspirin — increased bleeding risk.",
  "warfarin+ibuprofen": "Warfarin + Ibuprofen — increased bleeding risk.",
  "warfarin+naproxen": "Warfarin + Naproxen — increased anticoagulant effect.",
  "warfarin+diclofenac": "Warfarin + Diclofenac — increased bleeding risk.",
  "aspirin+ibuprofen": "Aspirin + Ibuprofen — may reduce aspirin cardioprotection.",
  "digoxin+amiodarone": "Digoxin + Amiodarone — increased digoxin toxicity.",
  "digoxin+clarithromycin": "Digoxin + Clarithromycin — increased toxicity risk.",
  "amiodarone+warfarin": "Amiodarone + Warfarin — significantly increases anticoagulant effect.",
  "ciprofloxacin+antacid": "Ciprofloxacin + Antacid — give 2 hrs apart.",
};

function getInteractions(medId, queueIds, medicines) {
  const thisMed = medicines.find(m => m.id === medId);
  if (!thisMed) return [];
  const thisName = thisMed.name.toLowerCase();
  const warnings = [];
  queueIds.forEach(otherId => {
    if (otherId === medId) return;
    const otherMed = medicines.find(m => m.id === otherId);
    if (!otherMed) return;
    const otherName = otherMed.name.toLowerCase();
    Object.entries(INTERACTIONS).forEach(([drug, targets]) => {
      if (thisName.includes(drug)) {
        targets.forEach(target => {
          if (otherName.includes(target)) {
            const key1 = `${drug}+${target}`;
            const key2 = `${target}+${drug}`;
            const msg = INTERACTION_MESSAGES[key1] || INTERACTION_MESSAGES[key2];
            if (msg && !warnings.includes(msg)) warnings.push(msg);
          }
        });
      }
    });
  });
  return warnings;
}

function generateBillPDF(queue, billId, dispensedBy) {
  const doc = new jsPDF();
  const today = new Date();

  doc.setFillColor(26, 35, 126);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MedStock AI — Pharmacy Bill", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Government Hospital Pharmacy Management System", 14, 20);
  doc.text(`Bill No: ${billId}`, 150, 20);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Date: ${today.toLocaleDateString("en-IN")}  Time: ${today.toLocaleTimeString("en-IN")}`, 14, 38);
  doc.text(`Dispensed by: ${dispensedBy}`, 14, 46);

  const rows = queue.map(item => [
    item.medName,
    item.unit,
    item.quantity,
    `Rs.${item.unitPrice}`,
    `Rs.${(item.quantity * item.unitPrice).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 54,
    head: [["Medicine", "Unit", "Qty", "Unit Price", "Total"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 240, 255] },
    margin: { left: 14, right: 14 },
  });

  const grandTotal = queue.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: Rs.${grandTotal.toLocaleString()}`, 14, finalY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("MedStock AI — Confidential Medical Bill", 105, 285, { align: "center" });

  doc.save(`Bill_${billId}.pdf`);
  return grandTotal;
}

function StockLoader({ medicines, onLoad }) {
  useEffect(() => {
    if (!medicines.length) return;
    async function loadAll() {
      const map = {};
      for (const m of medicines) {
        const batches = await getBatchesByFEFO(m.id);
        map[m.id] = batches.reduce((sum, b) => sum + b.quantity, 0);
      }
      onLoad(map);
    }
    loadAll();
  }, [medicines]);
  return null;
}

const card = { background: "white", borderRadius: "var(--radius-lg)", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", padding: "24px", border: "1px solid #e8eaf0" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1.5px solid #e5e7eb", fontSize: "var(--radius-lg)", outline: "none", boxSizing: "border-box", fontFamily: "var(--font)", background: "white", color: "var(--text-primary)" };
const labelStyle = { display: "block", marginBottom: "7px", fontWeight: "600", fontSize: "13px", color: "var(--text-primary)" };

export default function Pharmacist({ user }) {
  const [medicines, setMedicines] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [batchCache, setBatchCache] = useState({});
  const [priceCache, setPriceCache] = useState({});

  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null); // full medicine object
  const [batches, setBatches] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const [queue, setQueue] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [lastBillId, setLastBillId] = useState(null);

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => { getAllMedicines().then(setMedicines); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = medicines.filter(m =>
    search.length >= 1 &&
    (m.name?.toLowerCase().includes(search.toLowerCase()) ||
     m.category?.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 10);

  async function selectMedicine(med) {
    setSearch(med.name);
    setShowDropdown(false);
    setSelectedMed(med);
    setQuantity(1);
    setMessage("");

    let b = batchCache[med.id];
    if (!b) {
      b = await getBatchesByFEFO(med.id);
      setBatchCache(prev => ({ ...prev, [med.id]: b }));
      const total = b.reduce((s, x) => s + x.quantity, 0);
      const price = b.find(x => x.unitPrice)?.unitPrice || 0;
      setStockMap(prev => ({ ...prev, [med.id]: total }));
      setPriceCache(prev => ({ ...prev, [med.id]: price }));
    }
    setBatches(b);
  }

  function clearSelection() {
    setSearch("");
    setSelectedMed(null);
    setBatches([]);
    setQuantity(1);
  }

  function addToQueue() {
    if (!selectedMed) return alert("Select a medicine first.");
    if (quantity < 1) return alert("Quantity must be at least 1.");
    const total = stockMap[selectedMed.id] || 0;
    if (Number(quantity) > total) return alert(`Only ${total} units available.`);
    if (queue.find(q => q.medId === selectedMed.id)) return alert("Already in queue. Remove it first to change quantity.");
    const unitPrice = priceCache[selectedMed.id] || 0;
    setQueue(prev => [...prev, {
      medId: selectedMed.id,
      medName: selectedMed.name,
      unit: selectedMed.unit,
      quantity: Number(quantity),
      unitPrice,
      batches,
    }]);
    clearSelection();
  }

  function removeFromQueue(medId) {
    setQueue(prev => prev.filter(q => q.medId !== medId));
  }

  async function handleConfirmedDispense() {
    setLoading(true);
    setConfirm(false);
    const billId = `BILL-${Date.now()}`;

    // Dispense all
    for (const item of queue) {
      await dispenseMedicine(item.medId, item.quantity, user);
    }

    // Generate and save bill
    const grandTotal = generateBillPDF(queue, billId, user?.name || "Pharmacist");
    await addDoc(collection(db, "bills"), {
      billId,
      type: "pharmacy",
      items: queue.map(i => ({ medId: i.medId, medName: i.medName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.quantity * i.unitPrice })),
      grandTotal,
      dispensedBy: user?.name || "Pharmacist",
      dispensedByEmail: user?.email || "",
      createdAt: new Date(),
    });

    // Refresh stock
    const updatedMap = { ...stockMap };
    for (const item of queue) {
      const b = await getBatchesByFEFO(item.medId);
      updatedMap[item.medId] = b.reduce((s, x) => s + x.quantity, 0);
      setBatchCache(prev => ({ ...prev, [item.medId]: b }));
    }
    setStockMap(updatedMap);
    setLastBillId(billId);
    setMessage(`Dispensed successfully! Bill ${billId} downloaded.`);
    setQueue([]);
    setLoading(false);
  }

  const totalStock = selectedMed ? (stockMap[selectedMed.id] || 0) : 0;
  const unitPrice = selectedMed ? (priceCache[selectedMed.id] || 0) : 0;
  const lineTotal = unitPrice * Number(quantity || 0);
  const queueIds = queue.map(q => q.medId);
  const currentInteractions = selectedMed ? getInteractions(selectedMed.id, queueIds, medicines) : [];
  const queueInteractions = [];
  queue.forEach(item => {
    const others = queueIds.filter(id => id !== item.medId);
    getInteractions(item.medId, others, medicines).forEach(w => {
      if (!queueInteractions.includes(w)) queueInteractions.push(w);
    });
  });
  const grandTotal = queue.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  function daysColor(d) { return d <= 7 ? "var(--red)" : d <= 14 ? "var(--amber)" : d <= 21 ? "var(--teal)" : "var(--green)"; }
  function rowBg(d, i) {
    if (i !== 0) return "white";
    return d <= 7 ? "#fef2f2" : d <= 14 ? "#fffbeb" : d <= 21 ? "#eff6ff" : "white";
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <h2 className="page-title">Dispense Medicine</h2>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "24px" }}>Search and add medicines to the queue — a bill is generated automatically on confirm</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--radius-xl)" }}>

        {/* LEFT */}
        <div style={card}>
          <div style={{ fontSize: "var(--radius-lg)", fontWeight: "700", color: "var(--text-primary)", marginBottom: "var(--radius-lg)" }}>Select Medicine</div>

          {/* Live search with inline dropdown */}
          <div style={{ marginBottom: "var(--radius-lg)", position: "relative" }}>
            <label style={labelStyle}>Search & Select</label>
            <input
              ref={searchRef}
              type="text"
              placeholder="Type medicine name or category..."
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) { setSelectedMed(null); setBatches([]); } }}
              onFocus={() => setShowDropdown(true)}
              style={{ ...inputStyle, paddingRight: search ? "36px" : "var(--radius-lg)" }}
            />
            {search && (
              <button onClick={clearSelection} style={{ position: "absolute", right: "var(--radius-md)", top: "36px", background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: "var(--radius-lg)", fontWeight: "700", padding: "0" }}>×</button>
            )}
            {showDropdown && filtered.length > 0 && (
              <div ref={dropdownRef} style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1.5px solid #e5e7eb", borderRadius: "var(--radius-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, maxHeight: "240px", overflowY: "auto", marginTop: "2px" }}>
                {filtered.map(m => {
                  const stock = stockMap[m.id];
                  const inQueue = !!queue.find(q => q.medId === m.id);
                  return (
                    <div
                      key={m.id}
                      onMouseDown={() => !inQueue && selectMedicine(m)}
                      style={{ padding: "10px 14px", cursor: inQueue ? "not-allowed" : "pointer", borderBottom: "1px solid #f3f4f6", background: inQueue ? "var(--bg-subtle)" : "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={e => { if (!inQueue) e.currentTarget.style.background = "#f0f4ff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = inQueue ? "var(--bg-subtle)" : "white"; }}
                    >
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "500", color: inQueue ? "var(--text-tertiary)" : "var(--text-primary)" }}>{m.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{m.category} · {m.unit}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {stock !== undefined && <div style={{ fontSize: "var(--radius-md)", color: stock === 0 ? "var(--red)" : "var(--green)", fontWeight: "600" }}>{stock} {m.unit}s</div>}
                        {inQueue && <div style={{ fontSize: "var(--radius-md)", color: "var(--text-secondary)" }}>In queue ✓</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {showDropdown && search.length >= 1 && filtered.length === 0 && (
              <div ref={dropdownRef} style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1.5px solid #e5e7eb", borderRadius: "var(--radius-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, padding: "var(--radius-lg)", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px", marginTop: "2px" }}>
                No medicines found for "{search}"
              </div>
            )}
          </div>

          {/* Batch table */}
          {batches.length > 0 && (
            <div style={{ marginBottom: "var(--radius-md)", border: "1px solid #e8eaf0", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <div style={{ background: "var(--bg-subtle)", padding: "7px 12px", borderBottom: "1px solid #e8eaf0" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>FEFO BATCH ORDER</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--radius-md)" }}>
                <thead>
                  <tr style={{ background: "var(--bg-hover)" }}>
                    {["Batch", "Expiry", "Days", "Qty", "Price"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: "600", color: "var(--text-secondary)", fontSize: "11px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, i) => {
                    const expiry = b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
                    const days = Math.ceil((expiry - new Date()) / 86400000);
                    return (
                      <tr key={b.id} style={{ background: rowBg(days, i), borderTop: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "6px 10px", fontWeight: "500" }}>
                          {b.batchNo}
                          {i === 0 && <span style={{ marginLeft: "4px", fontSize: "9px", background: "var(--navy)", color: "white", padding: "1px 5px", borderRadius: "4px" }}>NEXT</span>}
                        </td>
                        <td style={{ padding: "6px 10px", color: "var(--text-secondary)", fontSize: "11px" }}>{expiry.toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "6px 10px", fontWeight: "700", color: daysColor(days) }}>{days}d</td>
                        <td style={{ padding: "6px 10px" }}>{b.quantity}</td>
                        <td style={{ padding: "6px 10px", color: "var(--green)", fontWeight: "600" }}>₹{b.unitPrice || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {batches.length === 0 && selectedMed && (
            <div style={{ padding: "10px 12px", background: "#fef2f2", borderRadius: "var(--radius-sm)", marginBottom: "var(--radius-md)", color: "var(--red)", fontSize: "13px", border: "1px solid #fecaca" }}>
              No stock available.
            </div>
          )}

          {/* Interactions */}
          {currentInteractions.map((w, i) => (
            <div key={i} style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--radius-sm)", marginBottom: "var(--radius-sm)", fontSize: "var(--radius-md)", color: "#92400e" }}>⚠️ {w}</div>
          ))}

          {/* Quantity + pricing */}
          {selectedMed && batches.length > 0 && (
            <div style={{ marginBottom: "var(--radius-lg)" }}>
              <label style={labelStyle}>
                Quantity
                <span style={{ fontWeight: "400", color: "var(--text-tertiary)", marginLeft: "var(--radius-sm)", fontSize: "var(--radius-md)" }}>Max: {totalStock}</span>
              </label>
              <input type="number" min="1" max={totalStock} value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} />
              {unitPrice > 0 && (
                <div style={{ marginTop: "var(--radius-sm)", display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#f0f4ff", borderRadius: "var(--radius-sm)", border: "1px solid #c7d2fe" }}>
                  <span style={{ fontSize: "var(--radius-md)", color: "var(--text-secondary)" }}>₹{unitPrice} × {quantity || 0} {selectedMed.unit}s</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--navy)" }}>₹{lineTotal.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={addToQueue}
            disabled={!selectedMed || batches.length === 0}
            style={{
              width: "100%", padding: "11px",
              background: !selectedMed || batches.length === 0 ? "#d1d5db" : "linear-gradient(135deg, #1a237e, #283593)",
              color: "white", border: "none", borderRadius: "var(--radius-md)",
              fontSize: "13px", fontWeight: "700", cursor: !selectedMed || batches.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "var(--font)"
            }}
          >+ Add to Queue</button>
        </div>

        {/* RIGHT — queue + bill */}
        <div style={card}>
          <div style={{ fontSize: "var(--radius-lg)", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
            Dispense Queue
            {queue.length > 0 && <span style={{ marginLeft: "var(--radius-sm)", fontSize: "var(--radius-md)", fontWeight: "600", padding: "2px 8px", borderRadius: "var(--radius-md)", background: "#eff6ff", color: "var(--navy)" }}>{queue.length} medicine{queue.length > 1 ? "s" : ""}</span>}
          </div>
          <div style={{ fontSize: "var(--radius-md)", color: "var(--text-secondary)", marginBottom: "var(--radius-lg)" }}>Bill generated automatically on confirm</div>

          {queue.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-tertiary)", border: "2px dashed #e5e7eb", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "24px", marginBottom: "var(--radius-sm)" }}>💊</div>
              <div style={{ fontSize: "13px" }}>No medicines in queue</div>
              <div style={{ fontSize: "var(--radius-md)", marginTop: "4px" }}>Search and add medicines from the left</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "var(--radius-lg)" }}>
                {queue.map(item => (
                  <div key={item.medId} style={{ display: "flex", alignItems: "center", gap: "var(--radius-md)", padding: "10px 12px", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)", border: "1px solid #e8eaf0" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{item.medName}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {item.quantity} {item.unit}s × ₹{item.unitPrice}
                      </div>
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--navy)" }}>₹{(item.quantity * item.unitPrice).toLocaleString()}</div>
                    <button onClick={() => removeFromQueue(item.medId)} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px solid #fecaca", background: "#fef2f2", color: "var(--red)", cursor: "pointer", fontSize: "var(--radius-lg)", fontWeight: "700", fontFamily: "var(--font)" }}>×</button>
                  </div>
                ))}
              </div>

              {/* Queue interactions */}
              {queueInteractions.map((w, i) => (
                <div key={i} style={{ padding: "7px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--radius-sm)", marginBottom: "6px", fontSize: "var(--radius-md)", color: "#92400e" }}>⚠️ {w}</div>
              ))}

              {/* Bill summary */}
              <div style={{ borderTop: "2px solid #e8eaf0", paddingTop: "var(--radius-md)", marginBottom: "var(--radius-lg)" }}>
                {queue.map(item => (
                  <div key={item.medId} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--radius-md)", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    <span>{item.medName} × {item.quantity}</span>
                    <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>₹{(item.quantity * item.unitPrice).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "800", color: "var(--text-primary)", marginTop: "var(--radius-sm)", paddingTop: "var(--radius-sm)", borderTop: "1px solid #e8eaf0" }}>
                  <span>Grand Total</span>
                  <span style={{ color: "var(--green)" }}>₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setConfirm(true)}
                disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: loading ? "#d1d5db" : "linear-gradient(135deg, #16a34a, #15803d)",
                  color: "white", border: "none", borderRadius: "var(--radius-md)",
                  fontSize: "var(--radius-lg)", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--font)", boxShadow: "0 4px 14px rgba(22,163,74,0.3)"
                }}
              >{loading ? "Dispensing..." : `Dispense & Generate Bill`}</button>
            </>
          )}

          {message && (
            <div style={{ marginTop: "var(--radius-md)", padding: "12px 14px", background: "#f0fdf4", borderRadius: "var(--radius-md)", color: "var(--green)", fontWeight: "600", fontSize: "13px", border: "1px solid #bbf7d0" }}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="overlay-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal-enter" style={{ background: "white", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "420px", width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>Confirm & Generate Bill</h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--radius-lg)" }}>The following will be dispensed and a PDF bill will download:</p>
            <div style={{ background: "#f0f4ff", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: "var(--radius-md)", border: "1px solid #c7d2fe" }}>
              {queue.map(item => (
                <div key={item.medId} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                  <span style={{ color: "var(--text-primary)" }}>{item.medName} × {item.quantity}</span>
                  <span style={{ fontWeight: "700", color: "var(--navy)" }}>₹{(item.quantity * item.unitPrice).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "800", paddingTop: "var(--radius-sm)", marginTop: "var(--radius-sm)", borderTop: "1px solid #c7d2fe" }}>
                <span>Total</span>
                <span style={{ color: "var(--green)" }}>₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
            {queueInteractions.length > 0 && (
              <div style={{ padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--radius-sm)", marginBottom: "var(--radius-md)" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--amber)", marginBottom: "4px" }}>Interaction warnings</div>
                {queueInteractions.map((w, i) => <div key={i} style={{ fontSize: "var(--radius-md)", color: "#92400e" }}>⚠️ {w}</div>)}
              </div>
            )}
            <div style={{ display: "flex", gap: "var(--radius-md)" }}>
              <button onClick={() => setConfirm(false)} style={{ flex: 1, padding: "11px", background: "var(--bg-hover)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: "600", fontSize: "var(--radius-lg)", color: "var(--text-primary)", fontFamily: "var(--font)" }}>Cancel</button>
              <button onClick={handleConfirmedDispense} style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg, #16a34a, #15803d)", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontWeight: "700", fontSize: "var(--radius-lg)", color: "white", fontFamily: "var(--font)" }}>Confirm & Download Bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
