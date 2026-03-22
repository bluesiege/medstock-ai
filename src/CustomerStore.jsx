import { useEffect, useState } from "react";
import { getAllMedicines, getAllBatches, dispenseMedicine } from "./db.js";
import { db } from "./firebase.js";
import { collection, addDoc, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function generateCustomerBill(items, billId, customerName, medicines) {
  const jsPDFLib = jsPDF;
  const doc = new jsPDFLib();
  const today = new Date();
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MedStock AI — Patient Order Bill", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Government Hospital Pharmacy", 14, 20);
  doc.text(`Bill No: ${billId}`, 150, 20);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Date: ${today.toLocaleDateString("en-IN")}  Time: ${today.toLocaleTimeString("en-IN")}`, 14, 38);
  doc.text(`Customer: ${customerName}`, 14, 46);
  const rows = items.map(item => {
    const med = medicines.find(m => m.id === item.medId);
    return [med?.name || item.medId, med?.unit || "unit", item.qty, `Rs.${item.price}`, `Rs.${(item.qty * item.price).toLocaleString()}`];
  });
  autoTable(doc, {
    startY: 54,
    head: [["Medicine", "Unit", "Qty", "Unit Price", "Total"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 255, 240] },
    margin: { left: 14, right: 14 },
  });
  const grandTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: Rs.${grandTotal.toLocaleString()}`, 14, finalY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("MedStock AI — Thank you for your order", 105, 285, { align: "center" });
  doc.save(`Order_${billId}.pdf`);
  return grandTotal;
}
import { logoutUser } from "./firebase.js";

// Check if medicine in cart interacts with this medicine
function checkCustomerInteractions(medId, cart, medicines) {
  const PAIRS = [
    { a: "warfarin", b: "aspirin", msg: "Warfarin + Aspirin — bleeding risk" },
    { a: "warfarin", b: "ibuprofen", msg: "Warfarin + Ibuprofen — bleeding risk" },
    { a: "aspirin", b: "ibuprofen", msg: "Aspirin + Ibuprofen — reduced effectiveness" },
    { a: "digoxin", b: "amiodarone", msg: "Digoxin + Amiodarone — toxicity risk" },
    { a: "ciprofloxacin", b: "antacid", msg: "Ciprofloxacin + Antacid — reduced absorption" },
  ];
  const cartMedIds = Object.keys(cart);
  const cartMedNames = cartMedIds.map(id => medicines.find(m => m.id === id)?.name?.toLowerCase() || "");
  const thisMedName = medicines.find(m => m.id === medId)?.name?.toLowerCase() || "";
  const warnings = [];
  PAIRS.forEach(pair => {
    const thisMatchesA = thisMedName.includes(pair.a);
    const thisMatchesB = thisMedName.includes(pair.b);
    const cartHasB = cartMedNames.some(n => n.includes(pair.b));
    const cartHasA = cartMedNames.some(n => n.includes(pair.a));
    if ((thisMatchesA && cartHasB) || (thisMatchesB && cartHasA)) {
      warnings.push(pair.msg);
    }
  });
  return warnings;
}

