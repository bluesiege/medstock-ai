import json
import random
from datetime import datetime, timedelta

random.seed(42)

# ── MEDICINE MASTER LIST ─────────────────────────────────────
# Format: (name, category, unit, threshold, unit_price_range)
medicine_templates = [
    # Antibiotics (60)
    ("Amoxicillin 250mg", "Antibiotic", "strip", 30, (40, 60)),
    ("Amoxicillin 500mg", "Antibiotic", "strip", 30, (55, 75)),
    ("Ampicillin 250mg", "Antibiotic", "strip", 25, (35, 50)),
    ("Ampicillin 500mg", "Antibiotic", "strip", 25, (50, 70)),
    ("Azithromycin 250mg", "Antibiotic", "strip", 20, (80, 120)),
    ("Azithromycin 500mg", "Antibiotic", "strip", 20, (120, 160)),
    ("Ciprofloxacin 250mg", "Antibiotic", "strip", 30, (30, 50)),
    ("Ciprofloxacin 500mg", "Antibiotic", "strip", 30, (45, 65)),
    ("Clindamycin 150mg", "Antibiotic", "strip", 20, (90, 130)),
    ("Clindamycin 300mg", "Antibiotic", "strip", 20, (130, 180)),
    ("Co-Amoxiclav 625mg", "Antibiotic", "strip", 25, (120, 160)),
    ("Doxycycline 100mg", "Antibiotic", "strip", 25, (25, 40)),
    ("Erythromycin 250mg", "Antibiotic", "strip", 20, (40, 60)),
    ("Erythromycin 500mg", "Antibiotic", "strip", 20, (60, 85)),
    ("Gentamicin Injection", "Antibiotic", "vial", 15, (30, 50)),
    ("Levofloxacin 250mg", "Antibiotic", "strip", 20, (70, 100)),
    ("Levofloxacin 500mg", "Antibiotic", "strip", 20, (100, 140)),
    ("Linezolid 600mg", "Antibiotic", "strip", 15, (300, 450)),
    ("Meropenem 500mg", "Antibiotic", "vial", 10, (200, 300)),
    ("Metronidazole 200mg", "Antibiotic", "strip", 30, (15, 25)),
    ("Metronidazole 400mg", "Antibiotic", "strip", 30, (20, 35)),
    ("Metronidazole Injection", "Antibiotic", "vial", 15, (40, 60)),
    ("Nitrofurantoin 100mg", "Antibiotic", "strip", 20, (45, 65)),
    ("Norfloxacin 400mg", "Antibiotic", "strip", 25, (35, 55)),
    ("Ofloxacin 200mg", "Antibiotic", "strip", 25, (40, 60)),
    ("Penicillin V 250mg", "Antibiotic", "strip", 20, (20, 35)),
    ("Piperacillin-Tazobactam", "Antibiotic", "vial", 10, (250, 380)),
    ("Rifampicin 150mg", "Antibiotic", "strip", 20, (15, 25)),
    ("Rifampicin 450mg", "Antibiotic", "strip", 20, (35, 55)),
    ("Streptomycin Injection", "Antibiotic", "vial", 10, (25, 40)),
    ("Tetracycline 250mg", "Antibiotic", "strip", 20, (15, 25)),
    ("Trimethoprim 100mg", "Antibiotic", "strip", 20, (20, 30)),
    ("Vancomycin 500mg", "Antibiotic", "vial", 10, (350, 500)),
    ("Cefixime 200mg", "Antibiotic", "strip", 25, (80, 120)),
    ("Cefpodoxime 200mg", "Antibiotic", "strip", 20, (100, 140)),
    ("Ceftriaxone 1g", "Antibiotic", "vial", 15, (60, 90)),
    ("Ceftriaxone 250mg", "Antibiotic", "vial", 15, (30, 50)),
    ("Cephalexin 250mg", "Antibiotic", "strip", 25, (30, 45)),
    ("Cephalexin 500mg", "Antibiotic", "strip", 25, (45, 65)),
    ("Clarithromycin 250mg", "Antibiotic", "strip", 20, (120, 160)),
    ("Cloxacillin 250mg", "Antibiotic", "strip", 20, (35, 55)),
    ("Flucloxacillin 250mg", "Antibiotic", "strip", 20, (40, 60)),
    ("Imipenem 500mg", "Antibiotic", "vial", 10, (300, 450)),
    ("Nalidixic Acid 500mg", "Antibiotic", "strip", 20, (25, 40)),
    ("Chloramphenicol 250mg", "Antibiotic", "strip", 20, (20, 30)),
    # Analgesics / Anti-inflammatory (40)
    ("Paracetamol 500mg", "Analgesic", "strip", 50, (8, 15)),
    ("Paracetamol 650mg", "Analgesic", "strip", 50, (10, 18)),
    ("Paracetamol Injection", "Analgesic", "vial", 20, (35, 55)),
    ("Ibuprofen 200mg", "Analgesic", "strip", 40, (12, 20)),
    ("Ibuprofen 400mg", "Analgesic", "strip", 40, (18, 28)),
    ("Ibuprofen 600mg", "Analgesic", "strip", 30, (25, 38)),
    ("Diclofenac 50mg", "Analgesic", "strip", 35, (15, 25)),
    ("Diclofenac 75mg Injection", "Analgesic", "vial", 20, (20, 35)),
    ("Aspirin 75mg", "Analgesic", "strip", 40, (8, 15)),
    ("Aspirin 150mg", "Analgesic", "strip", 35, (10, 18)),
    ("Tramadol 50mg", "Analgesic", "strip", 25, (30, 50)),
    ("Tramadol Injection", "Analgesic", "vial", 15, (25, 40)),
    ("Morphine 10mg Injection", "Analgesic", "vial", 10, (40, 65)),
    ("Ketorolac Injection", "Analgesic", "vial", 15, (30, 50)),
    ("Naproxen 250mg", "Analgesic", "strip", 25, (20, 35)),
    ("Naproxen 500mg", "Analgesic", "strip", 25, (30, 45)),
    ("Mefenamic Acid 250mg", "Analgesic", "strip", 30, (15, 25)),
    ("Mefenamic Acid 500mg", "Analgesic", "strip", 30, (22, 35)),
    ("Celecoxib 100mg", "Analgesic", "strip", 20, (45, 70)),
    ("Etoricoxib 60mg", "Analgesic", "strip", 20, (55, 80)),
    # Antidiabetics (30)
    ("Metformin 500mg", "Antidiabetic", "strip", 40, (15, 25)),
    ("Metformin 850mg", "Antidiabetic", "strip", 35, (20, 32)),
    ("Metformin 1000mg", "Antidiabetic", "strip", 35, (25, 38)),
    ("Glibenclamide 5mg", "Antidiabetic", "strip", 30, (10, 18)),
    ("Glipizide 5mg", "Antidiabetic", "strip", 25, (15, 25)),
    ("Glimepiride 1mg", "Antidiabetic", "strip", 25, (20, 32)),
    ("Glimepiride 2mg", "Antidiabetic", "strip", 25, (28, 42)),
    ("Sitagliptin 50mg", "Antidiabetic", "strip", 20, (80, 120)),
    ("Sitagliptin 100mg", "Antidiabetic", "strip", 20, (120, 160)),
    ("Vildagliptin 50mg", "Antidiabetic", "strip", 20, (75, 110)),
    ("Pioglitazone 15mg", "Antidiabetic", "strip", 20, (30, 50)),
    ("Pioglitazone 30mg", "Antidiabetic", "strip", 20, (45, 65)),
    ("Insulin Regular 40IU", "Antidiabetic", "vial", 15, (150, 200)),
    ("Insulin NPH 40IU", "Antidiabetic", "vial", 15, (160, 210)),
    ("Insulin Glargine", "Antidiabetic", "vial", 10, (800, 1000)),
    ("Insulin Aspart", "Antidiabetic", "vial", 10, (850, 1050)),
    ("Dapagliflozin 10mg", "Antidiabetic", "strip", 15, (120, 160)),
    ("Empagliflozin 10mg", "Antidiabetic", "strip", 15, (130, 170)),
    ("Acarbose 50mg", "Antidiabetic", "strip", 20, (35, 55)),
    ("Repaglinide 0.5mg", "Antidiabetic", "strip", 20, (40, 60)),
    # Antihypertensives / Cardiac (50)
    ("Amlodipine 2.5mg", "Antihypertensive", "strip", 30, (20, 35)),
    ("Amlodipine 5mg", "Antihypertensive", "strip", 30, (25, 40)),
    ("Amlodipine 10mg", "Antihypertensive", "strip", 25, (35, 55)),
    ("Atenolol 25mg", "Antihypertensive", "strip", 30, (15, 25)),
    ("Atenolol 50mg", "Antihypertensive", "strip", 30, (20, 32)),
    ("Atenolol 100mg", "Antihypertensive", "strip", 25, (28, 42)),
    ("Enalapril 2.5mg", "Antihypertensive", "strip", 25, (15, 25)),
    ("Enalapril 5mg", "Antihypertensive", "strip", 25, (20, 32)),
    ("Enalapril 10mg", "Antihypertensive", "strip", 25, (25, 38)),
    ("Losartan 25mg", "Antihypertensive", "strip", 25, (30, 45)),
    ("Losartan 50mg", "Antihypertensive", "strip", 25, (40, 60)),
    ("Losartan 100mg", "Antihypertensive", "strip", 20, (55, 80)),
    ("Telmisartan 20mg", "Antihypertensive", "strip", 20, (35, 55)),
    ("Telmisartan 40mg", "Antihypertensive", "strip", 20, (45, 65)),
    ("Telmisartan 80mg", "Antihypertensive", "strip", 20, (60, 85)),
    ("Ramipril 2.5mg", "Antihypertensive", "strip", 20, (25, 40)),
    ("Ramipril 5mg", "Antihypertensive", "strip", 20, (35, 52)),
    ("Ramipril 10mg", "Antihypertensive", "strip", 20, (45, 65)),
    ("Lisinopril 5mg", "Antihypertensive", "strip", 20, (20, 35)),
    ("Lisinopril 10mg", "Antihypertensive", "strip", 20, (28, 42)),
    ("Hydrochlorothiazide 12.5mg", "Antihypertensive", "strip", 25, (10, 18)),
    ("Hydrochlorothiazide 25mg", "Antihypertensive", "strip", 25, (12, 20)),
    ("Furosemide 20mg", "Antihypertensive", "strip", 30, (8, 15)),
    ("Furosemide 40mg", "Antihypertensive", "strip", 30, (10, 18)),
    ("Furosemide Injection", "Antihypertensive", "vial", 15, (20, 35)),
    ("Spironolactone 25mg", "Antihypertensive", "strip", 20, (20, 32)),
    ("Spironolactone 50mg", "Antihypertensive", "strip", 20, (30, 45)),
    ("Bisoprolol 2.5mg", "Antihypertensive", "strip", 20, (30, 48)),
    ("Bisoprolol 5mg", "Antihypertensive", "strip", 20, (40, 60)),
    ("Carvedilol 3.125mg", "Antihypertensive", "strip", 20, (35, 55)),
    ("Carvedilol 6.25mg", "Antihypertensive", "strip", 20, (45, 68)),
    ("Metoprolol 25mg", "Antihypertensive", "strip", 25, (20, 32)),
    ("Metoprolol 50mg", "Antihypertensive", "strip", 25, (28, 42)),
    ("Nifedipine 5mg", "Antihypertensive", "strip", 20, (15, 25)),
    ("Nifedipine 10mg", "Antihypertensive", "strip", 20, (20, 32)),
    ("Verapamil 40mg", "Antihypertensive", "strip", 20, (25, 40)),
    ("Diltiazem 30mg", "Antihypertensive", "strip", 20, (22, 35)),
    ("Digoxin 0.25mg", "Cardiac", "strip", 20, (15, 25)),
    ("Warfarin 1mg", "Cardiac", "strip", 15, (20, 35)),
    ("Warfarin 5mg", "Cardiac", "strip", 15, (40, 60)),
    ("Heparin Injection", "Cardiac", "vial", 10, (80, 120)),
    ("Clopidogrel 75mg", "Cardiac", "strip", 20, (35, 55)),
    ("Atorvastatin 10mg", "Cardiac", "strip", 25, (30, 48)),
    ("Atorvastatin 20mg", "Cardiac", "strip", 25, (40, 60)),
    ("Atorvastatin 40mg", "Cardiac", "strip", 20, (55, 80)),
    ("Rosuvastatin 5mg", "Cardiac", "strip", 20, (45, 68)),
    ("Rosuvastatin 10mg", "Cardiac", "strip", 20, (60, 90)),
    ("Isosorbide Mononitrate", "Cardiac", "strip", 20, (25, 40)),
    ("Nitroglycerin Injection", "Cardiac", "vial", 10, (150, 220)),
    ("Amiodarone 100mg", "Cardiac", "strip", 15, (80, 120)),
    # Gastrointestinal (30)
    ("Omeprazole 20mg", "Gastrointestinal", "strip", 40, (18, 28)),
    ("Omeprazole 40mg", "Gastrointestinal", "strip", 35, (28, 42)),
    ("Pantoprazole 20mg", "Gastrointestinal", "strip", 35, (20, 32)),
    ("Pantoprazole 40mg", "Gastrointestinal", "strip", 35, (28, 45)),
    ("Rabeprazole 10mg", "Gastrointestinal", "strip", 30, (22, 35)),
    ("Rabeprazole 20mg", "Gastrointestinal", "strip", 30, (30, 48)),
    ("Ranitidine 150mg", "Gastrointestinal", "strip", 30, (12, 20)),
    ("Domperidone 10mg", "Gastrointestinal", "strip", 35, (15, 25)),
    ("Ondansetron 4mg", "Gastrointestinal", "strip", 30, (25, 40)),
    ("Ondansetron 8mg Injection", "Gastrointestinal", "vial", 15, (30, 48)),
    ("Metoclopramide 10mg", "Gastrointestinal", "strip", 25, (10, 18)),
    ("Loperamide 2mg", "Gastrointestinal", "strip", 25, (15, 25)),
    ("ORS Sachet", "Gastrointestinal", "sachet", 50, (5, 10)),
    ("Antacid Suspension", "Gastrointestinal", "bottle", 20, (35, 55)),
    ("Lactulose Syrup", "Gastrointestinal", "bottle", 15, (80, 120)),
    ("Bisacodyl 5mg", "Gastrointestinal", "strip", 25, (12, 20)),
    ("Dicyclomine 10mg", "Gastrointestinal", "strip", 25, (15, 25)),
    ("Mesalazine 400mg", "Gastrointestinal", "strip", 15, (120, 180)),
    ("Sucralfate 1g", "Gastrointestinal", "strip", 20, (25, 40)),
    ("Zinc Sulphate Syrup", "Gastrointestinal", "bottle", 20, (40, 60)),
    # Respiratory (25)
    ("Salbutamol 2mg", "Respiratory", "strip", 30, (12, 20)),
    ("Salbutamol 4mg", "Respiratory", "strip", 30, (15, 25)),
    ("Salbutamol Inhaler", "Respiratory", "inhaler", 20, (80, 120)),
    ("Salbutamol Nebulisation", "Respiratory", "vial", 15, (15, 25)),
    ("Budesonide Inhaler", "Respiratory", "inhaler", 15, (200, 300)),
    ("Budesonide Nebulisation", "Respiratory", "vial", 15, (40, 60)),
    ("Formoterol 12mcg", "Respiratory", "inhaler", 15, (180, 260)),
    ("Montelukast 4mg", "Respiratory", "strip", 25, (35, 55)),
    ("Montelukast 10mg", "Respiratory", "strip", 25, (45, 68)),
    ("Ipratropium Inhaler", "Respiratory", "inhaler", 10, (150, 220)),
    ("Theophylline 100mg", "Respiratory", "strip", 20, (15, 25)),
    ("Theophylline 200mg", "Respiratory", "strip", 20, (20, 32)),
    ("Dextromethorphan Syrup", "Respiratory", "bottle", 20, (35, 55)),
    ("Levosalbutamol 1mg", "Respiratory", "strip", 20, (18, 28)),
    ("Beclomethasone Inhaler", "Respiratory", "inhaler", 10, (160, 240)),
    # Neurological / Psychiatric (25)
    ("Phenobarbitone 30mg", "Neurological", "strip", 20, (10, 18)),
    ("Phenobarbitone 60mg", "Neurological", "strip", 20, (12, 20)),
    ("Phenytoin 50mg", "Neurological", "strip", 20, (12, 20)),
    ("Phenytoin 100mg", "Neurological", "strip", 20, (18, 28)),
    ("Carbamazepine 100mg", "Neurological", "strip", 20, (15, 25)),
    ("Carbamazepine 200mg", "Neurological", "strip", 20, (22, 35)),
    ("Valproic Acid 200mg", "Neurological", "strip", 20, (20, 32)),
    ("Valproic Acid 500mg", "Neurological", "strip", 20, (35, 55)),
    ("Levetiracetam 250mg", "Neurological", "strip", 15, (45, 68)),
    ("Levetiracetam 500mg", "Neurological", "strip", 15, (70, 100)),
    ("Diazepam 2mg", "Neurological", "strip", 15, (8, 15)),
    ("Diazepam 5mg", "Neurological", "strip", 15, (10, 18)),
    ("Diazepam Injection", "Neurological", "vial", 10, (20, 32)),
    ("Haloperidol 1.5mg", "Psychiatric", "strip", 15, (12, 20)),
    ("Haloperidol 5mg", "Psychiatric", "strip", 15, (18, 28)),
    ("Chlorpromazine 25mg", "Psychiatric", "strip", 15, (10, 18)),
    ("Chlorpromazine 100mg", "Psychiatric", "strip", 15, (15, 25)),
    ("Risperidone 1mg", "Psychiatric", "strip", 15, (35, 55)),
    ("Risperidone 2mg", "Psychiatric", "strip", 15, (50, 75)),
    ("Clonazepam 0.5mg", "Neurological", "strip", 15, (15, 25)),
    # Vitamins / Supplements (30)
    ("Vitamin B Complex", "Vitamin", "strip", 40, (10, 18)),
    ("Vitamin C 500mg", "Vitamin", "strip", 35, (12, 20)),
    ("Vitamin D3 60000IU", "Vitamin", "sachet", 25, (25, 40)),
    ("Vitamin B12 500mcg", "Vitamin", "strip", 25, (20, 32)),
    ("Folic Acid 5mg", "Vitamin", "strip", 30, (8, 15)),
    ("Iron + Folic Acid", "Vitamin", "strip", 35, (10, 18)),
    ("Ferrous Sulphate 200mg", "Vitamin", "strip", 30, (8, 15)),
    ("Calcium + Vitamin D", "Vitamin", "strip", 30, (18, 28)),
    ("Zinc Sulphate 10mg", "Vitamin", "strip", 25, (10, 18)),
    ("Multivitamin Syrup", "Vitamin", "bottle", 20, (55, 80)),
    ("Thiamine 100mg", "Vitamin", "strip", 20, (10, 18)),
    ("Pyridoxine 10mg", "Vitamin", "strip", 20, (8, 15)),
    ("Nicotinamide 100mg", "Vitamin", "strip", 20, (8, 15)),
    ("Vitamin A Capsule", "Vitamin", "strip", 20, (12, 20)),
    ("Vitamin E 200IU", "Vitamin", "strip", 20, (18, 28)),
    # Hormones / Steroids (20)
    ("Dexamethasone 0.5mg", "Steroid", "strip", 20, (10, 18)),
    ("Dexamethasone 4mg Injection", "Steroid", "vial", 15, (20, 32)),
    ("Hydrocortisone Injection", "Steroid", "vial", 10, (35, 55)),
    ("Prednisolone 5mg", "Steroid", "strip", 25, (8, 15)),
    ("Prednisolone 10mg", "Steroid", "strip", 25, (12, 20)),
    ("Methylprednisolone 4mg", "Steroid", "strip", 20, (35, 55)),
    ("Betamethasone 0.5mg", "Steroid", "strip", 15, (15, 25)),
    ("Thyroxine 25mcg", "Hormone", "strip", 20, (15, 25)),
    ("Thyroxine 50mcg", "Hormone", "strip", 20, (20, 32)),
    ("Thyroxine 100mcg", "Hormone", "strip", 20, (25, 40)),
    ("Oxytocin Injection", "Hormone", "vial", 10, (25, 40)),
    ("Ergometrine Injection", "Hormone", "vial", 10, (20, 35)),
    ("Progesterone 100mg", "Hormone", "strip", 15, (60, 90)),
    ("Testosterone Injection", "Hormone", "vial", 10, (80, 120)),
    ("Insulin Mixtard 30/70", "Antidiabetic", "vial", 15, (180, 240)),
    # Antiparasitic / Antifungal (20)
    ("Albendazole 400mg", "Antiparasitic", "strip", 20, (15, 25)),
    ("Mebendazole 100mg", "Antiparasitic", "strip", 20, (12, 20)),
    ("Metronidazole 200mg Syrup", "Antiparasitic", "bottle", 15, (25, 40)),
    ("Chloroquine 250mg", "Antiparasitic", "strip", 20, (10, 18)),
    ("Artemether 20mg", "Antiparasitic", "strip", 15, (30, 48)),
    ("Primaquine 7.5mg", "Antiparasitic", "strip", 15, (12, 20)),
    ("Ivermectin 6mg", "Antiparasitic", "strip", 15, (15, 25)),
    ("Fluconazole 50mg", "Antifungal", "strip", 20, (35, 55)),
    ("Fluconazole 150mg", "Antifungal", "strip", 20, (55, 80)),
    ("Itraconazole 100mg", "Antifungal", "strip", 15, (80, 120)),
    ("Clotrimazole Cream", "Antifungal", "tube", 20, (30, 48)),
    ("Nystatin Oral Drops", "Antifungal", "bottle", 15, (45, 68)),
    ("Terbinafine 250mg", "Antifungal", "strip", 15, (60, 90)),
    ("Ketoconazole 200mg", "Antifungal", "strip", 15, (40, 60)),
    ("Griseofulvin 125mg", "Antifungal", "strip", 15, (20, 32)),
    # Ophthalmic / ENT (15)
    ("Ciprofloxacin Eye Drops", "Ophthalmic", "bottle", 15, (30, 48)),
    ("Chloramphenicol Eye Drops", "Ophthalmic", "bottle", 15, (20, 32)),
    ("Timolol Eye Drops", "Ophthalmic", "bottle", 10, (35, 55)),
    ("Pilocarpine Eye Drops", "Ophthalmic", "bottle", 10, (25, 40)),
    ("Dexamethasone Eye Drops", "Ophthalmic", "bottle", 10, (30, 48)),
    ("Otrivin Nasal Drops", "ENT", "bottle", 15, (40, 60)),
    ("Beclomethasone Nasal Spray", "ENT", "bottle", 10, (80, 120)),
    ("Cetirizine 10mg", "Antiallergic", "strip", 30, (12, 20)),
    ("Loratadine 10mg", "Antiallergic", "strip", 25, (15, 25)),
    ("Fexofenadine 120mg", "Antiallergic", "strip", 20, (35, 55)),
    ("Promethazine 25mg", "Antiallergic", "strip", 20, (15, 25)),
    ("Chlorpheniramine 4mg", "Antiallergic", "strip", 25, (8, 15)),
    ("Betahistine 8mg", "ENT", "strip", 20, (25, 40)),
    ("Betahistine 16mg", "ENT", "strip", 20, (35, 55)),
    ("Cinnarizine 25mg", "ENT", "strip", 20, (15, 25)),
    # Emergency / IV Fluids (20)
    ("Normal Saline 500ml", "IV Fluid", "bottle", 20, (35, 55)),
    ("Normal Saline 1000ml", "IV Fluid", "bottle", 15, (55, 80)),
    ("Ringer Lactate 500ml", "IV Fluid", "bottle", 20, (38, 58)),
    ("Ringer Lactate 1000ml", "IV Fluid", "bottle", 15, (58, 85)),
    ("Dextrose 5% 500ml", "IV Fluid", "bottle", 20, (40, 60)),
    ("Dextrose 25% 100ml", "IV Fluid", "bottle", 15, (30, 48)),
    ("Dextrose 50% 50ml", "IV Fluid", "vial", 15, (25, 40)),
    ("Mannitol 20% 100ml", "IV Fluid", "bottle", 10, (80, 120)),
    ("Adrenaline Injection", "Emergency", "vial", 10, (25, 40)),
    ("Atropine Injection", "Emergency", "vial", 10, (20, 32)),
    ("Dopamine Injection", "Emergency", "vial", 10, (60, 90)),
    ("Sodium Bicarbonate Injection", "Emergency", "vial", 10, (30, 48)),
    ("Calcium Gluconate Injection", "Emergency", "vial", 10, (30, 48)),
    ("Potassium Chloride Injection", "Emergency", "vial", 10, (25, 40)),
    ("Magnesium Sulphate Injection", "Emergency", "vial", 10, (30, 48)),
]

