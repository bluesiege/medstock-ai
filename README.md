<div align="center">

# 🧬 MedStock AI

### AI-Powered Pharmacy Inventory Management System
**Built for AETRIX 2026 — Healthcare / MedTech Domain**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Python](https://img.shields.io/badge/Python-Flask-3776AB?style=flat-square&logo=python)](https://flask.palletsprojects.com)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=flat-square&logo=scikit-learn)](https://scikit-learn.org)

---

*Eliminating medicine shortages and expiry waste in government hospitals — simultaneously.*

</div>

---

## 🎯 The Problem

Government hospital pharmacies face a paradox — they run out of critical medicines like **insulin and antibiotics** while simultaneously **wasting crores of rupees** on expired stock. Both failures happen at the same time, in the same pharmacy.

The root cause is not a resource problem. **It is an information problem.**

- No system enforcing dispensing order → wrong batches used → medicines expire unused
- No demand forecasting → procurement is guesswork → shortages and overstocking coexist
- No audit trail → zero accountability for what was dispensed and when
- No patient-facing channel → patients must physically visit the pharmacy

---

## 💡 The Solution

MedStock AI solves both failures simultaneously through four mechanisms working together:

| Mechanism | What it does |
|---|---|
| **FEFO Enforcement** | Always dispenses the soonest-expiring batch. Enforced at database query level — cannot be bypassed |
| **Smart Alerts** | Three-tier expiry alerts (7/14/21 days) and stock alerts (50%/75%/100% of threshold) sorted by urgency |
| **ML Demand Forecasting** | Trains 4 algorithms simultaneously, auto-selects best by R² score, removes outliers via IQR |
| **Patient Storefront** | Customers browse and order medicines online — orders reduce inventory via FEFO in real time |

---

## 🖥️ Screenshots

| Homepage | Pharmacist Dispense | Manager Dashboard |
|---|---|---|
| Split-screen login | Live search + FEFO queue | Collapsible alerts + stock table |

| ML Forecast | Customer Store | Admin Waste Analytics |
|---|---|---|
| 4-algorithm comparison | 265 medicines + cart | Expired stock tracking |

---

## 🏗️ Tech Stack

```
Frontend      React + Vite + DM Sans typography
Database      Firebase Firestore (real-time NoSQL)
Auth          Firebase Authentication (role-based)
Hosting       Firebase Hosting (free tier)
ML Server     Python Flask + scikit-learn
PDF           jsPDF + autoTable (client-side)
```

---

## 👥 Roles & Access

| Role | Access |
|---|---|
| **Pharmacist** | Dispense medicines (multi-queue), view FEFO batches, drug interactions, activity log |
| **Store Manager** | Stock overview, alerts, ML forecast, receive stock, waste analytics, PDF reports |
| **Admin** | All manager features + edit database, manage medicines and batches |
| **Customer / Patient** | Browse 265 medicines, cart, checkout, order history, download bills |

---

## 🧠 ML Forecasting Engine

The `/forecast` endpoint trains four models simultaneously on 180 days of dispensing history:

- **Linear Regression** — steady demand (insulin, metformin)
- **Polynomial Regression (deg 2)** — slight demand curves
- **Random Forest** — complex non-linear patterns
- **Gradient Boosting** — irregular / seasonal demand

**Outlier removal** via IQR method before training. **Auto-selects** the model with highest R² score. Confidence scoring: HIGH (R² ≥ 0.85) / MEDIUM (≥ 0.65) / LOW (< 0.65).

---

## 💊 Medicine Dataset

**265 real Indian government hospital medicines** across 19 therapeutic categories:

```
Antibiotic (45)   Antihypertensive (37)   Analgesic (20)   Antidiabetic (21)
Gastrointestinal (20)   Respiratory (15)   Neurological/Psychiatric (20)
Cardiac (13)   Steroid/Hormone (22)   Emergency/IV Fluid (15)   + more
```

Medicines reflect the National List of Essential Medicines (NLEM). 792 batches with staggered expiry dates — designed to trigger all alert levels simultaneously for demo visibility.

---

## ⚡ Key Features

- **Multi-medicine dispense queue** — add multiple medicines in one transaction with combined bill
- **Drug interaction checker** — real-time warnings for known interactions (Warfarin+Aspirin, Digoxin+Amiodarone etc.)
- **Days of stock remaining** — calculated from actual consumption rate, not just quantity
- **Automatic billing** — PDF bill generated and saved on every dispense and customer order
- **User-stamped audit trail** — every transaction logs name, email, and role
- **Database editor** — inline edit medicine details, thresholds, batch quantities, expiry dates
- **Waste analytics** — expired stock value tracking and at-risk medicine identification
- **Customer order history** — expandable bill view with re-download capability
- **Auto batch numbering** — next batch number pre-filled on receive stock
- **Duplicate medicine check** — prevents creating duplicate entries

---

## 🚀 Setup & Running

### Prerequisites
- Node.js v18+
- Python 3.8+
- Firebase account

### Frontend
```bash
npm install
npm run dev          # localhost:5173
```

### ML Server
```bash
pip install flask flask-cors scikit-learn numpy
cd ml_server
python app.py        # localhost:5000
```

### Firebase Configuration
1. Create a Firebase project with Firestore (test mode) and Email/Password Auth
2. Add your `firebaseConfig` to `src/firebase.js`
3. Create a Firestore composite index on `batches`: `medicineId ASC, quantity ASC, expiryDate ASC`
4. Create a `users` collection with email as document ID and `role` + `name` fields
5. Run `seedDatabase()` once to populate 265 medicines and 792 batches

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| pharmacist@hospital.com | pharma123 | Pharmacist |
| manager@hospital.com | manager123 | Store Manager |
| admin@hospital.com | admin123 | Admin |
| customer@gmail.com | customer123 | Customer |

---

## 📁 Project Structure

```
medstock-ai/
├── src/
│   ├── App.jsx              # Root — auth routing, role navigation
│   ├── Login.jsx            # Homepage + login forms
│   ├── firebase.js          # Firebase config + auth functions
│   ├── db.js                # Database layer — FEFO, alerts, all Firestore ops
│   ├── Pharmacist.jsx       # Multi-medicine dispense queue + billing
│   ├── Dashboard.jsx        # Stock overview, alerts, ML forecast
│   ├── ReceiveStock.jsx     # Stock receipt form
│   ├── ActivityLog.jsx      # Unified audit trail
│   ├── EditDatabase.jsx     # Admin database editor
│   ├── WasteAnalytics.jsx   # Waste tracking dashboard
│   ├── CustomerStore.jsx    # Patient storefront + cart + orders
│   ├── ForecastChart.jsx    # Canvas forecast chart
│   ├── PDFReport.js         # Inventory PDF generator
│   └── theme.css            # Design system — tokens, components
├── ml_server/
│   └── app.py               # Flask ML server — 4 algorithms + outlier removal
└── README.md
```

---

## 👨‍💻 Team

| Member | Role | Contribution |
|---|---|---|
| **Kush** | Team Lead | App architecture, Dashboard, Activity Log, Waste Analytics, Receive Stock |
| **Dhairya** | Database | Firebase setup, FEFO engine, alert system, database schema |
| **Aarsh** | Pharmacist UI | Dispense queue, live search, drug interactions, billing |
| **Khushvi** | ML | Flask server, 4-algorithm training, outlier removal, forecast chart |

---

## 🏆 Judging Criteria

| Criteria | MedStock AI |
|---|---|
| **Problem Relevance** | Directly addresses documented government hospital pharmacy failures across India |
| **Innovation** | FEFO + ML + drug interactions + patient storefront — unique combination |
| **Technical Depth** | Full-stack: React, Firebase, Python ML, real-time sync, client-side PDF |
| **Feasibility** | Zero server infrastructure, free Firebase tier, deployable in one day |

---

<div align="center">

Built with ❤️ at **AETRIX 2026** · Healthcare / MedTech Domain

*"This is not a resource problem. It is an information problem."*

</div>
