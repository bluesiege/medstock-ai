import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generateReport(medicines, batches, alerts) {
  const doc = new jsPDF();
  const today = new Date().toDateString();

  // ── HEADER ──────────────────────────────────────────
  doc.setFillColor(26, 35, 126);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("MedStock AI", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Government Hospital Pharmacy Management System", 14, 20);
  doc.text(`Report generated: ${today}`, 14, 26);

  // ── SUMMARY BOXES ───────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Inventory Summary", 14, 40);

  const totalValue = batches.reduce((sum, b) => sum + (b.quantity * (b.unitPrice || 0)), 0);
  const totalMedicines = medicines.length;
  const totalBatches = batches.length;
  const lowStockCount = alerts.filter(a => a.type === "lowstock").length;
  const expiryCount = alerts.filter(a => a.type === "expiry").length;

  const summaryData = [
    ["Total Medicines", totalMedicines],
    ["Total Batches", totalBatches],
    ["Total Inventory Value", `Rs. ${totalValue.toLocaleString()}`],
    ["Low Stock Alerts", lowStockCount],
    ["Expiry Alerts", expiryCount],
  ];

  autoTable(doc, {
    startY: 44,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 240, 255] },
    margin: { left: 14, right: 14 },
  });

  // ── STOCK TABLE ─────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Current Stock Levels", 14, doc.lastAutoTable.finalY + 14);

  const stockMap = {};
  for (const batch of batches) {
    if (!stockMap[batch.medicineId]) stockMap[batch.medicineId] = 0;
    stockMap[batch.medicineId] += batch.quantity;
  }

  const stockRows = medicines.map(m => {
    const qty = stockMap[m.id] || 0;
    const status = qty < m.threshold ? "LOW STOCK" : "OK";
    return [m.name, m.category, `${qty} ${m.unit}s`, m.threshold, status];
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 18,
    head: [["Medicine", "Category", "Current Stock", "Threshold", "Status"]],
    body: stockRows,
    theme: "grid",
    headStyles: { fillColor: [40, 53, 147], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    bodyStyles: { fontSize: 10 },
    didParseCell: function (data) {
      if (data.column.index === 4 && data.cell.raw === "LOW STOCK") {
        data.cell.styles.textColor = [180, 0, 0];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ── ALERTS TABLE ────────────────────────────────────
  if (alerts.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Active Alerts", 14, doc.lastAutoTable.finalY + 14);

    const alertRows = alerts.map(a => [
      a.type === "lowstock" ? "Low Stock" : "Expiry Warning",
      a.message
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [["Alert Type", "Details"]],
      body: alertRows,
      theme: "grid",
      headStyles: { fillColor: [180, 0, 0], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      bodyStyles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
  }

  // ── FOOTER ──────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `MedStock AI — Confidential | Page ${i} of ${pageCount}`,
      105, 290, { align: "center" }
    );
  }

  doc.save(`MedStock_Report_${today.replace(/ /g, "_")}.pdf`);
}