# ── GENERATE MEDICINES AND BATCHES ──────────────────────────
today = datetime(2026, 3, 21)

medicines_out = []
batches_out = []

for i, (name, category, unit, threshold, price_range) in enumerate(medicine_templates[:500]):
    med_id = name.lower().replace(" ", "_").replace("/", "_").replace(".", "").replace("+", "plus").replace("%", "pct")
    med_id = ''.join(c for c in med_id if c.isalnum() or c == '_')

    medicines_out.append({
        "id": med_id,
        "name": name,
        "category": category,
        "unit": unit,
        "threshold": threshold
    })

    # Generate 2-4 batches per medicine with varied expiry dates
    num_batches = random.randint(2, 4)
    prefix = ''.join([w[0] for w in name.split()[:3]]).upper()

    # Expiry scenarios to trigger different alert levels
    expiry_scenarios = [
        # Urgent (within 7 days)
        today + timedelta(days=random.randint(3, 7)),
        # Warning (8-14 days)
        today + timedelta(days=random.randint(8, 14)),
        # Reminder (15-21 days)
        today + timedelta(days=random.randint(15, 21)),
        # Safe - few months
        today + timedelta(days=random.randint(60, 180)),
        # Safe - 6-12 months
        today + timedelta(days=random.randint(180, 365)),
        # Safe - over a year
        today + timedelta(days=random.randint(365, 730)),
    ]

    for j in range(num_batches):
        batch_num = str(j + 1).zfill(3)
        batch_id = f"{prefix}-{batch_num}"

        # First batch of first 5 medicines gets urgent expiry for demo
        if i < 5 and j == 0:
            expiry = expiry_scenarios[i % 3]
            qty = random.randint(3, 12)  # Low qty to trigger stock alert too
        elif j == 0:
            # First batch — mix of expiry scenarios
            expiry = random.choice(expiry_scenarios[2:])
            qty = random.randint(10, 50)
        else:
            # Later batches — mostly safe
            expiry = random.choice(expiry_scenarios[3:])
            qty = random.randint(20, 100)

        unit_price = random.randint(price_range[0], price_range[1])

        batches_out.append({
            "medicineId": med_id,
            "batchNo": batch_id,
            "expiryDate": expiry.strftime("%Y-%m-%d"),
            "quantity": qty,
            "unitPrice": unit_price
        })

print(f"Generated {len(medicines_out)} medicines and {len(batches_out)} batches")

# Save to JSON
with open("seed_data.json", "w") as f:
    json.dump({"medicines": medicines_out, "batches": batches_out}, f, indent=2)

print("Saved to seed_data.json")
print(f"\nCategory breakdown:")
from collections import Counter
cats = Counter(m["category"] for m in medicines_out)
for cat, count in sorted(cats.items()):
    print(f"  {cat}: {count}")
EOF