function BillsList({ customerEmail, medicines }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "bills"));
      const allBills = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.customerEmail === customerEmail && b.type === "customer")
        .sort((a, b) => {
          const at = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bt = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bt - at;
        });
      setBills(allBills);
      // Auto-expand first bill
      if (allBills.length > 0) setExpanded({ [allBills[0].id]: true });
      setLoading(false);
    }
    load();
  }, [customerEmail]);

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function downloadBill(bill) {
    const items = bill.items.map(i => ({ medId: i.medId, qty: i.quantity, price: i.unitPrice }));
    generateCustomerBill(items, bill.billId, bill.customerName, medicines);
  }

  if (loading) return <div style={{ padding: "20px", color: "#9ca3af", fontSize: "13px" }}>Loading orders...</div>;
  if (bills.length === 0) return (
    <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: "16px", marginBottom: "20px" }}>
      <div style={{ fontSize: "32px", marginBottom: "10px" }}>🛒</div>
      <div style={{ fontSize: "14px", fontWeight: "500" }}>No orders yet</div>
      <div style={{ fontSize: "12px", marginTop: "4px" }}>Place an order to see it here with a downloadable bill</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {bills.map(bill => {
        const date = bill.createdAt?.toDate ? bill.createdAt.toDate() : new Date(bill.createdAt);
        const isOpen = expanded[bill.id];
        return (
          <div key={bill.id} style={{ background: "white", borderRadius: "14px", border: "1px solid #e8eaf0", overflow: "hidden" }}>
            {/* Bill header */}
            <div
              onClick={() => toggleExpand(bill.id)}
              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", cursor: "pointer", background: isOpen ? "#f0fdf4" : "white", borderBottom: isOpen ? "1px solid #bbf7d0" : "none", transition: "background 0.15s" }}
            >
              <div style={{ fontSize: "22px" }}>🧾</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{bill.billId}</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                  {bill.items?.length} item{bill.items?.length !== 1 ? "s" : ""} · {date.toLocaleDateString("en-IN")} · {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a", marginRight: "8px" }}>₹{bill.grandTotal?.toLocaleString()}</div>
              <button
                onClick={e => { e.stopPropagation(); downloadBill(bill); }}
                style={{ padding: "7px 14px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "11px", fontWeight: "600", fontFamily: "inherit", marginRight: "8px" }}
              >PDF</button>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* Expanded items */}
            {isOpen && (
              <div style={{ padding: "0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Medicine", "Qty", "Unit Price", "Total"].map(h => (
                        <th key={h} style={{ padding: "9px 18px", textAlign: "left", fontWeight: "600", color: "#6b7280", fontSize: "12px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items?.map((item, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                        <td style={{ padding: "10px 18px", fontWeight: "500", color: "#111827" }}>{item.medName}</td>
                        <td style={{ padding: "10px 18px", color: "#374151" }}>{item.quantity}</td>
                        <td style={{ padding: "10px 18px", color: "#374151" }}>₹{item.unitPrice}</td>
                        <td style={{ padding: "10px 18px", fontWeight: "700", color: "#16a34a" }}>₹{item.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderTop: "2px solid #e8eaf0", background: "#f9fafb" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>Grand Total</span>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#16a34a" }}>₹{bill.grandTotal?.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CustomerStore({ user, onLogout }) {
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [view, setView] = useState("store"); // store | cart | confirmation | orders
  const [orderHistory, setOrderHistory] = useState([]);
  const [ordering, setOrdering] = useState(false);
  const [orderDone, setOrderDone] = useState(null);

  useEffect(() => { loadData(); loadOrderHistory(); }, []);

  async function loadOrderHistory() {
    const { db } = await import("./firebase.js");
    const { collection, getDocs } = await import("firebase/firestore");
    const snap = await getDocs(collection(db, "dispense_log"));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(l => l.dispensedByEmail === user.email)
      .sort((a, b) => {
        const at = a.dispensedAt?.toDate ? a.dispensedAt.toDate() : new Date(a.dispensedAt);
        const bt = b.dispensedAt?.toDate ? b.dispensedAt.toDate() : new Date(b.dispensedAt);
        return bt - at;
      });
    setOrderHistory(logs);
  }

  async function loadData() {
    setLoading(true);
    const [meds, bats] = await Promise.all([getAllMedicines(), getAllBatches()]);
    setMedicines(meds);
    setBatches(bats);
    setLoading(false);
  }

  function getStock(medId) {
    return batches.filter(b => b.medicineId === medId).reduce((s, b) => s + b.quantity, 0);
  }

  function getPrice(medId) {
    const b = batches.find(b => b.medicineId === medId && b.quantity > 0);
    return b?.unitPrice || 0;
  }

  function cartCount() { return Object.values(cart).reduce((s, q) => s + q, 0); }
  function cartTotal() {
    return Object.entries(cart).reduce((s, [id, qty]) => s + (getPrice(id) * qty), 0);
  }

  function addToCart(medId) {
    const stock = getStock(medId);
    setCart(prev => {
      const current = prev[medId] || 0;
      if (current >= stock) return prev;
      return { ...prev, [medId]: current + 1 };
    });
  }

  function removeFromCart(medId) {
    setCart(prev => {
      const current = prev[medId] || 0;
      if (current <= 1) { const next = { ...prev }; delete next[medId]; return next; }
      return { ...prev, [medId]: current - 1 };
    });
  }

  async function placeOrder() {
    setOrdering(true);
    const billId = `ORD-${Date.now()}`;
    const orderItems = [];
    try {
      for (const [medId, qty] of Object.entries(cart)) {
        await dispenseMedicine(medId, qty, user);
        const med = medicines.find(m => m.id === medId);
        const price = getPrice(medId);
        orderItems.push({ medId, name: med?.name, qty, price, total: qty * price });
      }
      // Generate bill PDF
      const billItems = orderItems.map(i => ({ medId: i.medId, qty: i.qty, price: i.price }));
      const grandTotal = generateCustomerBill(billItems, billId, user.name, medicines);
      // Save bill to Firestore
      await addDoc(collection(db, "bills"), {
        billId,
        type: "customer",
        items: orderItems.map(i => ({ medId: i.medId, medName: i.name, quantity: i.qty, unitPrice: i.price, total: i.total })),
        grandTotal,
        customerName: user.name,
        customerEmail: user.email,
        createdAt: new Date(),
      });
      setCart({});
      setOrderDone(orderItems);
      setView("confirmation");
      await loadData();
      await loadOrderHistory();
    } catch (e) { console.error(e); alert("Order failed. Please try again."); }
    setOrdering(false);
  }

  async function handleLogout() {
    await logoutUser();
    onLogout();
  }

  // ── FILTERS + SORT ───────────────────────────────────────
  const categories = ["all", ...new Set(medicines.map(m => m.category).filter(Boolean).sort())];
  const units = ["all", ...new Set(medicines.map(m => m.unit).filter(Boolean).sort())];

  const filtered = medicines
    .filter(m => {
      const stock = getStock(m.id);
      if (inStockOnly && stock === 0) return false;
      if (category !== "all" && m.category !== category) return false;
      if (unitFilter !== "all" && m.unit !== unitFilter) return false;
      if (search && !m.name?.toLowerCase().includes(search.toLowerCase()) &&
          !m.category?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name?.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name?.localeCompare(a.name);
      if (sortBy === "price_asc") return getPrice(a.id) - getPrice(b.id);
      if (sortBy === "price_desc") return getPrice(b.id) - getPrice(a.id);
      if (sortBy === "stock_desc") return getStock(b.id) - getStock(a.id);
      return 0;
    });

  const inputStyle = { padding: "9px 14px", borderRadius: "10px", border: "1.5px solid #e5e7eb", fontSize: "13px", fontFamily: "inherit", background: "white", color: "#111827", outline: "none" };

  // ── ORDER CONFIRMATION ───────────────────────────────────
  if (view === "confirmation") return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "white", borderRadius: "20px", padding: "48px 40px", maxWidth: "480px", width: "90%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>Order Placed!</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px" }}>Your order has been confirmed and stock has been updated.</p>
        <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", marginBottom: "24px", textAlign: "left" }}>
          {orderDone?.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < orderDone.length - 1 ? "1px solid #f3f4f6" : "none", fontSize: "13px" }}>
              <span style={{ color: "#374151" }}>{item.name} × {item.qty}</span>
              <span style={{ fontWeight: "600", color: "#111827" }}>₹{item.price}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "10px", fontSize: "14px", fontWeight: "700" }}>
            <span>Total</span>
            <span style={{ color: "#16a34a" }}>₹{orderDone?.reduce((s, i) => s + i.price, 0).toLocaleString()}</span>
          </div>
        </div>
        <button onClick={() => setView("store")} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}>
          Continue Shopping
        </button>
      </div>
    </div>
  );

  // ── CART VIEW ────────────────────────────────────────────
  if (view === "cart") return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 12px rgba(22,163,74,0.3)" }}>
        <button onClick={() => setView("store")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>← Back</button>
        <span style={{ color: "white", fontSize: "17px", fontWeight: "700", flex: 1 }}>Your Cart</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>Hi, {user.name}</span>
      </div>
      <div style={{ padding: "28px 32px", maxWidth: "640px", margin: "0 auto" }}>
        {Object.keys(cart).length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🛒</div>
            <div style={{ fontSize: "15px" }}>Your cart is empty</div>
            <button onClick={() => setView("store")} style={{ marginTop: "16px", padding: "10px 24px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontFamily: "inherit" }}>Browse Medicines</button>
          </div>
        ) : (
          <div>
            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e8eaf0", overflow: "hidden", marginBottom: "16px" }}>
              {Object.entries(cart).map(([medId, qty], i, arr) => {
                const med = medicines.find(m => m.id === medId);
                const price = getPrice(medId);
                return (
                  <div key={medId} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{med?.name}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>{med?.category} · ₹{price} per {med?.unit}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button onClick={() => removeFromCart(medId)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: "16px", fontFamily: "inherit", fontWeight: "700" }}>−</button>
                      <span style={{ fontSize: "14px", fontWeight: "700", minWidth: "20px", textAlign: "center", color: "#111827" }}>{qty}</span>
                      <button onClick={() => addToCart(medId)} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", cursor: "pointer", fontSize: "16px", fontFamily: "inherit", fontWeight: "700" }}>+</button>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", minWidth: "70px", textAlign: "right" }}>₹{(price * qty).toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e8eaf0", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "16px" }}>
                <span>Total</span>
                <span style={{ color: "#16a34a" }}>₹{cartTotal().toLocaleString()}</span>
              </div>
              <button onClick={placeOrder} disabled={ordering} style={{ width: "100%", padding: "13px", background: ordering ? "#d1d5db" : "linear-gradient(135deg, #16a34a, #15803d)", color: "white", border: "none", borderRadius: "12px", fontWeight: "700", fontSize: "14px", cursor: ordering ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: ordering ? "none" : "0 4px 14px rgba(22,163,74,0.3)" }}>
                {ordering ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── ORDER HISTORY VIEW ──────────────────────────────────────
  if (view === "orders") return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 12px rgba(22,163,74,0.3)" }}>
        <button onClick={() => setView("store")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>← Back</button>
        <span style={{ color: "white", fontSize: "17px", fontWeight: "700", flex: 1 }}>My Orders & Bills</span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>Hi, {user.name}</span>
      </div>
      <div style={{ padding: "28px 32px", maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>Order History</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px" }}>Each order shows all items purchased together — download the bill anytime</p>
        <BillsList customerEmail={user.email} medicines={medicines} />
      </div>
    </div>
  );

  // ── STORE VIEW ───────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", padding: "0 32px", height: "64px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 12px rgba(22,163,74,0.3)" }}>
        <div style={{ fontSize: "20px" }}>✚</div>
        <div style={{ color: "white", fontSize: "17px", fontWeight: "700", flex: 1 }}>MedStock <span style={{ opacity: 0.7 }}>— Patient Store</span></div>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>Hi, {user.name}</span>
        <button onClick={() => setView("orders")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
          📋 My Orders
        </button>
        <button onClick={() => setView("cart")} style={{ position: "relative", background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "6px" }}>
          🛒 Cart
          {cartCount() > 0 && <span style={{ background: "#dc2626", color: "white", borderRadius: "10px", padding: "1px 7px", fontSize: "11px", fontWeight: "700" }}>{cartCount()}</span>}
        </button>
        <button onClick={handleLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>Logout</button>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>Browse Medicines</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>{filtered.length} medicines available</p>

        {/* Filters */}
        <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e8eaf0", padding: "16px 20px", marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: "180px" }} />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {categories.map(c => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
          </select>
          <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {units.map(u => <option key={u} value={u}>{u === "all" ? "All unit types" : u}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="name_asc">Name A → Z</option>
            <option value="name_desc">Name Z → A</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="stock_desc">Most in stock</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />
            In stock only
          </label>
        </div>

        {/* Medicine grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>⏳</div>
            Loading medicines...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔍</div>
            No medicines match your filters.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
            {filtered.map(m => {
              const stock = getStock(m.id);
              const price = getPrice(m.id);
              const inCart = cart[m.id] || 0;
              const isLow = stock > 0 && stock < m.threshold;
              return (
                <div key={m.id} style={{
                  background: "white", borderRadius: "14px", border: "1px solid #e8eaf0",
                  padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  display: "flex", flexDirection: "column", gap: "8px",
                  opacity: stock === 0 ? 0.6 : 1
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "10px", fontWeight: "600", padding: "3px 8px", borderRadius: "6px", background: "#eff6ff", color: "#1a237e" }}>{m.category}</span>
                    {isLow && <span style={{ fontSize: "10px", fontWeight: "600", padding: "3px 8px", borderRadius: "6px", background: "#fef3c7", color: "#d97706" }}>Low stock</span>}
                    {stock === 0 && <span style={{ fontSize: "10px", fontWeight: "600", padding: "3px 8px", borderRadius: "6px", background: "#fef2f2", color: "#dc2626" }}>Out of stock</span>}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", lineHeight: "1.3" }}>{m.name}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>{m.unit} · {stock} available</div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#16a34a" }}>₹{price}</div>
                  {(() => {
                    const interactions = checkCustomerInteractions(m.id, cart, medicines);
                    return interactions.length > 0 ? (
                      <div style={{ padding: "6px 8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "11px", color: "#92400e" }}>
                        ⚠️ {interactions[0]}
                      </div>
                    ) : null;
                  })()}
                  {stock > 0 ? (
                    inCart > 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        <button onClick={() => removeFromCart(m.id)} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: "16px", fontWeight: "700" }}>−</button>
                        <span style={{ fontSize: "14px", fontWeight: "700", minWidth: "24px", textAlign: "center", color: "#111827" }}>{inCart}</span>
                        <button onClick={() => addToCart(m.id)} disabled={inCart >= stock} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "none", background: inCart >= stock ? "#d1d5db" : "linear-gradient(135deg, #16a34a, #15803d)", color: "white", cursor: inCart >= stock ? "not-allowed" : "pointer", fontSize: "16px", fontWeight: "700" }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(m.id)} style={{ marginTop: "4px", padding: "9px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(22,163,74,0.25)" }}>
                        Add to Cart
                      </button>
                    )
                  ) : (
                    <button disabled style={{ marginTop: "4px", padding: "9px", background: "#f3f4f6", color: "#9ca3af", border: "none", borderRadius: "10px", fontSize: "13px", fontFamily: "inherit" }}>Out of Stock</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
