/**
 * AIIMS Rishikesh CNE — Standardized Master Medical & Nursing Topic Suggestions.
 * ONE active source-of-truth for topic suggestions AND clinical abbreviations.
 * Candidate vocabulary (clinical educator review required before go-live).
 * Based on historical subjects, editorial normalization, and topic coverage reviewed
 * using NIH MedlinePlus, NLM MeSH, WHO ICD-11/patient-safety and clinical references.
 * This is NOT a downloaded SNOMED CT/MeSH/WHO terminology corpus.
 * Display format: expanded clinical name first; abbreviation in parentheses.
 * Aliases are search-only: never display aliases as preferred suggestions.
 * No history/source/status badges are part of suggestion data.
 * Do not silently expand ambiguous abbreviations, make diagnoses, or rewrite a
 * user's saved topic without explicit selection.
 */
export interface StandardizedCneSuggestion {
  title: string;
  aliases: readonly string[];
  category: string;    // internal ranking/filter only; not a user-facing badge
  kind: 'topic' | 'cne-topic' | 'term';
  nursingContext?: 'condition'; // editor-reviewed eligibility for nursing-topic title templates
}

export const STANDARDIZED_CNE_MASTER_SUGGESTIONS: readonly StandardizedCneSuggestion[] = [
  { title: "Abnormal Uterine Bleeding (AUB)", aliases: ["AUB", "DUB", "dysfunctional uterine bleeding"], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Achalasia", aliases: ["Achalasia Cardia"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Acid–Base Balance", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Acquired Immunodeficiency Syndrome (AIDS)", aliases: ["AIDS"], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Acromegaly", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Acute Airway Obstruction", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Acute Cholecystitis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Acute Coronary Syndrome (ACS)", aliases: ["ACS"], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Acute Coronary Syndrome (ACS): Recognition and Nursing Management", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Acute Decompensated Heart Failure", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Acute Exacerbation of Chronic Obstructive Pulmonary Disease (AECOPD)", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Acute Gastritis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Acute Kidney Injury (AKI)", aliases: ["AKI", "acute renal failure"], category: "Renal and urology", kind: "topic", nursingContext: "condition" },
  { title: "Acute Leukemia", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Acute Liver Failure", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Acute Lymphoblastic Leukemia (ALL)", aliases: ["ALL"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Acute Myeloid Leukemia (AML)", aliases: ["AML"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Acute Myocardial Infarction (AMI)", aliases: ["acute MI", "AMI"], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Acute Pancreatitis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Acute Poisoning", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Acute Psychosis", aliases: [], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Acute Respiratory Distress Syndrome (ARDS)", aliases: ["ARDS"], category: "Respiratory and critical care", kind: "topic", nursingContext: "condition" },
  { title: "Acute Respiratory Failure", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Acute Tubular Necrosis (ATN)", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Addison Disease", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Adenomyosis", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Adjuvant Chemotherapy", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Adnexal Mass", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Adrenal Insufficiency", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Advanced Cardiovascular Life Support (ACLS)", aliases: ["ACLS", "advanced cardiac life support"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Advanced Wound Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Advanced Wound Care Skills Workshop", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Adverse Drug Reaction (ADR)", aliases: ["ADR", "Adverse Drug Reactions"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Adverse Drug Reaction (ADR) Reporting", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Airborne Precautions", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Airway Assessment and Management", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Airway Emergency Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Airway Management during Anesthesia", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Airway Suctioning", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Airway Suctioning and Infection Prevention", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Alcohol Withdrawal Syndrome", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Alzheimer Disease", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Amniotic Fluid Embolism", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Anaphylactic Shock", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Anaphylaxis", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Anaphylaxis Recognition", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Anemia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Anesthesia Workstation Safety", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Anophthalmia", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Antenatal Care (ANC)", aliases: ["ANC"], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Antepartum Hemorrhage", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Antibiotic Resistance", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Anticoagulant Therapy: Nursing Monitoring", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Antimicrobial Resistance (AMR)", aliases: ["AMR"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Antimicrobial Stewardship (AMS)", aliases: ["AMS"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Anxiety Disorder", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Anxiety Disorders", aliases: [], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Aortic Aneurysm", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Aortic Dissection", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Aortic Regurgitation", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Aortic Stenosis", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Aplastic Anemia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Appendicitis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Arterial Blood Gas (ABG)", aliases: ["ABG"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Arterial Blood Gas (ABG) and Venous Blood Gas (VBG) Analysis", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Arterial Blood Gas (ABG) Interpretation", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Arterial Blood Gas (ABG) Sampling", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Arterial Blood Gas (ABG) Sampling and Interpretation", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Arterial Blood Gas Analysis", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Arteriovenous Fistula (AVF)", aliases: ["AVF"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Arteriovenous Fistula (AVF) Assessment and Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Arteriovenous Fistula (AVF) Assessment and Protection", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Arteriovenous Fistula Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Arteriovenous Graft (AVG)", aliases: ["AVG"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Arteriovenous Graft (AVG) Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Arteriovenous Malformation (AVM)", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Ascites", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Aseptic Non-Touch Technique (ANTT)", aliases: ["ANTT"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Aseptic Technique", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Aspiration Pneumonia", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Aspiration Prevention", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Assessment of the Unconscious Patient", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Atrial Fibrillation (AF)", aliases: ["AF"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Atrial Flutter", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Atrioventricular Block", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Augmentation of Labour", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Autoimmune Encephalitis", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Basic Life Support (BLS)", aliases: ["BLS"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Basic Medical Skills Workshop", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Basic Neonatal Resuscitation", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Benign Prostatic Hyperplasia (BPH)", aliases: ["BPH"], category: "Renal and urology", kind: "topic" },
  { title: "Bilevel Positive Airway Pressure (BiPAP)", aliases: ["BIPAP"], category: "Respiratory and critical care", kind: "topic" },
  { title: "Biliary Obstruction", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Biomedical Waste (BMW)", aliases: ["BMW"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Biomedical Waste Management (BMWM)", aliases: ["BMWM"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Biomedical Waste Segregation", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Biomedical Waste Segregation and Disposal", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Bipolar Affective Disorder (BPAD)", aliases: ["BPAD"], category: "Psychiatry and communication", kind: "topic" },
  { title: "Bronchopulmonary Dysplasia (BPD)", aliases: ["BPD"], category: "Neonatology and pediatric nursing", kind: "topic", nursingContext: "condition" },
  { title: "Bipolar Disorder", aliases: ["bipolar disorder", "BPD"], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Bladder Cancer", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Bladder Stones", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Bladder Tumour", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Blood Component Administration and Patient Monitoring", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Blood Component Therapy", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Blood Grouping and Crossmatching", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Blood Product Administration", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Blood Product Labelling and Identification", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Blood Transfusion", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Blood Transfusion Reaction Management", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Blood Transfusion Reaction Recognition and Escalation", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Blood Transfusion Reactions", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Blood Transfusion Safety and Reaction Management", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Bone Marrow Transplantation (BMT)", aliases: ["BMT"], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Bowel Irrigation", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Brachial Plexus Injury", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Braden Scale for Pressure Injury Risk Assessment", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Bradyarrhythmias", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Brain Abscess", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Breast Cancer", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Breast Cancer: Self-Examination and Postoperative Exercises", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Breast Self-Examination (BSE)", aliases: ["BSE"], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Breastfeeding Counseling", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Breastfeeding Counselling", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Breastfeeding Support in Neonatal Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Bronchial Asthma", aliases: [], category: "Respiratory and critical care", kind: "topic", nursingContext: "condition" },
  { title: "Bronchiectasis", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Bronchiolitis", aliases: [], category: "Respiratory and critical care", kind: "topic", nursingContext: "condition" },
  { title: "Bronchoscopy Nursing Assistance", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Burn Injury Assessment", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Burn Wound Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Burnout Prevention", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Burns", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Burns and Fluid Resuscitation", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Caesarean Section: Perioperative Care", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Cancer Pain Management", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Carbon Monoxide Poisoning", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Cardiac Arrest", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiac Arrest: Recognition and Resuscitation", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Cardiac Arrhythmia", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Cardiac Catheterization", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiac Pacemaker Nursing Care", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiac Rehabilitation and Lifestyle Modification", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Cardiac Resynchronization Therapy (CRT)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiac Rhythm Interpretation", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiac Tamponade", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiogenic Shock", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiopulmonary Resuscitation (CPR)", aliases: ["CPR"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardiotocography (CTG)", aliases: ["CTG"], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Cardiovascular Risk Assessment", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cardioversion", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Care of Patients Receiving Mechanical Ventilation", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Care of Patients with Intellectual Disability", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Cast and Splint Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Cataract", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Catatonia", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Catheter Care Bundle", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Catheter-Associated Urinary Tract Infection (CAUTI)", aliases: ["CAUTI"], category: "Renal and urology", kind: "topic" },
  { title: "Catheter-Associated Urinary Tract Infection (CAUTI) Prevention", aliases: ["catheter associated UTI prevention", "CAUTI"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Catheter-Associated Urinary Tract Infection (CAUTI) Prevention Bundle", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Celiac Disease", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Cellulitis", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Central Cord Syndrome", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Central Line Maintenance Bundle", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Central Line-associated Bloodstream Infection", aliases: ["CLABSI"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Central Line-Associated Bloodstream Infection (CLABSI) Care Bundle", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Central Line-Associated Bloodstream Infection (CLABSI) Prevention", aliases: ["central line associated blood stream infection", "CLABSI"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Central Sterile Services Department (CSSD) Processes", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Central Sterile Services Department (CSSD) Workflow", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Central Sterile Supply Department (CSSD)", aliases: ["CSSD"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Central Venous Access in Oncology", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Central Venous Pressure (CVP)", aliases: ["CVP"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Central Venous Pressure (CVP) Monitoring", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Cerebral Aneurysm", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Cerebral Palsy", aliases: [], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Cerebral Venous Sinus Thrombosis (CVST)", aliases: ["CVST"], category: "Neurosciences", kind: "topic" },
  { title: "Cervical Canal Stenosis", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Cervical Cancer", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Cesarean Section Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Cesarean Section: Preoperative and Postoperative Nursing Care", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "cne-topic" },
  { title: "Chemoport Access and Care", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Chemotherapy", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Chemotherapy Administration", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Chemotherapy Extravasation", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Chemotherapy Extravasation Prevention and Response", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Chemotherapy Preparation and Administration Safety", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Chemotherapy Preparation and Handling", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Chest Pain Assessment and Triage", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Chest Physiotherapy", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Chest Trauma", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Child Protection and Safeguarding", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Cholecystitis", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Choledocholithiasis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Cholelithiasis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Chronic Cholecystitis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Chronic Gastritis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Chronic Kidney Disease (CKD)", aliases: ["CKD"], category: "Renal and urology", kind: "topic", nursingContext: "condition" },
  { title: "Chronic Liver Disease (CLD)", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Chronic Lymphocytic Leukemia (CLL)", aliases: ["CLL"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Chronic Myeloid Leukemia (CML)", aliases: ["CML"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Chronic Obstructive Pulmonary Disease (COPD)", aliases: ["COPD"], category: "Respiratory and critical care", kind: "topic", nursingContext: "condition" },
  { title: "Chronic Pancreatitis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Chronic Respiratory Failure", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Cirrhosis", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Cleft Lip and Palate", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Clinical Audit and Quality Improvement", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Clinical Audit, Incident Reporting and Quality Improvement", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "Clinical Data Documentation", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Clinical Documentation Standards", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Clinical Nursing Care Plan (CNCP)", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Clinical Nursing Documentation", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Clinical Nutrition", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Clinical Research Methodology: from Protocol to Publication", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "Clinical Skills Laboratory Training", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Closed Fracture Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Coloboma", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Colonoscopy Preparation and Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Colorectal Cancer", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Colostomy Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Communication in End-of-Life Care", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Communication with Patients and Families", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Community-Acquired Pneumonia (CAP)", aliases: ["CAP"], category: "Respiratory and critical care", kind: "topic" },
  { title: "Compartment Syndrome", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Comprehensive Nursing Care Plan (CNCP)", aliases: ["CNCP"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Computed Tomography (CT)", aliases: ["CT"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Conflict Resolution in Healthcare", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Congenital Anorectal Malformation", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Congenital Cleft Lip and Palate", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Congenital Cleft Lip and Palate: Safe Feeding and Suture Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Congenital Diaphragmatic Hernia (CDH)", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Congestive Heart Failure (CHF)", aliases: ["CHF"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Conjunctivitis", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Constipation", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Contact Precautions", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Continuous Ambulatory Peritoneal Dialysis (CAPD)", aliases: ["CAPD"], category: "Renal and urology", kind: "topic" },
  { title: "Continuous Bladder Irrigation (CBI)", aliases: ["CBI"], category: "Renal and urology", kind: "topic" },
  { title: "Continuous Bladder Irrigation (CBI): Nursing Management", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Continuous Positive Airway Pressure (CPAP)", aliases: ["CPAP"], category: "Respiratory and critical care", kind: "topic" },
  { title: "Continuous Renal Replacement Therapy (CRRT)", aliases: ["CRRT"], category: "Renal and urology", kind: "topic" },
  { title: "Corneal Disorders", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Coronary Angiography (CAG)", aliases: ["CAG"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Coronary Artery Bypass Grafting (CABG)", aliases: ["CABG"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Coronary Artery Disease (CAD)", aliases: ["CAD"], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Corrective and Preventive Action (CAPA)", aliases: ["CAPA"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Cranial Nerve Examination", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Craniopharyngioma", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Craniotomy Nursing Care", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Crash Cart Management", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Crash Cart Management and Emergency Drug Safety", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Crash Cart Readiness", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Critical Appraisal of Clinical Literature", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Critical Care Sedation and Pain Monitoring", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Crohn Disease", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Cushing Syndrome", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Cystoscopy: Nursing Responsibilities", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "De-addiction", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "De-Addiction Care", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "De-escalation and Communication during Aggression", aliases: [], category: "Psychiatry and communication", kind: "cne-topic" },
  { title: "De-escalation of Aggressive Behavior", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Decompensated Chronic Liver Disease (DCLD)", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Deep Vein Thrombosis (DVT)", aliases: ["DVT"], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Defibrillation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Defibrillation and Synchronized Cardioversion", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Defibrillator Operation", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Delirium", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Delirium Prevention", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Dementia", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Dengue", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Dental and Maxillofacial Injury", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Depression", aliases: [], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Developmental Assessment", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Diabetes Mellitus (DM)", aliases: ["DM"], category: "Endocrinology and metabolism", kind: "topic", nursingContext: "condition" },
  { title: "Diabetes Patient Education", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Diabetic Foot Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Diabetic Foot Ulcer", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Diabetic Ketoacidosis (DKA)", aliases: ["diabetic keto acidosis", "DKA"], category: "Endocrinology and metabolism", kind: "topic", nursingContext: "condition" },
  { title: "Diabetic Nephropathy", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Diabetic Neuropathy", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Diabetic Retinopathy", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Dialysis Anticoagulation", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Dialysis Catheter Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Dialysis Machine Alarms and Nursing Responses", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Dialyzer Reprocessing and Safety", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Diarrhea", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Disaster Management Training", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Disaster Preparedness", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Disaster Triage", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Donning and Doffing of Personal Protective Equipment (PPE)", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Drain Care and Management", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Droplet Precautions", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Drowning Emergency", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Dry Eye Disease", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Dysphagia", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Dysphagia Assessment and Aspiration Prevention", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Early Warning Score (EWS)", aliases: ["EWS"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Early Warning Scores (EWS)", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Early Warning Signs of Cardiac Deterioration", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Echocardiography", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Eclampsia", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Ectopic Pregnancy", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Electrocardiogram (ECG)", aliases: ["ECG", "EKG"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Electrocardiography (ECG) Interpretation Workshop", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Electrocardiography (ECG): Acquisition and Interpretation", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Electroconvulsive Therapy (ECT)", aliases: ["ECT"], category: "Psychiatry and communication", kind: "topic" },
  { title: "Electroencephalogram (EEG)", aliases: ["EEG"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Electrolyte Imbalance", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Electromyography (EMG)", aliases: ["EMG"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Electronic Health Record (EHR)", aliases: ["EHR"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Electronic Health Records (EHR)", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Electrosurgical Safety", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Emergency Airway Equipment Preparation", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Emergency Codes", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Emergency Drug Preparation", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Emergency Obstetric Care", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Emergency Resuscitation", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Emergency Tracheostomy Management", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Emergency Triage", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Emotional Intelligence in Nursing", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Empyema", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Encephalitis", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "End-of-Life Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "End-Stage Kidney Disease (ESKD)", aliases: ["ESKD"], category: "Renal and urology", kind: "topic" },
  { title: "End-stage Renal Disease (ESRD)", aliases: ["ESRD", "end stage kidney disease"], category: "Abbreviation-Aware Clinical Terms", kind: "term", nursingContext: "condition" },
  { title: "Endometrial Cancer", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Endometriosis", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Endoscope Reprocessing", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Endoscope Reprocessing and Disinfection", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Endoscopic Procedure Preparation and Recovery", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Endoscopic Retrograde Cholangiopancreatography (ERCP)", aliases: ["ERCP"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Endoscopic Retrograde Cholangiopancreatography (ERCP): Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Endoscopic Ultrasound (EUS)", aliases: ["EUS"], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Endoscopic Variceal Ligation (EVL)", aliases: ["EVL"], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Endotracheal and Tracheostomy Suctioning", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Endotracheal Intubation", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Endotracheal Suctioning", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Endotracheal Tube (ETT)", aliases: ["ETT"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Endotracheal Tube (ETT) Care", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Engraftment Syndrome", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Enteral and Parenteral Nutrition", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Enteral Feeding", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Enteral Feeding: Preparation, Administration and Monitoring", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Enteral Tube Feeding", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Enteric Fever", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Environmental Cleaning and Disinfection", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Epilepsy", aliases: [], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Epistaxis", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Esophageal Cancer", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Esophageal Varices", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Essential Hypertension", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Ethical and Legal Aspects of Nursing Practice", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Ethics and Advocacy in Nursing", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Evidence-Based Nursing Practice", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "External Fixator Care", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "External Fixator Pin Site Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "External Ventricular Drain (EVD)", aliases: ["EVD"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "External Ventricular Drain (EVD) Care and Infection Prevention", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "External Ventricular Drain (EVD) Management", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Extrapyramidal Symptoms (EPS)", aliases: ["EPS"], category: "Psychiatry and communication", kind: "topic" },
  { title: "Extravasation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Extremely Low Birth Weight (ELBW)", aliases: ["ELBW"], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Eye Donation and Corneal Retrieval", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Fall Prevention", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Fall Risk Assessment", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Falls and Fracture Prevention", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Family Planning and Contraception", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Fat Embolism Syndrome", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Febrile Neutropenia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Feeding Jejunostomy Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Female Urinary Catheterization", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Femoral Neck Fracture", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Fetal Monitoring", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Fire Safety and Emergency Preparedness", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Flail Chest", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Flap Monitoring", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Fluid and Electrolyte Imbalance", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Fluid Balance Charting", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Fluid Balance Monitoring in Chronic Kidney Disease (CKD)", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Fluid Management", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Focal Seizures", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Foley Catheter Insertion and Care", aliases: ["Foley catheterization", "Foleys catheterisation", "Foly catheter care", "Folys catheterisation"], category: "Renal and urology", kind: "topic" },
  { title: "Foley Catheterization", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Foley Catheterization and Catheter Care", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Foot Care in Diabetes", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Fracture Management", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Fresh Frozen Plasma (FFP)", aliases: ["FFP"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Fresh Frozen Plasma (FFP) Transfusion", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Frey Procedure: Postoperative Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Fungal Endocarditis", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Fungal Skin Infection", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Gastric Cancer", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Gastric Mucosal Inflammation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Gastritis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Gastroesophageal Reflux Disease (GERD)", aliases: ["GERD", "gastro-oesophageal reflux disease"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Gastrointestinal Bleeding", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Gastrointestinal Bleeding: Early Recognition and Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Gastrointestinal Stoma Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Gastrostomy Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Gastrostomy Tube Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "General Anesthesia", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "General Anesthesia (GA): Perioperative Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Generalized Seizures", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Geriatric Rehabilitation", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Gestational Diabetes Mellitus (GDM)", aliases: ["GDM"], category: "Endocrinology and metabolism", kind: "topic", nursingContext: "condition" },
  { title: "Glasgow Coma Scale", aliases: ["GCS"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Glasgow Coma Scale (GCS) and Pupillary Assessment", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "Glasgow Coma Scale (GCS) Assessment", aliases: ["GCS assessment", "GCS scoring", "glascow coma scale", "glasgow comma scale"], category: "Neurosciences", kind: "topic" },
  { title: "Glasgow Coma Score", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Glaucoma", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Glomerulonephritis", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Google Sheets for Nursing Data Management", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Gout", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Graft-versus-Host Disease (GVHD)", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Group B Streptococcus", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Group B Streptococcus (GBS) Infection", aliases: ["GBS"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Guillain–Barré Syndrome (GBS)", aliases: ["GBS"], category: "Neurosciences", kind: "topic" },
  { title: "Gynaecological Oncology Nursing", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Hand Hygiene", aliases: ["hand hygeine", "hand hygiene procedure", "hand hygine", "handhygine"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Hand Hygiene: Five Moments and Correct Technique", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Hand Rub Technique", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Handwashing Technique", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Hansen Disease (Leprosy)", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Head and Neck Cancer Nursing Care", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Head Injury Nursing Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Healthcare-associated Infection (HAI)", aliases: ["HAI"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Healthcare-Associated Infections (HAIs)", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Healthy Aging and Cardiometabolic Health", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Hearing Loss Assessment", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Heart Failure", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Heart Failure with Preserved Ejection Fraction (HFpEF)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Heart Failure with Reduced Ejection Fraction (HFrEF)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Hematopoietic Stem Cell Transplantation (HSCT)", aliases: ["HSCT"], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Hemicraniectomy Nursing Care", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Hemodialysis", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Hemodialysis Access Care and Infection Prevention", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Hemodialysis Catheter Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Hemodynamic Assessment in Critically Ill Patients", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Hemodynamic Monitoring", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Hemolytic Anemia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Hemophilia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Hemorrhagic Shock", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Hemorrhagic Stroke", aliases: [], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Hemothorax", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Hepatic Encephalopathy", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Hepatic Encephalopathy: Nursing Assessment and Management", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Hepatitis", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Hepatitis a", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Hepatitis B", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Hepatitis C", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Hepatobiliary Surgery Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "High-Alert Medication Safety", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "High-alert Medications", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "High-flow Nasal Cannula", aliases: ["HFNC"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "High-Flow Nasal Cannula (HFNC) Oxygen Therapy", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "High-Level Disinfection", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "High-Risk Pregnancy", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Hilar Cholangiocarcinoma", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Hip Fracture", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Hodgkin Lymphoma", aliases: ["Hodgkin's disease", "Hodgkin's lymphoma"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Hospital Census Reporting", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Hospital Emergency Codes", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Hospital Information System (HIS)", aliases: ["HIS"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Hospital Information System (HIS) Training", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Hospital Library Resources and Literature Search", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Hospital-Acquired Infection (HAI) Prevention", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Hospital-Acquired Pneumonia (HAP)", aliases: ["HAP"], category: "Respiratory and critical care", kind: "topic" },
  { title: "Human Immunodeficiency Virus (HIV)", aliases: ["HIV"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Human Immunodeficiency Virus (HIV) Infection", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Hydatid Cyst", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Hydrocephalus", aliases: [], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Hydronephrosis", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Hypercalcemia", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypercyanotic Spells in Tetralogy of Fallot", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Hyperglycemia", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hyperkalemia", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypernatremia", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hyperosmolar Hyperglycemic State (HHS)", aliases: ["HHS"], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hyperparathyroidism", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypertension", aliases: ["HTN", "HT", "high blood pressure"], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Hypertensive Disorders of Pregnancy", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Hypertensive Emergency", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Hyperthyroidism", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypocalcemia", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypoglycemia", aliases: [], category: "Endocrinology and metabolism", kind: "topic", nursingContext: "condition" },
  { title: "Hypokalemia", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hyponatremia", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypoparathyroidism", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypothyroidism", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Hypoxic–Ischemic Encephalopathy (HIE)", aliases: ["HIE"], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Hysterectomy: Perioperative Nursing Care", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Identification, Situation, Background, Assessment, Recommendation (ISBAR) Communication", aliases: ["ISBAR Communication"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Identify Situation Background Assessment Recommendation (ISBAR)", aliases: ["ISBAR"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Ileostomy Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Immediate Newborn Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Immediate Postoperative Handover", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Immunization and Cold Chain Management", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Immunoglobulin a (IgA) Nephropathy", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Immunotherapy in Cancer Care", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Implantable Cardioverter-Defibrillator (ICD) Nursing Care", aliases: ["ICD"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "In Vitro Fertilization (IVF)", aliases: ["IVF"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "In Vitro Fertilization (IVF) Pregnancy", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Incentive Spirometry", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Incident Reporting and Patient Safety", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Induction of Labor", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Induction of Labour", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Infection Control in High-Risk Units", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Infection Control in the Operating Theatre (OT)", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Infection Prevention and Control (IPC)", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Infection Prevention and Control (IPC) in Critical Care", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Infection Prevention Care Bundles", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Infection Prevention Training", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Infective Endocarditis", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Infertility", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Inflammatory Bowel Disease (IBD)", aliases: ["IBD"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Informed Consent", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Inhaler Technique", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Instillation of Eye Drops", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Insulin Administration", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Insulin Administration and Safety", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Insulin Infusion Protocols", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Insulin Pen Technique", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Insulin Therapy", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Intake and Output Monitoring", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Intensive Care Unit (ICU)", aliases: ["ICU"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Intercostal Chest Drainage (ICD) Care", aliases: ["chest drain", "ICD", "ICD care", "intercoastal drain", "intercostal drain care"], category: "Respiratory and critical care", kind: "topic" },
  { title: "International Classification of Diseases, 10th Revision (ICD-10)", aliases: ["ICD 10", "ICD10", "International Classification of Diseases version 10"], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "International Classification of Diseases, 11th Revision (ICD-11)", aliases: ["ICD 11", "ICD11", "International Classification of Diseases version 11"], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "International Classification of Diseases, 11th Revision (ICD-11): Clinical Documentation Workshop", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "International Day of Yoga (IDY): Health Promotion", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Interprofessional Communication in Surgery", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Interstitial Lung Disease (ILD)", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Intestinal Obstruction", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Intracerebral Hemorrhage (ICH)", aliases: ["ICH"], category: "Neurosciences", kind: "topic" },
  { title: "Intracranial Pressure (ICP)", aliases: ["ICP"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Intracranial Pressure (ICP) Monitoring", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Intracranial Pressure (ICP) Monitoring: Nursing Responsibilities", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "Intradialytic Hypertension", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Intradialytic Hypotension", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Intradialytic Hypotension: Recognition and Nursing Response", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Intraoperative Nursing Responsibilities", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Intrapartum Nursing Care", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Invasive Arterial Blood Pressure Monitoring", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Invasive Blood Pressure Monitoring", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Invasive Mechanical Ventilation", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Inventory Management in Healthcare", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Iron Deficiency Anemia (IDA)", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Irritable Bowel Syndrome (IBS)", aliases: ["IBS"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Ischemic Stroke", aliases: [], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Kangaroo Mother Care (KMC)", aliases: ["KMC"], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Keratitis", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Kidney Stones", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Kidney Transplantation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Kidney Transplantation: Early Complication Recognition", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Kidney Transplantation: Postoperative Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Kidney Transplantation: Preoperative Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Laparoscopic Instrument Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Laryngectomy Care", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Leukocoria", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Limb Amputation and Rehabilitation", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Lithium Therapy Monitoring", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Liver Abscess", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Liver Biopsy Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Liver Cirrhosis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Liver Injury", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Look-Alike, Sound-Alike (LASA) Medication Safety", aliases: ["LASA", "LASA drugs policy", "look alike sound alike", "look alike sound alike medications", "Look-alike Sound-alike (LASA)", "look-alike sound-alike drugs", "Look-alike sound-alike medications", "Look: Alike, Sound: Alike (LASA) Drugs"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Low Birth Weight (LBW)", aliases: ["LBW"], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Lower Gastrointestinal Bleeding", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Lower Segment Caesarean Section (LSCS)", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Lower Segment Cesarean Section (LSCS)", aliases: ["LSCS"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Lung Abscess", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Lymphedema Prevention Following Mastectomy", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Lymphoma", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Magnesium Sulfate Administration and Monitoring in Eclampsia", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "cne-topic" },
  { title: "Magnetic Resonance Angiography (MRA)", aliases: ["MRA"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Magnetic Resonance Imaging (MRI)", aliases: ["MRI"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Major Trauma Nursing Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Malaria", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Male Urinary Catheterization", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Malignant Hyperthermia", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Malnutrition", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Management of Ascites and Fluid Balance", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Management of Rh Incompatibility in Pregnancy", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "cne-topic" },
  { title: "Mass Casualty Incident (MCI) Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Massive Transfusion Protocol (MTP)", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Massive Transfusion Protocol in Obstetrics", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Mastectomy: Postoperative Nursing Care", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Materiovigilance", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Maternal Cardiac Arrest", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Maternal Sepsis", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Mechanical Ventilation: Mode Selection and Alarm Response", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Meconium Aspiration Syndrome (MAS)", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Meconium Aspiration Syndrome (MAS): Nursing Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Medical Documentation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Medical Records Department (MRD)", aliases: ["MRD"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Medical Termination of Pregnancy (MTP)", aliases: ["MTP"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Medical-Legal Case (MLC) Documentation", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Medication Administration", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Medication Administration in Myocardial Infarction (MI): Loading-Dose Protocols", aliases: ["loading dose in MI patients", "loading dose in myocardial infarction", "loading dose MI", "MI loading dose"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Medication Administration Rights", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Medication and Fluid Dose Calculation", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Medication Error Prevention", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Medication Errors", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Medication Labelling of Syringes, Fluid Bags and Intravenous Lines", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Medication Reconciliation", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Medication Safety", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Medication Safety in Psychiatric Nursing", aliases: [], category: "Psychiatry and communication", kind: "cne-topic" },
  { title: "Medication Safety Workshop", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Medico-legal Case (MLC)", aliases: ["MLC"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Megaloblastic Anemia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Membranous Nephropathy", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Meningitis", aliases: [], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Meningomyelocele", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Mental Health Nursing", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Mental Healthcare Act, 2017: Nursing Implications", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Metabolic Syndrome", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Metered-Dose Inhaler Technique", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Miscarriage", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Mitral Regurgitation", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Mitral Stenosis", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Motor Neuron Disease (MND)", aliases: ["MND"], category: "Neurosciences", kind: "topic" },
  { title: "Multiple Myeloma", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Multiple Sclerosis (MS)", aliases: ["MS"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Myasthenia Gravis (MG)", aliases: ["MG"], category: "Neurosciences", kind: "topic" },
  { title: "Myelomeningocele", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Myocardial Infarction (MI)", aliases: ["heart attack", "MI", "MI patient", "patient MI"], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Myocarditis", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Myxedema Coma", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Ménière Disease", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Nasal Surgery: Postoperative Care", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Nasogastric Tube Feeding", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Nasogastric Tube Insertion and Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "National Patient Safety Goals", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Nebulization", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Nebulization Therapy", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Neck Dissection Nursing Care", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Necrotizing Enterocolitis (NEC)", aliases: ["NEC", "necrotising enterocolitis", "necrotizing entrocolitis"], category: "Neonatology and pediatric nursing", kind: "topic", nursingContext: "condition" },
  { title: "Necrotizing Fasciitis", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Necrotizing Soft Tissue Infection (NSTI)", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Needlestick Injury", aliases: ["NSI"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Needlestick Injury (NSI) Prevention", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Needlestick Injury (NSI): Reporting and Post-Exposure Management", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Negative Pressure Wound Therapy (NPWT)", aliases: ["NPWT"], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Negative Pressure Wound Therapy (NPWT) Demonstration", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Neoadjuvant Chemotherapy", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Neonatal Central Line Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Cholestasis", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Cholestasis: Feeding and Nutrition Support", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Neonatal Congenital Heart Disease", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Continuous Positive Airway Pressure (CPAP)", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Hyperbilirubinemia", aliases: ["NNH"], category: "Neonatology and pediatric nursing", kind: "topic", nursingContext: "condition" },
  { title: "Neonatal Hyperbilirubinemia and Rh Incompatibility: Phototherapy Nursing Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Neonatal Hypoglycemia", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Hypothermia", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Hypoxic Ischemic Encephalopathy", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Neonatal Intensive Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Neonatal Intensive Care Unit (NICU)", aliases: ["NICU"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Neonatal Intensive Care Unit (NICU) Infection Control", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Jaundice", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Mechanical Ventilation", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Nutrition and Feeding", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Neonatal Respiratory Distress Syndrome (NRDS)", aliases: ["RDS", "respiratory distress syndrome of newborn"], category: "Neonatology and pediatric nursing", kind: "topic", nursingContext: "condition" },
  { title: "Neonatal Respiratory Support: Device Care and Monitoring", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Neonatal Resuscitation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Neonatal Resuscitation Program (NRP)", aliases: ["NRP", "Neonatal Resuscitation Programme (NRP)"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Neonatal Sepsis", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic", nursingContext: "condition" },
  { title: "Neonatal Sepsis: Early Recognition and Nursing Management", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Nephrectomy Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Nephrectomy: Perioperative Nursing Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Nephritic Syndrome", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Nephrostomy Tube Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Nephrotic Syndrome", aliases: [], category: "Renal and urology", kind: "topic", nursingContext: "condition" },
  { title: "Neurocysticercosis", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Neurogenic Shock", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Neurological Assessment", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Neurological Monitoring in Intracerebral Hemorrhage (ICH)", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "Neurorehabilitation", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Neurovascular Assessment", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Neurovascular Assessment in Orthopedic and Trauma Patients", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "Neutropenia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Neutropenic Precautions", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Neutropenic Precautions and Infection Prevention", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Newborn Screening", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "NextGen e-Hospital Training", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "NextGen e-Hospital: Orientation and Training", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "Nil per Oral (NPO)", aliases: ["NPO"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Non-Hodgkin Lymphoma (NHL)", aliases: ["NHL"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Non-invasive Ventilation", aliases: ["NIV"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Non-ST-Elevation Myocardial Infarction (NSTEMI)", aliases: ["NSTEMI"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Non-Stress Test (NST)", aliases: ["NST"], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Non-Stress Test (NST): Application and Interpretation", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "cne-topic" },
  { title: "Noninvasive Ventilation (NIV)", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Nonunion Fracture", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Normal Labour and Delivery", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Nursing Audit and Quality Indicators", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Nursing Care during Prone Ventilation", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Nursing Care Plan (NCP)", aliases: ["NCP"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Nursing Care Planning", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Nursing Continuing Education (CNE) Planning", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Nursing Handover", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Nursing Induction and Orientation", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Nursing Induction Training Programme", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "Nursing Leadership and Delegation", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Nursing Management of Myocardial Infarction (MI)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Nursing Records, Reports and Clinical Documentation", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "Nutritional Assessment in Gastrointestinal Disorders", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Nutritional Risk Screening", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Nutritional Support in Critical Care", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Obesity", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Objective Structured Clinical Examination (OSCE)", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Obsessive–Compulsive Disorder (OCD)", aliases: ["OCD"], category: "Psychiatry and communication", kind: "topic" },
  { title: "Obstetric Shock", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Obstructive Sleep Apnea (OSA)", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Occupational Exposure to Bloodborne Pathogens", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Ocular Trauma", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Odontogenic Keratocyst", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Oncological Emergencies", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Oncology Patient Counselling", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Open Fracture Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Operating Theatre (OT) Documentation and Medico-Legal Responsibilities", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Operating Theatre (OT) Sterilization", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Operating Theatre Fire Prevention", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Operating Theatre Infection Control", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Operation Theatre (OT)", aliases: ["OT"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Operative Documentation and Legal Records", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Oromotor Exercises", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Orthopedic Rehabilitation", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Osteoarthritis", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Osteoporosis", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Otitis Media", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Ovarian Cancer", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Ovarian Cysts", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Oxygen Delivery Devices", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Oxygen Therapy", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Oxygen Therapy: Device Selection and Monitoring", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Pacemaker Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Packed Red Blood Cell (PRBC) Transfusion", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Packed Red Blood Cells (PRBC)", aliases: ["PRBC"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Pain Assessment and Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Palliative Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Palliative Care and Symptom Management in Oncology", aliases: [], category: "Oncology, hematology and transfusion", kind: "cne-topic" },
  { title: "Palliative Oncology Nursing", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Pancreatic Cancer", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Pancreatitis", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Pancreatitis: Pain and Nutritional Management", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Pancytopenia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Paracentesis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Parenteral Nutrition", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Partograph Monitoring", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Patient and Family Counselling Skills", aliases: [], category: "Psychiatry and communication", kind: "cne-topic" },
  { title: "Patient Assessment in Acute Myocardial Infarction (AMI)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Patient Consent and Documentation", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Patient Education after Myocardial Infarction (MI)", aliases: ["Post-Myocardial Infarction (MI) Patient Education"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Patient Education and Counselling", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Patient Identification", aliases: ["patient verification", "right patient identification"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Patient Identification and Safe Clinical Handover", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Patient Positioning", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Patient Safety", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Patient Safety Goals", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Patient Safety in Gastrointestinal Endoscopy", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Patient Warming and Hypothermia Prevention", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Patient-Centered Communication", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Pediatric Airway Management", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Assessment", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Pediatric Asthma", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Basic Life Support (PBLS)", aliases: ["PBLS"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Pediatric Basic Life Support (PBLS) Skills Workshop", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Pediatric Dehydration", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Gastroenteritis", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Glasgow Coma Scale (GCS)", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Intensive Care Unit (PICU)", aliases: ["PICU"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Pediatric Intravenous Fluid Management", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Neurological Monitoring", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Nutrition", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Pediatric Nutrition and Growth Monitoring", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Pain Assessment", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Pneumonia", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Respiratory Support", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Resuscitation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Pediatric Seizure Management", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Sepsis", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pediatric Shock", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Pelvic Fracture", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Pelvic Fracture Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Pelvic Inflammatory Disease (PID)", aliases: ["PID"], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Pemphigus Vulgaris", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Peptic Ulcer Disease (PUD)", aliases: ["PUD"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Percutaneous Coronary Intervention (PCI)", aliases: ["PCI"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Percutaneous Endoscopic Gastrostomy (PEG)", aliases: ["PEG"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Percutaneous Endoscopic Gastrostomy (PEG) Tube Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Percutaneous Nephrostomy (PCN)", aliases: ["PCN"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Percutaneous Nephrostomy (PCN) Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Pericarditis", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Perimortem Caesarean Delivery", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Perioperative Medication Safety", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Peripheral Artery Disease (PAD)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Peripheral Neuropathy", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Peripheral Vascular Disease", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Peripherally Inserted Central Catheter (PICC)", aliases: ["PICC"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Peripherally Inserted Central Catheter (PICC) Care", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Peritoneal Dialysis", aliases: ["PD"], category: "Renal and urology", kind: "topic" },
  { title: "Peritonitis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Persistent Pulmonary Hypertension of the Newborn (PPHN)", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Personal Protective Equipment", aliases: ["PPE"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Personal Protective Equipment (PPE) Use", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Pharmacovigilance", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Pheochromocytoma", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Phototherapy Care for Neonates", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Physiotherapy for Hospitalized Patients", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Pin Site Care", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Pituitary Apoplexy", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Pituitary Disorders", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Pituitary Macroadenoma", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Placenta Accreta Spectrum (PAS)", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Placenta Previa", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Placental Abruption", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Platelet Transfusion", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Pleural Drainage and Chest Tube Monitoring", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Pleural Effusion", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Pneumocystis Pneumonia", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Pneumonia", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Pneumothorax", aliases: [], category: "Respiratory and critical care", kind: "topic", nursingContext: "condition" },
  { title: "Polycystic Kidney Disease", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Polycystic Ovary Syndrome (PCOS)", aliases: ["PCOS"], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Polytrauma Assessment and Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Portal Hypertension", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Positive End-Expiratory Pressure (PEEP)", aliases: ["PEEP"], category: "Respiratory and critical care", kind: "topic" },
  { title: "Post-anesthesia Care Unit (PACU)", aliases: ["PACU"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Post-Exposure Prophylaxis (PEP)", aliases: ["PEP"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Post-Traumatic Stress Disorder (PTSD)", aliases: ["PTSD"], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Postanesthesia Care Unit (PACU) Nursing", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Postnatal Care", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Postoperative Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Postoperative Care Following Cardiac Surgery", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Postoperative Care Following Craniotomy", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "Postoperative Care Following Gynaecological Surgery", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Postoperative Care Following Valve Replacement", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Postoperative Care of Patients after Coronary Artery Bypass Grafting (CABG)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Postoperative Cataract Surgery Care", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Postoperative Nausea and Vomiting (PONV)", aliases: ["PONV"], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Postoperative Neurosurgical Nursing Care", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Postoperative Nursing Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Postoperative Pain Management", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Postoperative Patient Assessment", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Postoperative Surgical Drain Care and Removal", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Postoperative Thyroid Surgery Care", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Postpartum Hemorrhage (PPH)", aliases: ["PPH"], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Postpartum Hemorrhage (PPH): Early Detection and Response", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "cne-topic" },
  { title: "Postpartum Maternal Assessment", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Postpartum Maternal Assessment and Patient Education", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "cne-topic" },
  { title: "Preeclampsia", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Preeclampsia and Eclampsia: Emergency Nursing Management", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "cne-topic" },
  { title: "Prelabor Rupture of Membranes (PROM)", aliases: ["PROM", "premature rupture of membranes"], category: "Abbreviation-Aware Clinical Terms", kind: "term", nursingContext: "condition" },
  { title: "Premature Rupture of Membranes (PROM)", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Prematurity", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Preoperative Assessment", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Preoperative Eye Surgery Care", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Preoperative Patient Assessment", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Preoperative Patient Preparation", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Preoperative Skin Preparation", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Pressure Injury", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic", nursingContext: "condition" },
  { title: "Pressure Injury Dressing and Management", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Pressure Injury Prevention", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Pressure Injury Prevention in Immobile Patients", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Pressure Injury Risk Assessment", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Pressure Injury Staging", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Pressure Ulcer Care", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Preterm Labour", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Preterm Prelabor Rupture of Membranes (PPROM)", aliases: ["PPROM", "preterm premature rupture of membranes"], category: "Abbreviation-Aware Clinical Terms", kind: "term", nursingContext: "condition" },
  { title: "Preterm Premature Rupture of Membranes (PPROM)", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Prevention of Aspiration in Neonates", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Prevention of Sexual Harassment (POSH)", aliases: ["POSH"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Prevention of Sexual Harassment (POSH) at the Workplace", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Prevention of Venous Thromboembolism (VTE)", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "cne-topic" },
  { title: "Prevention of Ventilator-Associated Pneumonia (VAP)", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Professional Etiquette", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Professional Soft Skills and Communication", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Prone Positioning during Mechanical Ventilation", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Psychiatric Nursing Documentation", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Psychotropic Medication Safety", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Pulmonary Aspergilloma", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Pulmonary Edema", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Pulmonary Embolism (PE)", aliases: ["PE"], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Pulmonary Fibrosis", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Pulmonary Function Testing (PFT)", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Pulmonary Hypertension", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Pulmonary Tuberculosis", aliases: [], category: "Respiratory and critical care", kind: "topic", nursingContext: "condition" },
  { title: "Pupil Assessment", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Pupillary Assessment", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Quality Improvement Methodology", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Radiotherapy Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Radiotherapy Nursing Care", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Raised Intracranial Pressure", aliases: ["increased intracranial pressure", "raised ICP"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Range-of-Motion (ROM) Exercises", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Rapid Response Team (RRT) Activation", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Recognition of Patient Deterioration", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Refeeding Syndrome", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Regional Anesthesia", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Regional Anesthesia Nursing Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Rehabilitation Nursing", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Renal Biopsy", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Renal Biopsy: Nursing Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Renal Failure: Fluid and Electrolyte Management", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Renal Transplantation", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Repositioning and Pressure Injury Prevention", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Research Ethics", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Research Methodology", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Research Proposal Writing", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Research Publication and Peer Review", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Respiratory Assessment and Monitoring", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Respiratory Failure", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Respiratory Protection", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Retained Surgical Item Prevention", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Retinal Detachment", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Retinopathy of Prematurity (ROP)", aliases: ["ROP"], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic", nursingContext: "condition" },
  { title: "Rh Incompatibility in Neonates", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Rh Incompatibility in Pregnancy", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Rheumatic Heart Disease (RHD)", aliases: ["RHD"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Rheumatoid Arthritis (RA)", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Robotic Surgery: Instrument Handling", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Root Cause Analysis (RCA)", aliases: ["RCA"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Safe Feeding in Cleft Lip and Palate", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Safe Injection Practices", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Safe Medication Labelling", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Safe Patient Handover", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Safe Patient Positioning during Surgery", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Safe Patient Transfer and Positioning", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Safe Surgery and Wrong-Site Prevention", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Safe Surgical Positioning", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Scabies", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Schizophrenia", aliases: [], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Scientific Manuscript Writing", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Seizure", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Seizure Emergency: Nursing Management", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "Seizure Precautions and Nursing Care", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Self-Harm Risk Assessment", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Sepsis", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Sepsis Recognition and Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Sepsis Screening", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Septic Arthritis", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Septic Shock", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Septic Shock Resuscitation", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Severe Allergic Reaction and Anaphylaxis", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Shock Management", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Sickle Cell Disease", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Simulation-Based Nursing Education", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Sinusitis", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Sjögren Syndrome", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Skin Grafting", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Skin Grafting Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Snakebite Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Soft Skills and Professional Communication for Nurses", aliases: [], category: "Psychiatry and communication", kind: "cne-topic" },
  { title: "Soft Skills for Nursing Professionals", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Soft Skills in Nursing and Interprofessional Collaboration", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "Sort, Set in Order, Shine, Standardize and Sustain (5S): Workplace Organization", aliases: ["5S", "5S Workplace Organization"], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Specimen Labelling and Transport", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Spill Kit Use", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Spill Management", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Spinal Anesthesia", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Spinal Anesthesia Nursing Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Spinal Cord Injury (SCI)", aliases: ["SCI"], category: "Neurosciences", kind: "topic" },
  { title: "Spinal Deformity", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Spinal Injury Nursing Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Spinal Shock", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Spontaneous Bacterial Peritonitis (SBP)", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "ST-Elevation Myocardial Infarction (STEMI)", aliases: ["STEMI"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Stable Angina", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Standard Precautions", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Status Asthmaticus", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Status Epilepticus", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Stem Cell Transplantation", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Sterile Technique", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Sterilization and Disinfection", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Sterilization Monitoring", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Stoma Assessment and Irrigation", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Stoma Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Stoma Care and Management", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Stress Management for Healthcare Workers", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Stroke", aliases: [], category: "Additional Clinical Concepts", kind: "topic", nursingContext: "condition" },
  { title: "Stroke Early Recognition and Patient Handover", aliases: [], category: "Neurosciences", kind: "cne-topic" },
  { title: "Stroke Rehabilitation", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Subarachnoid Hemorrhage (SAH)", aliases: ["SAH"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Substance Use Disorder", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Substance Use Disorders", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Suicide Risk Assessment", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Suicide Risk Assessment and Immediate Safety Measures", aliases: [], category: "Psychiatry and communication", kind: "cne-topic" },
  { title: "Suprapubic Catheter Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Supraventricular Tachycardia (SVT)", aliases: ["SVT"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Surgical Asepsis", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Counts", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Surgical Counts and Retained Item Prevention", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Surgical Drain Removal", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Hand Scrub", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Instrument Count", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Instrument Handling", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Safety Checklist", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Surgical Safety Checklist and Time-Out Procedure", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Surgical Site Infection", aliases: ["SSI"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Surgical Site Infection (SSI) Prevention", aliases: ["SSI", "surgical site infections prevention"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Surgical Site Infection (SSI) Prevention Bundle", aliases: [], category: "Infection prevention and patient safety", kind: "cne-topic" },
  { title: "Surgical Site Infection (SSI) Prevention: Practical Workshop", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Surgical Site Marking and Time-Out", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Sponge and Instrument Count Safety", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Surgical Wound Assessment", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Wound Dressing", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Surgical Wound Dressing: Assessment, Irrigation and Debridement", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "cne-topic" },
  { title: "Surgical Wound Irrigation", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Suture Line Care", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Swallowing Rehabilitation", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Syndrome of Inappropriate Antidiuretic Hormone Secretion (SIADH)", aliases: ["SIADH"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Targeted Therapy in Oncology", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Teaching and Learning in Nursing", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Team Communication and Collaboration", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Tension Pneumothorax", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Tetralogy of Fallot (TOF)", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Tetralogy of Fallot (TOF): Nursing Care during Hypercyanotic Spells", aliases: [], category: "Neonatology and pediatric nursing", kind: "cne-topic" },
  { title: "Thalassemia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Therapeutic Communication", aliases: [], category: "Psychiatry and communication", kind: "topic" },
  { title: "Therapeutic Communication and Conflict Resolution", aliases: [], category: "Psychiatry and communication", kind: "cne-topic" },
  { title: "Thoracic Drainage System Management", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Thrombocytopenia", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Thyroid Disorder", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Thyroid Disorders", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Thyroid Storm", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Thyroidectomy Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Thyroidectomy Complications and Hypocalcemia", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Thyroidectomy: Nursing Care", aliases: [], category: "Endocrinology and metabolism", kind: "topic" },
  { title: "Tinnitus", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Tonsillitis", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Total Hip Arthroplasty (THA)", aliases: ["THA"], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Total Hip Replacement", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Total Knee Arthroplasty (TKA)", aliases: ["TKA"], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Total Knee Replacement", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Total Parenteral Nutrition (TPN)", aliases: ["TPN"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Total Parenteral Nutrition (TPN): Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Tracheoesophageal Fistula (TEF)", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Tracheostomy Care", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Tracheostomy Emergency Response", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Traction Care", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Training of Trainers (ToT)", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Training of Trainers (ToT) in Nursing Education", aliases: [], category: "Health informatics, education and professional development", kind: "cne-topic" },
  { title: "Transfer from Bed to Stretcher", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Transfer of Critically Ill Patients", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Transfusion Monitoring and Documentation", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Transfusion Safety", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Transfusion Safety Capacity Building", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Transfusion-Associated Circulatory Overload (TACO)", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Transfusion-Related Acute Lung Injury (TRALI)", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Transient Ischemic Attack (TIA)", aliases: ["TIA", "mini stroke"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Transjugular Intrahepatic Portosystemic Shunt (TIPS)", aliases: ["TIPS"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Transjugular Intrahepatic Portosystemic Shunt (TIPS): Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Transmission-Based Precautions", aliases: [], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Transurethral Resection of Bladder Tumor (TURBT)", aliases: ["TURBT"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Transurethral Resection of Bladder Tumour (TURBT)", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Transurethral Resection of Bladder Tumour (TURBT): Perioperative Nursing Care", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Transurethral Resection of the Prostate (TURP)", aliases: ["TURP"], category: "Renal and urology", kind: "topic" },
  { title: "Trauma Primary Survey (ABCDE Approach)", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Trauma Secondary Survey", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Traumatic Amputation Care", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Traumatic Brain Injury (TBI)", aliases: ["TBI"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Traumatic Wound Management", aliases: [], category: "Emergency, trauma and rehabilitation", kind: "topic" },
  { title: "Triage", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Tricuspid Regurgitation", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Tuberculosis (TB)", aliases: ["TB"], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Tumor Lysis Syndrome", aliases: ["TLS"], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Tumour Lysis Syndrome (TLS)", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Type 1 Diabetes", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Type 1 Diabetes Mellitus (T1DM)", aliases: ["T1DM", "type 1 diabetes"], category: "Endocrinology and metabolism", kind: "topic", nursingContext: "condition" },
  { title: "Type 2 Diabetes", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Type 2 Diabetes Mellitus (T2DM)", aliases: ["T2DM", "type 2 diabetes"], category: "Endocrinology and metabolism", kind: "topic", nursingContext: "condition" },
  { title: "Ulcerative Colitis (UC)", aliases: ["UC"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Umbilical Arterial Catheter (UAC)", aliases: ["UAC"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Umbilical Arterial Catheter (UAC) Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Umbilical Venous Catheter (UVC)", aliases: ["UVC"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Umbilical Venous Catheter (UVC) Care", aliases: [], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Upper Gastrointestinal Bleeding", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Upper Gastrointestinal Endoscopy", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Urinary Catheter Care Bundle", aliases: [], category: "Renal and urology", kind: "cne-topic" },
  { title: "Urinary Catheterization", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Urinary Diversion Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Urinary Incontinence", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Urinary Retention", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Urinary System Assessment", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Urinary Tract Infection (UTI)", aliases: ["UTI"], category: "Renal and urology", kind: "topic" },
  { title: "Urostomy Care", aliases: [], category: "Renal and urology", kind: "topic" },
  { title: "Uterine Fibroids", aliases: [], category: "Obstetrics, gynecology and maternal care", kind: "topic" },
  { title: "Valvular Heart Disease", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Venous Blood Gas (VBG)", aliases: ["VBG"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Venous Blood Gas Analysis", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Venous Thromboembolism (VTE)", aliases: ["VTE"], category: "Abbreviation-Aware Clinical Terms", kind: "term" },
  { title: "Venous Thromboembolism (VTE) Prevention", aliases: [], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Ventilator Modes and Alarm Management", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Ventilator Weaning", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Ventilator Weaning and Extubation", aliases: [], category: "Respiratory and critical care", kind: "topic" },
  { title: "Ventilator-Associated Pneumonia (VAP)", aliases: ["VAP"], category: "Respiratory and critical care", kind: "topic" },
  { title: "Ventilator-Associated Pneumonia (VAP) Prevention", aliases: ["VAP prevention"], category: "Infection prevention and patient safety", kind: "topic" },
  { title: "Ventilator-Associated Pneumonia (VAP) Prevention Bundle", aliases: [], category: "Respiratory and critical care", kind: "cne-topic" },
  { title: "Ventricular Fibrillation (VF)", aliases: ["VF"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Ventricular Tachycardia (VT)", aliases: ["VT"], category: "Cardiology and cardiovascular nursing", kind: "topic" },
  { title: "Ventriculoperitoneal Shunt Care", aliases: [], category: "Neurosciences", kind: "topic" },
  { title: "Vertebral Fracture", aliases: [], category: "Dermatology, musculoskeletal and other", kind: "topic" },
  { title: "Vertigo", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Very Low Birth Weight (VLBW)", aliases: ["VLBW"], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Vesicant Medication Safety", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Viral Hepatitis", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Whipple Procedure: Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "cne-topic" },
  { title: "Whipple Procedure: Perioperative Nursing Care", aliases: [], category: "Gastroenterology and hepatology", kind: "topic" },
  { title: "Whole Blood Transfusion", aliases: [], category: "Oncology, hematology and transfusion", kind: "topic" },
  { title: "Wound Care", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Wound Debridement", aliases: [], category: "Surgical, perioperative and wound nursing", kind: "topic" },
  { title: "Wound Dressing", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Wound Infection", aliases: [], category: "Additional Clinical Concepts", kind: "topic" },
  { title: "Yoga for Nurses and Healthcare Workers", aliases: [], category: "Health informatics, education and professional development", kind: "topic" },
  { title: "Zygomatic Fracture", aliases: [], category: "Ophthalmology, otolaryngology and specialty care", kind: "topic" },
  { title: "Heart Failure (HF)", aliases: ["HF"], category: "Cardiology and cardiovascular nursing", kind: "topic", nursingContext: "condition" },
  { title: "Cerebrovascular Accident (CVA)", aliases: ["CVA", "stroke"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Parkinson Disease (PD)", aliases: ["PD", "Parkinson's disease"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Amyotrophic Lateral Sclerosis (ALS)", aliases: ["ALS", "motor neurone disease"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Subdural Hematoma (SDH)", aliases: ["SDH"], category: "Neurosciences", kind: "topic", nursingContext: "condition" },
  { title: "Crohn Disease (CD)", aliases: ["Crohn's disease", "CD"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Metabolic Dysfunction-Associated Steatotic Liver Disease (MASLD)", aliases: ["MASLD", "NAFLD", "nonalcoholic fatty liver disease"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Metabolic Dysfunction-Associated Steatohepatitis (MASH)", aliases: ["MASH", "NASH", "nonalcoholic steatohepatitis"], category: "Gastroenterology and hepatology", kind: "topic", nursingContext: "condition" },
  { title: "Patent Ductus Arteriosus (PDA)", aliases: ["PDA", "patent ductus arteriosis"], category: "Neonatology and pediatric nursing", kind: "topic", nursingContext: "condition" },
  { title: "Sudden Infant Death Syndrome (SIDS)", aliases: ["SIDS"], category: "Neonatology and pediatric nursing", kind: "topic" },
  { title: "Respiratory Syncytial Virus (RSV) Infection", aliases: ["RSV", "respiratory syncytial virus infection"], category: "Neonatology and pediatric nursing", kind: "topic", nursingContext: "condition" },
  { title: "Pregnancy-Induced Hypertension (PIH)", aliases: ["PIH", "gestational hypertension"], category: "Obstetrics, gynecology and maternal care", kind: "topic", nursingContext: "condition" },
  { title: "Major Depressive Disorder (MDD)", aliases: ["MDD"], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Generalized Anxiety Disorder (GAD)", aliases: ["GAD"], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Social Anxiety Disorder (SAD)", aliases: ["SAD"], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Borderline Personality Disorder", aliases: ["borderline personality disorder", "BPD"], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Obsessive-Compulsive Disorder (OCD)", aliases: ["OCD"], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Attention-Deficit/Hyperactivity Disorder (ADHD)", aliases: ["ADHD"], category: "Psychiatry and communication", kind: "topic", nursingContext: "condition" },
  { title: "Squamous Cell Carcinoma (SCC)", aliases: ["SCC"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Basal Cell Carcinoma (BCC)", aliases: ["BCC"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Multiple Organ Dysfunction Syndrome (MODS)", aliases: ["MODS", "multiple system organ failure", "MSOF"], category: "Emergency, trauma and rehabilitation", kind: "topic", nursingContext: "condition" },
  { title: "Systemic Inflammatory Response Syndrome (SIRS)", aliases: ["SIRS"], category: "Emergency, trauma and rehabilitation", kind: "topic", nursingContext: "condition" },
  { title: "Disseminated Intravascular Coagulation (DIC)", aliases: ["DIC"], category: "Oncology, hematology and transfusion", kind: "topic", nursingContext: "condition" },
  { title: "Nonsteroidal Anti-Inflammatory Drugs (NSAIDs)", aliases: ["NSAIDs", "NSAID"], category: "Medication safety and pharmacology", kind: "topic" },
  { title: "Angiotensin-Converting Enzyme (ACE) Inhibitors", aliases: ["ACEi", "ACE inhibitors"], category: "Medication safety and pharmacology", kind: "topic" },
  { title: "Angiotensin Receptor Blockers (ARBs)", aliases: ["ARB", "ARBs"], category: "Medication safety and pharmacology", kind: "topic" },
  { title: "Medication Administration Record (MAR)", aliases: ["MAR"], category: "Nursing practice and documentation", kind: "topic" },
  { title: "Situation, Background, Assessment, Recommendation (SBAR)", aliases: ["SBAR"], category: "Nursing practice and documentation", kind: "topic" },
  { title: "Activities of Daily Living (ADLs)", aliases: ["ADLs", "ADL"], category: "Nursing practice and documentation", kind: "topic" },
  { title: "Tumor, Node, Metastasis (TNM) Staging", aliases: ["TNM", "TNM staging"], category: "Oncology, hematology and transfusion", kind: "topic" },
];


/**
 * Clinical abbreviation safety / ambiguity records. These drive clarification
 * only; they do not authorize abbreviation use in clinical orders.
 * All topic and abbreviation suggestion data live in this one file.
 */
export interface ClinicalAbbreviation {
  short: string;
  meanings: string[];
  category: string;
  status: 'recognized' | 'ambiguous' | 'unsafe';
  safetyNote: string;
}
export const CLINICAL_ABBREVIATIONS: ClinicalAbbreviation[] = [
  { short: "HTN", meanings: ["Hypertension"], category: "Cardiology", status: "recognized", safetyNote: "" },
  { short: "NASH", meanings: ["Nonalcoholic steatohepatitis"], category: "Gastroenterology", status: "recognized", safetyNote: "" },
  { short: "ADLS", meanings: ["Activities of daily living"], category: "Nursing", status: "recognized", safetyNote: "" },
  { short: "ARF", meanings: ["Acute renal failure", "Acute respiratory failure"], category: "Renal and respiratory", status: "ambiguous", safetyNote: "Choose intended meaning." },
  { short: "SAD", meanings: ["Social anxiety disorder", "Seasonal affective disorder"], category: "Psychiatry", status: "ambiguous", safetyNote: "Choose intended meaning." },
  // Additional institution-relevant candidates; any ambiguous term requires educator clarification.
  { short: 'ICD-11', meanings: ['International Classification of Diseases, Eleventh Revision'], category: 'Health information', status: 'recognized', safetyNote: '' },
  { short: 'ICD-10', meanings: ['International Classification of Diseases, Tenth Revision'], category: 'Health information', status: 'recognized', safetyNote: '' },
  { short: 'BSE', meanings: ['Breast self-examination', 'Bovine spongiform encephalopathy'], category: 'Oncology, Medicine', status: 'ambiguous', safetyNote: 'Select the intended meaning for this CNE topic.' },
  { short: 'TURB', meanings: ['Transurethral resection of bladder tumour'], category: 'Urology', status: 'recognized', safetyNote: 'TURBT is also widely used; confirm local preferred terminology.' },
  { short: 'PBLS', meanings: ['Pediatric basic life support'], category: 'Pediatrics', status: 'recognized', safetyNote: '' },
  { short: 'DASH', meanings: ['Dietary Approaches to Stop Hypertension'], category: 'Nutrition', status: 'recognized', safetyNote: '' },
  { short: 'POSH', meanings: ['Prevention of Sexual Harassment'], category: 'Institutional training', status: 'recognized', safetyNote: '' },
  { short: 'TOT', meanings: ['Training of trainers'], category: 'Education', status: 'recognized', safetyNote: '' },
  { short: 'IYD', meanings: ['International Yoga Day'], category: 'Institutional training', status: 'ambiguous', safetyNote: 'Confirm that International Yoga Day is the intended meaning.' },

  {
    "short": "5S",
    "meanings": [
      "Sort set in order shine standardize sustain"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ABG",
    "meanings": [
      "Arterial blood gas"
    ],
    "category": "General, Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ABPA",
    "meanings": [
      "Allergic bronchopulmonary aspergillosis"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ACEI",
    "meanings": [
      "Angiotensin-converting enzyme inhibitor"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ACLS",
    "meanings": [
      "Advanced cardiovascular life support"
    ],
    "category": "Cardiac, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ACS",
    "meanings": [
      "Acute coronary syndrome"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ACV",
    "meanings": [
      "Assist-control ventilation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ADE",
    "meanings": [
      "Adverse drug event"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ADHD",
    "meanings": [
      "Attention-deficit/hyperactivity disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ADL",
    "meanings": [
      "Activities of daily living"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ADPKD",
    "meanings": [
      "Autosomal dominant polycystic kidney disease"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ADR",
    "meanings": [
      "Adverse drug reaction"
    ],
    "category": "Drugs, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AED",
    "meanings": [
      "Automated external defibrillator",
      "Antiepileptic drug"
    ],
    "category": "Cardiac, Neurology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "AF",
    "meanings": [
      "Atrial fibrillation"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AFB",
    "meanings": [
      "Acid-fast bacilli"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AFIB",
    "meanings": [
      "Atrial fibrillation"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AGA",
    "meanings": [
      "Appropriate for gestational age"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AIDS",
    "meanings": [
      "Acquired immunodeficiency syndrome"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AKD",
    "meanings": [
      "Acute kidney disease"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AKI",
    "meanings": [
      "Acute kidney injury"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ALD",
    "meanings": [
      "Alcohol-associated liver disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ALI",
    "meanings": [
      "Acute lung injury"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ALL",
    "meanings": [
      "Acute lymphoblastic leukemia"
    ],
    "category": "Oncology",
    "status": "ambiguous",
    "safetyNote": "ALL is also an ordinary English word; clarify only when used as an uppercase abbreviation."
  },
  {
    "short": "ALS",
    "meanings": [
      "Amyotrophic lateral sclerosis",
      "Advanced life support"
    ],
    "category": "Neurology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "AMD",
    "meanings": [
      "Age-related macular degeneration"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AMH",
    "meanings": [
      "Anti-Müllerian hormone"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AMI",
    "meanings": [
      "Acute myocardial infarction"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AML",
    "meanings": [
      "Acute myeloid leukemia"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AMR",
    "meanings": [
      "Antimicrobial resistance"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AMS",
    "meanings": [
      "Antimicrobial stewardship"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ANC",
    "meanings": [
      "Antenatal care",
      "Absolute neutrophil count"
    ],
    "category": "Maternal, Oncology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "ANTT",
    "meanings": [
      "Aseptic non-touch technique"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "APD",
    "meanings": [
      "Automated peritoneal dialysis"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "APGAR",
    "meanings": [
      "Apgar score"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "APH",
    "meanings": [
      "Antepartum hemorrhage"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "APTT",
    "meanings": [
      "Activated partial thromboplastin time"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ARB",
    "meanings": [
      "Angiotensin receptor blocker"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ARDS",
    "meanings": [
      "Acute respiratory distress syndrome"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ARNI",
    "meanings": [
      "Angiotensin receptor-neprilysin inhibitor"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ART",
    "meanings": [
      "Assisted reproductive technology"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ASA",
    "meanings": [
      "American Society of Anesthesiologists"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ASD",
    "meanings": [
      "Atrial septal defect",
      "Autism spectrum disorder"
    ],
    "category": "Cardiac, Psychiatry",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "ASIA",
    "meanings": [
      "American Spinal Injury Association"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AST",
    "meanings": [
      "Antimicrobial susceptibility testing",
      "Allergy skin test"
    ],
    "category": "Infection",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "ATN",
    "meanings": [
      "Acute tubular necrosis"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AUD",
    "meanings": [
      "Alcohol use disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AV",
    "meanings": [
      "Arteriovenous",
      "Atrioventricular"
    ],
    "category": "Cardiac",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "AVB",
    "meanings": [
      "Atrioventricular block"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AVF",
    "meanings": [
      "Arteriovenous fistula"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "AVG",
    "meanings": [
      "Arteriovenous graft"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BAL",
    "meanings": [
      "Bronchoalveolar lavage"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BB",
    "meanings": [
      "Beta blocker"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BCVA",
    "meanings": [
      "Best-corrected visual acuity"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BIPAP",
    "meanings": [
      "Bilevel positive airway pressure"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BLS",
    "meanings": [
      "Basic life support"
    ],
    "category": "Cardiac, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BMD",
    "meanings": [
      "Bone mineral density"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BMI",
    "meanings": [
      "Body mass index"
    ],
    "category": "Diabetes, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BMR",
    "meanings": [
      "Basal metabolic rate"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BMT",
    "meanings": [
      "Bone marrow transplantation"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BMW",
    "meanings": [
      "Biomedical waste"
    ],
    "category": "Infection, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BMWM",
    "meanings": [
      "Biomedical waste management"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BP",
    "meanings": [
      "Blood pressure"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BPAD",
    "meanings": [
      "Bipolar affective disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BPD",
    "meanings": ["Bronchopulmonary dysplasia", "Borderline personality disorder", "Bipolar disorder"],
    "category": "Neonatal and psychiatry",
    "status": "ambiguous",
    "safetyNote": "BPD has several clinical meanings; choose the intended diagnosis rather than expanding automatically."
  },
  {
    "short": "BPH",
    "meanings": [
      "Benign prostatic hyperplasia"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BPRS",
    "meanings": [
      "Brief Psychiatric Rating Scale"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BPS",
    "meanings": [
      "Behavioral Pain Scale"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BRADEN",
    "meanings": [
      "Braden pressure injury risk assessment"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BRCA",
    "meanings": [
      "Breast cancer susceptibility gene"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BRVO",
    "meanings": [
      "Branch retinal vein occlusion"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "BUN",
    "meanings": [
      "Blood urea nitrogen"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "C&S",
    "meanings": [
      "Culture and sensitivity"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "C-SSRS",
    "meanings": [
      "Columbia Suicide Severity Rating Scale"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CABG",
    "meanings": [
      "Coronary artery bypass grafting"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAD",
    "meanings": [
      "Coronary artery disease"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAG",
    "meanings": [
      "Coronary angiography"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAM-ICU",
    "meanings": [
      "Confusion Assessment Method for the ICU"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAP",
    "meanings": [
      "Community-acquired pneumonia"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAPA",
    "meanings": [
      "Corrective and preventive action"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAPD",
    "meanings": [
      "Continuous ambulatory peritoneal dialysis"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAR-T",
    "meanings": [
      "Chimeric antigen receptor T-cell therapy"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CAUTI",
    "meanings": [
      "Catheter-associated urinary tract infection"
    ],
    "category": "Infection, Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CBC",
    "meanings": [
      "Complete blood count"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CBD",
    "meanings": [
      "Common bile duct",
      "Cannabidiol"
    ],
    "category": "GI",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "CBI",
    "meanings": [
      "Continuous bladder irrigation"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CBNAAT",
    "meanings": [
      "Cartridge-based nucleic acid amplification test"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CBT",
    "meanings": [
      "Cognitive behavioural therapy"
    ],
    "category": "Neurology, Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CCB",
    "meanings": [
      "Calcium channel blocker"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CD",
    "meanings": [
      "Crohn disease",
      "Celiac disease"
    ],
    "category": "GI",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "CEA",
    "meanings": [
      "Carcinoembryonic antigen"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CECT",
    "meanings": [
      "Contrast-enhanced computed tomography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CGM",
    "meanings": [
      "Continuous glucose monitoring"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CHF",
    "meanings": [
      "Congestive heart failure"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CK",
    "meanings": [
      "Creatine kinase"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CKD",
    "meanings": [
      "Chronic kidney disease"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CLABSI",
    "meanings": [
      "Central line-associated bloodstream infection"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CLD",
    "meanings": [
      "Chronic liver disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CLL",
    "meanings": [
      "Chronic lymphocytic leukemia"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CML",
    "meanings": [
      "Chronic myeloid leukemia"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CNCP",
    "meanings": [
      "Comprehensive nursing care plan"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CNS",
    "meanings": [
      "Central nervous system"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "COPD",
    "meanings": [
      "Chronic obstructive pulmonary disease"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CP",
    "meanings": [
      "Cerebral palsy",
      "Chest physiotherapy"
    ],
    "category": "Neurology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "CPAP",
    "meanings": [
      "Continuous positive airway pressure"
    ],
    "category": "Neonatal, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CPB",
    "meanings": [
      "Cardiopulmonary bypass"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CPK",
    "meanings": [
      "Creatine phosphokinase"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CPOT",
    "meanings": [
      "Critical-Care Pain Observation Tool"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CPP",
    "meanings": [
      "Cerebral perfusion pressure"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CPR",
    "meanings": [
      "Cardiopulmonary resuscitation"
    ],
    "category": "Cardiac, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRA0",
    "meanings": [
      "Central retinal artery occlusion"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRBSI",
    "meanings": [
      "Catheter-related bloodstream infection"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRC",
    "meanings": [
      "Colorectal cancer"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRE",
    "meanings": [
      "Carbapenem-resistant Enterobacterales"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRIF",
    "meanings": [
      "Closed reduction and internal fixation"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRP",
    "meanings": [
      "C-reactive protein"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRRT",
    "meanings": [
      "Continuous renal replacement therapy"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRT",
    "meanings": [
      "Cardiac resynchronization therapy"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CRVO",
    "meanings": [
      "Central retinal vein occlusion"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CS",
    "meanings": [
      "Cesarean section",
      "Clinical specialist"
    ],
    "category": "Maternal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "CSF",
    "meanings": [
      "Cerebrospinal fluid"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CSII",
    "meanings": [
      "Continuous subcutaneous insulin infusion"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CSSD",
    "meanings": [
      "Central sterile supply department"
    ],
    "category": "Infection, Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CT",
    "meanings": [
      "Computed tomography",
      "Chemotherapy"
    ],
    "category": "Imaging, Oncology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "CTG",
    "meanings": [
      "Cardiotocography"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CVA",
    "meanings": [
      "Cerebrovascular accident"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CVAD",
    "meanings": [
      "Central venous access device"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CVC",
    "meanings": [
      "Central venous catheter"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CVP",
    "meanings": [
      "Central venous pressure"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CVST",
    "meanings": [
      "Cerebral venous sinus thrombosis"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CVVH",
    "meanings": [
      "Continuous venovenous hemofiltration"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CVVHD",
    "meanings": [
      "Continuous venovenous hemodialysis"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "CXR",
    "meanings": [
      "Chest radiograph"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "D5W",
    "meanings": [
      "5% dextrose in water"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DBT",
    "meanings": [
      "Dialectical behaviour therapy"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DCLD",
    "meanings": [
      "Decompensated chronic liver disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DCS",
    "meanings": [
      "Dynamic condylar screw"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DEXA",
    "meanings": [
      "Dual-energy X-ray absorptiometry"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DFU",
    "meanings": [
      "Diabetic foot ulcer"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DHS",
    "meanings": [
      "Dynamic hip screw"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DI",
    "meanings": [
      "Diabetes insipidus"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DIC",
    "meanings": [
      "Disseminated intravascular coagulation"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DJ",
    "meanings": [
      "Double-J ureteric stent"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DKA",
    "meanings": [
      "Diabetic ketoacidosis"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DM",
    "meanings": [
      "Diabetes mellitus"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DME",
    "meanings": [
      "Diabetic macular edema"
    ],
    "category": "Diabetes, Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DOAC",
    "meanings": [
      "Direct oral anticoagulant"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DOPPLER",
    "meanings": [
      "Doppler ultrasonography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DOTS",
    "meanings": [
      "Directly observed treatment short-course"
    ],
    "category": "Infection, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DPN",
    "meanings": [
      "Diabetic peripheral neuropathy"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DR",
    "meanings": [
      "Diabetic retinopathy"
    ],
    "category": "Diabetes, Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DSA",
    "meanings": [
      "Digital subtraction angiography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DTR",
    "meanings": [
      "Deep tendon reflex"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DVT",
    "meanings": [
      "Deep vein thrombosis"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "DXA",
    "meanings": [
      "Dual-energy X-ray absorptiometry"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EBRT",
    "meanings": [
      "External beam radiotherapy"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ECG",
    "meanings": [
      "Electrocardiogram",
      "Electrocardiography"
    ],
    "category": "Cardiac, Imaging",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "ECHO",
    "meanings": [
      "Echocardiography"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ECT",
    "meanings": [
      "Electroconvulsive therapy"
    ],
    "category": "Neurology, Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ED",
    "meanings": [
      "Emergency department",
      "Erectile dysfunction"
    ],
    "category": "General",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "EDD",
    "meanings": [
      "Estimated date of delivery"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EDH",
    "meanings": [
      "Extradural hematoma"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EEG",
    "meanings": [
      "Electroencephalogram",
      "Electroencephalography"
    ],
    "category": "Imaging, Neurology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "EFAST",
    "meanings": [
      "Extended focused assessment with sonography for trauma"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EGA",
    "meanings": [
      "Estimated gestational age"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EGFR",
    "meanings": [
      "Estimated glomerular filtration rate"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EHR",
    "meanings": [
      "Electronic health record"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EKG",
    "meanings": [
      "Electrocardiogram"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ELBW",
    "meanings": [
      "Extremely low birth weight"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EMAR",
    "meanings": [
      "Electronic medication administration record"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EMG",
    "meanings": [
      "Electromyography"
    ],
    "category": "Imaging, Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EMR",
    "meanings": [
      "Electronic medical record"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EN",
    "meanings": [
      "Enteral nutrition"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EPI",
    "meanings": [
      "Expanded programme on immunization"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EPS",
    "meanings": [
      "Extrapyramidal symptoms"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ER",
    "meanings": [
      "Emergency room",
      "Estrogen receptor"
    ],
    "category": "General, Oncology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "ERAS",
    "meanings": [
      "Enhanced recovery after surgery"
    ],
    "category": "GI, Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ERCP",
    "meanings": [
      "Endoscopic retrograde cholangiopancreatography"
    ],
    "category": "GI, Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ESBL",
    "meanings": [
      "Extended-spectrum beta-lactamase"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ESKD",
    "meanings": [
      "End-stage kidney disease"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ESR",
    "meanings": [
      "Erythrocyte sedimentation rate"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ESRD",
    "meanings": [
      "End-stage renal disease"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ESWL",
    "meanings": [
      "Extracorporeal shock wave lithotripsy"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ET",
    "meanings": [
      "Endotracheal",
      "Embryo transfer"
    ],
    "category": "Respiratory",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "ETCO2",
    "meanings": [
      "End-tidal carbon dioxide"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ETO",
    "meanings": [
      "Ethylene oxide"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ETT",
    "meanings": [
      "Endotracheal tube"
    ],
    "category": "Neonatal, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EUS",
    "meanings": [
      "Endoscopic ultrasound"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EUS-BD",
    "meanings": [
      "Endoscopic ultrasound-guided biliary drainage"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EUS-FNA",
    "meanings": [
      "Endoscopic ultrasound-guided fine needle aspiration"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EUS-FNB",
    "meanings": [
      "Endoscopic ultrasound-guided fine needle biopsy"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EVD",
    "meanings": [
      "External ventricular drain"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EVL",
    "meanings": [
      "Endoscopic variceal ligation"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EVLA",
    "meanings": [
      "Endovenous laser ablation"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "EWS",
    "meanings": [
      "Early warning score"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FAST",
    "meanings": [
      "Focused assessment with sonography for trauma"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FASTHUGS",
    "meanings": [
      "Feeding analgesia sedation thromboembolic prophylaxis head of bed elevation ulcer prophylaxis glucose control"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FBC",
    "meanings": [
      "Full blood count"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FBS",
    "meanings": [
      "Fasting blood sugar"
    ],
    "category": "Diabetes, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FEV1",
    "meanings": [
      "Forced expiratory volume in one second"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FFP",
    "meanings": [
      "Fresh frozen plasma"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FGR",
    "meanings": [
      "Fetal growth restriction"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FHR",
    "meanings": [
      "Fetal heart rate"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FHS",
    "meanings": [
      "Fetal heart sounds"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FIO2",
    "meanings": [
      "Fraction of inspired oxygen"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FMEA",
    "meanings": [
      "Failure mode and effects analysis"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FN",
    "meanings": [
      "Febrile neutropenia"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FNA",
    "meanings": [
      "Fine needle aspiration"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FNAC",
    "meanings": [
      "Fine needle aspiration cytology"
    ],
    "category": "Oncology, Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FSGS",
    "meanings": [
      "Focal segmental glomerulosclerosis"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "FVC",
    "meanings": [
      "Forced vital capacity"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GA",
    "meanings": [
      "Gestational age",
      "General anesthesia"
    ],
    "category": "Neonatal, Surgery",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "GAD",
    "meanings": [
      "Generalized anxiety disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GAD-7",
    "meanings": [
      "Generalized Anxiety Disorder-7"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GBS",
    "meanings": [
      "Guillain–Barré syndrome",
      "Group B Streptococcus"
    ],
    "category": "Neurology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "GCS",
    "meanings": [
      "Glasgow coma scale"
    ],
    "category": "Neurology, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GDM",
    "meanings": [
      "Gestational diabetes mellitus"
    ],
    "category": "Diabetes, Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GERD",
    "meanings": [
      "Gastroesophageal reflux disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GFR",
    "meanings": [
      "Glomerular filtration rate"
    ],
    "category": "General, Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GI",
    "meanings": [
      "Gastrointestinal"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GIST",
    "meanings": [
      "Gastrointestinal stromal tumor"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "GN",
    "meanings": [
      "Glomerulonephritis"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "H. PYLORI",
    "meanings": [
      "Helicobacter pylori"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "H2RA",
    "meanings": [
      "Histamine-2 receptor antagonist"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HAI",
    "meanings": [
      "Healthcare-associated infection"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HAM",
    "meanings": [
      "High-alert medication"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HAP",
    "meanings": [
      "Hospital-acquired pneumonia"
    ],
    "category": "Infection, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HAV",
    "meanings": [
      "Hepatitis A virus"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HB",
    "meanings": [
      "Hemoglobin"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HBA1C",
    "meanings": [
      "Glycated hemoglobin"
    ],
    "category": "Diabetes, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HBV",
    "meanings": [
      "Hepatitis B virus"
    ],
    "category": "GI, Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HCAI",
    "meanings": [
      "Healthcare-associated infection"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HCC",
    "meanings": [
      "Hepatocellular carcinoma"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HCT",
    "meanings": [
      "Hematocrit"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HCV",
    "meanings": [
      "Hepatitis C virus"
    ],
    "category": "GI, Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HD",
    "meanings": [
      "Hemodialysis",
      "Huntington disease"
    ],
    "category": "Renal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "HDU",
    "meanings": [
      "High dependency unit"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HE",
    "meanings": [
      "Hepatic encephalopathy"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HELLP",
    "meanings": [
      "Hemolysis elevated liver enzymes and low platelets"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HER2",
    "meanings": [
      "Human epidermal growth factor receptor 2"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HF",
    "meanings": [
      "Heart failure"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HFNC",
    "meanings": [
      "High-flow nasal cannula"
    ],
    "category": "Neonatal, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HFNO",
    "meanings": [
      "High-flow nasal oxygen"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HFPEF",
    "meanings": [
      "Heart failure with preserved ejection fraction"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HFREF",
    "meanings": [
      "Heart failure with reduced ejection fraction"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HHS",
    "meanings": [
      "Hyperosmolar hyperglycemic state"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HIE",
    "meanings": [
      "Hypoxic-ischemic encephalopathy"
    ],
    "category": "Neonatal, Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HIPEC",
    "meanings": [
      "Hyperthermic intraperitoneal chemotherapy"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HIS",
    "meanings": [
      "Hospital information system"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HIV",
    "meanings": [
      "Human immunodeficiency virus"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HLD",
    "meanings": [
      "High-level disinfection"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HNSCC",
    "meanings": [
      "Head and neck squamous cell carcinoma"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HR",
    "meanings": [
      "Heart rate"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HSCT",
    "meanings": [
      "Hematopoietic stem cell transplantation"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HSG",
    "meanings": [
      "Hysterosalpingography"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "HYPO",
    "meanings": [
      "Hypoglycemia"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "I&O",
    "meanings": [
      "Intake and output"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IADL",
    "meanings": [
      "Instrumental activities of daily living"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IBD",
    "meanings": [
      "Inflammatory bowel disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IBP",
    "meanings": [
      "Invasive blood pressure"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ICD",
    "meanings": [
      "Intercostal chest drain",
      "Implantable cardioverter-defibrillator"
    ],
    "category": "Cardiac, Surgery",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "ICH",
    "meanings": [
      "Intracerebral hemorrhage"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ICP",
    "meanings": [
      "Intracranial pressure"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ICU",
    "meanings": [
      "Intensive care unit"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IDH",
    "meanings": [
      "Intradialytic hypotension",
      "Ischemic heart disease"
    ],
    "category": "Renal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "IDHTN",
    "meanings": [
      "Intradialytic hypertension"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IGAN",
    "meanings": [
      "IgA nephropathy"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IHC",
    "meanings": [
      "Immunohistochemistry"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IHD",
    "meanings": [
      "Ischemic heart disease"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ILD",
    "meanings": [
      "Interstitial lung disease"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IM",
    "meanings": [
      "Intramuscular"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IMRT",
    "meanings": [
      "Intensity-modulated radiotherapy"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "INJ",
    "meanings": [
      "Injection"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "INR",
    "meanings": [
      "International normalized ratio"
    ],
    "category": "Drugs, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IOL",
    "meanings": [
      "Intraocular lens"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IOP",
    "meanings": [
      "Intraocular pressure"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IOUS",
    "meanings": [
      "Intraoperative ultrasound"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IPC",
    "meanings": [
      "Infection prevention and control"
    ],
    "category": "Infection, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IPD",
    "meanings": [
      "Inpatient department"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IPSG",
    "meanings": [
      "International patient safety goals"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ISBAR",
    "meanings": [
      "Identify situation background assessment recommendation"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IU",
    "meanings": [
      "International unit"
    ],
    "category": "Safety",
    "status": "unsafe",
    "safetyNote": "Write “international units” in full"
  },
  {
    "short": "IUD",
    "meanings": [
      "Intrauterine device",
      "Intrauterine death"
    ],
    "category": "Maternal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "IUFD",
    "meanings": [
      "Intrauterine fetal demise"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IUGR",
    "meanings": [
      "Intrauterine growth restriction"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IUI",
    "meanings": [
      "Intrauterine insemination"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IV",
    "meanings": [
      "Intravenous"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IVF",
    "meanings": [
      "In vitro fertilization",
      "Intravenous fluids"
    ],
    "category": "Drugs, Maternal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "IVH",
    "meanings": [
      "Intraventricular hemorrhage"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "IVIG",
    "meanings": [
      "Intravenous immunoglobulin"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "JCI",
    "meanings": [
      "Joint Commission International"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "K-WIRE",
    "meanings": [
      "Kirschner wire"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "KCL",
    "meanings": [
      "Potassium chloride"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "KFT",
    "meanings": [
      "Kidney function tests"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "KMC",
    "meanings": [
      "Kangaroo mother care"
    ],
    "category": "Maternal, Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "KPI",
    "meanings": [
      "Key performance indicator"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "KUB",
    "meanings": [
      "Kidney, ureter and bladder",
      "Kidney ureter bladder radiograph"
    ],
    "category": "Imaging, Renal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "LA",
    "meanings": [
      "Local anesthesia",
      "Left atrium"
    ],
    "category": "Surgery",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "LARC",
    "meanings": [
      "Long-acting reversible contraception"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LASA",
    "meanings": [
      "Look-alike sound-alike"
    ],
    "category": "Drugs, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LASIK",
    "meanings": [
      "Laser-assisted in situ keratomileusis"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LBW",
    "meanings": [
      "Low birth weight"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LDH",
    "meanings": [
      "Lactate dehydrogenase"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LFT",
    "meanings": [
      "Liver function tests"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LGA",
    "meanings": [
      "Large for gestational age"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LGIB",
    "meanings": [
      "Lower gastrointestinal bleeding"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LMA",
    "meanings": [
      "Laryngeal mask airway"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LMP",
    "meanings": [
      "Last menstrual period"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LMWH",
    "meanings": [
      "Low-molecular-weight heparin"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LP",
    "meanings": [
      "Lumbar puncture"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LSCS",
    "meanings": [
      "Lower segment cesarean section"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LTBI",
    "meanings": [
      "Latent tuberculosis infection"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LV",
    "meanings": [
      "Left ventricle"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "LVEF",
    "meanings": [
      "Left ventricular ejection fraction"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MAC",
    "meanings": [
      "Monitored anesthesia care",
      "Mycobacterium avium complex"
    ],
    "category": "Surgery",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "MAOI",
    "meanings": [
      "Monoamine oxidase inhibitor"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MAP",
    "meanings": [
      "Mean arterial pressure"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MAR",
    "meanings": [
      "Medication administration record"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MAS",
    "meanings": [
      "Meconium aspiration syndrome"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MASH",
    "meanings": [
      "Metabolic dysfunction-associated steatohepatitis"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MASLD",
    "meanings": [
      "Metabolic dysfunction-associated steatotic liver disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MCH",
    "meanings": [
      "Mean corpuscular hemoglobin"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MCHC",
    "meanings": [
      "Mean corpuscular hemoglobin concentration"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MCV",
    "meanings": [
      "Mean corpuscular volume"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MDD",
    "meanings": [
      "Major depressive disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MDR",
    "meanings": [
      "Multidrug resistant"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MDR-TB",
    "meanings": [
      "Multidrug-resistant tuberculosis"
    ],
    "category": "Infection, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MDRO",
    "meanings": [
      "Multidrug-resistant organism"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MDS",
    "meanings": [
      "Myelodysplastic syndrome"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MEWS",
    "meanings": [
      "Modified early warning score"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MG",
    "meanings": [
      "Myasthenia gravis",
      "Milligram"
    ],
    "category": "Neurology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "MGSO4",
    "meanings": [
      "Magnesium sulfate"
    ],
    "category": "Drugs",
    "status": "unsafe",
    "safetyNote": "Write “magnesium sulfate” in full"
  },
  {
    "short": "MI",
    "meanings": [
      "Myocardial infarction"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MLC",
    "meanings": [
      "Medico-legal case"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MM",
    "meanings": [
      "Multiple myeloma"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MMSE",
    "meanings": [
      "Mini-mental state examination"
    ],
    "category": "Neurology, Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MND",
    "meanings": [
      "Motor neuron disease"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MOCA",
    "meanings": [
      "Montreal Cognitive Assessment"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MORSE",
    "meanings": [
      "Morse fall scale"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MPN",
    "meanings": [
      "Myeloproliferative neoplasm"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MRA",
    "meanings": [
      "Magnetic resonance angiography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MRCP",
    "meanings": [
      "Magnetic resonance cholangiopancreatography"
    ],
    "category": "GI, Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MRD",
    "meanings": [
      "Medical records department"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MRI",
    "meanings": [
      "Magnetic resonance imaging"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MRSA",
    "meanings": [
      "Methicillin-resistant Staphylococcus aureus"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MRV",
    "meanings": [
      "Magnetic resonance venography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MS",
    "meanings": [
      "Multiple sclerosis",
      "Mitral stenosis",
      "Morphine sulfate"
    ],
    "category": "Neurology",
    "status": "unsafe",
    "safetyNote": "Avoid ambiguous “MS”; specify the full clinical term"
  },
  {
    "short": "MSO4",
    "meanings": [
      "Morphine sulfate"
    ],
    "category": "Safety",
    "status": "unsafe",
    "safetyNote": "Write “morphine sulfate” in full"
  },
  {
    "short": "MSSA",
    "meanings": [
      "Methicillin-sensitive Staphylococcus aureus"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "MTP",
    "meanings": [
      "Medical termination of pregnancy"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "N95",
    "meanings": [
      "N95 filtering facepiece respirator"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NAAT",
    "meanings": [
      "Nucleic acid amplification test"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NABH",
    "meanings": [
      "National Accreditation Board for Hospitals and Healthcare Providers"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NAC",
    "meanings": [
      "N-acetylcysteine"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NACL",
    "meanings": [
      "Sodium chloride"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NAFLD",
    "meanings": [
      "Nonalcoholic fatty liver disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NCP",
    "meanings": [
      "Nursing care plan"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NCV",
    "meanings": [
      "Nerve conduction velocity"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NEC",
    "meanings": [
      "Necrotizing enterocolitis"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NEWS2",
    "meanings": [
      "National Early Warning Score 2"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NG",
    "meanings": [
      "Nasogastric"
    ],
    "category": "GI, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NGT",
    "meanings": [
      "Nasogastric tube"
    ],
    "category": "Neonatal, Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NIBP",
    "meanings": [
      "Non-invasive blood pressure"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NICU",
    "meanings": [
      "Neonatal intensive care unit"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NIHSS",
    "meanings": [
      "National Institutes of Health Stroke Scale"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NIPPV",
    "meanings": [
      "Non-invasive positive pressure ventilation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NIV",
    "meanings": [
      "Non-invasive ventilation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NJ",
    "meanings": [
      "Nasojejunal"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NMS",
    "meanings": [
      "Neuroleptic malignant syndrome"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NNH",
    "meanings": [
      "Neonatal hyperbilirubinemia"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NOAC",
    "meanings": [
      "Non-vitamin K antagonist oral anticoagulant"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NPDR",
    "meanings": [
      "Nonproliferative diabetic retinopathy"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NPO",
    "meanings": [
      "Nil per oral"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NPWT",
    "meanings": [
      "Negative pressure wound therapy"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NRP",
    "meanings": [
      "Neonatal resuscitation program"
    ],
    "category": "Neonatal, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NS",
    "meanings": [
      "Normal saline"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NSAID",
    "meanings": [
      "Nonsteroidal anti-inflammatory drug"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NSCLC",
    "meanings": [
      "Non-small-cell lung cancer"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NSI",
    "meanings": [
      "Needlestick injury"
    ],
    "category": "Infection, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NST",
    "meanings": [
      "Non-stress test"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "NSTEMI",
    "meanings": [
      "Non-ST-elevation myocardial infarction"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OAC",
    "meanings": [
      "Oral anticoagulant"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OCD",
    "meanings": [
      "Obsessive-compulsive disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OCT",
    "meanings": [
      "Optical coherence tomography"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OCTA",
    "meanings": [
      "Optical coherence tomography angiography"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OD",
    "meanings": [
      "Once daily",
      "Right eye"
    ],
    "category": "Medication safety, Ophthalmology",
    "status": "unsafe",
    "safetyNote": "OD can mean once daily or right eye. Use the intended full words."
  },
  {
    "short": "OGD",
    "meanings": [
      "Oesophagogastroduodenoscopy"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OGT",
    "meanings": [
      "Orogastric tube"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OGTT",
    "meanings": [
      "Oral glucose tolerance test"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OHT",
    "meanings": [
      "Ocular hypertension"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OPD",
    "meanings": [
      "Outpatient department"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OR",
    "meanings": [
      "Operating room"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ORIF",
    "meanings": [
      "Open reduction and internal fixation"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ORS",
    "meanings": [
      "Oral rehydration solution"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OSA",
    "meanings": [
      "Obstructive sleep apnea"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "OT",
    "meanings": [
      "Operation theatre"
    ],
    "category": "General, Infection, Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PACO2",
    "meanings": [
      "Arterial partial pressure of carbon dioxide"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PACU",
    "meanings": [
      "Post-anesthesia care unit"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PAH",
    "meanings": [
      "Pulmonary arterial hypertension"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PALS",
    "meanings": [
      "Pediatric advanced life support"
    ],
    "category": "Cardiac, Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PANSS",
    "meanings": [
      "Positive and Negative Syndrome Scale"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PAO2",
    "meanings": [
      "Arterial partial pressure of oxygen"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCI",
    "meanings": [
      "Percutaneous coronary intervention"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCIOL",
    "meanings": [
      "Posterior chamber intraocular lens"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCN",
    "meanings": [
      "Percutaneous nephrostomy"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCNL",
    "meanings": [
      "Percutaneous nephrolithotomy"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCOD",
    "meanings": [
      "Polycystic ovarian disease"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCOS",
    "meanings": [
      "Polycystic ovary syndrome"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCPNDT",
    "meanings": [
      "Pre-conception and pre-natal diagnostic techniques"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCR",
    "meanings": [
      "Polymerase chain reaction"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCT",
    "meanings": [
      "Procalcitonin"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PCV",
    "meanings": [
      "Pressure-controlled ventilation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PD",
    "meanings": [
      "Peritoneal dialysis",
      "Parkinson disease"
    ],
    "category": "Renal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "PDA",
    "meanings": [
      "Patent ductus arteriosus",
      "Patient-controlled drug administration"
    ],
    "category": "Cardiac, Neonatal",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "PDR",
    "meanings": [
      "Proliferative diabetic retinopathy"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PDSA",
    "meanings": [
      "Plan do study act"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PE",
    "meanings": [
      "Pulmonary embolism"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PEEP",
    "meanings": [
      "Positive end-expiratory pressure"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PEFR",
    "meanings": [
      "Peak expiratory flow rate"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PEG",
    "meanings": [
      "Percutaneous endoscopic gastrostomy"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PEJ",
    "meanings": [
      "Percutaneous endoscopic jejunostomy"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PEP",
    "meanings": [
      "Post-exposure prophylaxis"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PERMCATH",
    "meanings": [
      "Tunneled hemodialysis catheter"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PET",
    "meanings": [
      "Pre-eclamptic toxemia",
      "Positron emission tomography"
    ],
    "category": "Imaging, Maternal, Oncology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "PET-CT",
    "meanings": [
      "Positron emission tomography-computed tomography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PFT",
    "meanings": [
      "Pulmonary function test"
    ],
    "category": "General, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PHQ-9",
    "meanings": [
      "Patient Health Questionnaire-9"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PHT",
    "meanings": [
      "Pulmonary hypertension"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PICC",
    "meanings": [
      "Peripherally inserted central catheter"
    ],
    "category": "Neonatal, Oncology, Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PICU",
    "meanings": [
      "Pediatric intensive care unit"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PIH",
    "meanings": [
      "Pregnancy-induced hypertension"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PN",
    "meanings": [
      "Parenteral nutrition"
    ],
    "category": "Drugs, GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PNC",
    "meanings": [
      "Postnatal care"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PND",
    "meanings": [
      "Postnatal depression"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PNS",
    "meanings": [
      "Peripheral nervous system"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "POCT",
    "meanings": [
      "Point-of-care testing"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "POCUS",
    "meanings": [
      "Point-of-care ultrasonography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PONV",
    "meanings": [
      "Postoperative nausea and vomiting"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "POP",
    "meanings": [
      "Plaster of Paris",
      "Pelvic organ prolapse"
    ],
    "category": "Surgery",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "PPBS",
    "meanings": [
      "Postprandial blood sugar"
    ],
    "category": "Diabetes, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PPE",
    "meanings": [
      "Personal protective equipment"
    ],
    "category": "General, Infection, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PPH",
    "meanings": [
      "Postpartum hemorrhage"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PPHN",
    "meanings": [
      "Persistent pulmonary hypertension of the newborn"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PPI",
    "meanings": [
      "Permanent pacemaker implantation",
      "Proton pump inhibitor"
    ],
    "category": "Cardiac, Drugs",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "PPM",
    "meanings": [
      "Permanent pacemaker"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PPROM",
    "meanings": [
      "Preterm prelabor rupture of membranes"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PR",
    "meanings": [
      "Progesterone receptor",
      "Per rectum"
    ],
    "category": "Oncology",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "PRBC",
    "meanings": [
      "Packed red blood cells"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PREP",
    "meanings": [
      "Pre-exposure prophylaxis"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PRES",
    "meanings": [
      "Posterior reversible encephalopathy syndrome"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PRK",
    "meanings": [
      "Photorefractive keratectomy"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PROM",
    "meanings": [
      "Prelabor rupture of membranes"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PSA",
    "meanings": [
      "Prostate-specific antigen"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PSV",
    "meanings": [
      "Pressure support ventilation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PT",
    "meanings": [
      "Prothrombin time",
      "Physiotherapy"
    ],
    "category": "General",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "PTBD",
    "meanings": [
      "Percutaneous transhepatic biliary drainage"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PTCA",
    "meanings": [
      "Percutaneous transluminal coronary angioplasty"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PTH",
    "meanings": [
      "Parathyroid hormone"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PTSD",
    "meanings": [
      "Post-traumatic stress disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PUD",
    "meanings": [
      "Peptic ulcer disease"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "PV",
    "meanings": [
      "Pharmacovigilance"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "QA",
    "meanings": [
      "Quality assurance"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "QD",
    "meanings": [
      "Daily"
    ],
    "category": "Safety",
    "status": "unsafe",
    "safetyNote": "Use “daily”"
  },
  {
    "short": "QI",
    "meanings": [
      "Quality improvement"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "QOD",
    "meanings": [
      "Every other day"
    ],
    "category": "Safety",
    "status": "unsafe",
    "safetyNote": "Use “every other day”"
  },
  {
    "short": "RAPD",
    "meanings": [
      "Relative afferent pupillary defect"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RASS",
    "meanings": [
      "Richmond Agitation-Sedation Scale"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RBC",
    "meanings": [
      "Red blood cell"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RBS",
    "meanings": [
      "Random blood sugar"
    ],
    "category": "Diabetes, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RCA",
    "meanings": [
      "Root cause analysis"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RCC",
    "meanings": [
      "Renal cell carcinoma"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RDP",
    "meanings": [
      "Random-donor platelets"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RDS",
    "meanings": [
      "Respiratory distress syndrome"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RFA",
    "meanings": [
      "Radiofrequency ablation"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RFT",
    "meanings": [
      "Renal function tests"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RH",
    "meanings": [
      "Rhesus blood group"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RHD",
    "meanings": [
      "Rheumatic heart disease"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RIRS",
    "meanings": [
      "Retrograde intrarenal surgery"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RL",
    "meanings": [
      "Ringer lactate"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RLE",
    "meanings": [
      "Refractive lens exchange"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ROP",
    "meanings": [
      "Retinopathy of prematurity"
    ],
    "category": "Neonatal, Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "ROSC",
    "meanings": [
      "Return of spontaneous circulation"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RPOC",
    "meanings": [
      "Retained products of conception"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RR",
    "meanings": [
      "Respiratory rate"
    ],
    "category": "General, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RSI",
    "meanings": [
      "Rapid sequence intubation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RT",
    "meanings": [
      "Radiotherapy"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RT-PCR",
    "meanings": [
      "Reverse transcription polymerase chain reaction"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RTA",
    "meanings": [
      "Renal tubular acidosis"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RUT",
    "meanings": [
      "Rapid urease test"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "RV",
    "meanings": [
      "Right ventricle"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SA",
    "meanings": [
      "Spinal anesthesia"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SAH",
    "meanings": [
      "Subarachnoid hemorrhage"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SAO2",
    "meanings": [
      "Arterial oxygen saturation"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SBAR",
    "meanings": [
      "Situation background assessment recommendation"
    ],
    "category": "Nursing",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SBP",
    "meanings": [
      "Spontaneous bacterial peritonitis"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SBRT",
    "meanings": [
      "Stereotactic body radiotherapy"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SC",
    "meanings": [
      "Subcutaneous"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SCI",
    "meanings": [
      "Spinal cord injury"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SCLC",
    "meanings": [
      "Small-cell lung cancer"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SCT",
    "meanings": [
      "Stem cell transplantation"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SDH",
    "meanings": [
      "Subdural hematoma"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SDP",
    "meanings": [
      "Single-donor platelets"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SGA",
    "meanings": [
      "Small for gestational age"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SIADH",
    "meanings": [
      "Syndrome of inappropriate antidiuretic hormone secretion"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SIMV",
    "meanings": [
      "Synchronised intermittent mandatory ventilation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SNCU",
    "meanings": [
      "Special newborn care unit"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SNRI",
    "meanings": [
      "Serotonin-norepinephrine reuptake inhibitor"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SPO2",
    "meanings": [
      "Peripheral oxygen saturation"
    ],
    "category": "General, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SSI",
    "meanings": [
      "Surgical site infection"
    ],
    "category": "Infection, Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SSPE",
    "meanings": [
      "Subacute sclerosing panencephalitis"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SSRI",
    "meanings": [
      "Selective serotonin reuptake inhibitor"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "STEMI",
    "meanings": [
      "ST-elevation myocardial infarction"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "STERRAD",
    "meanings": [
      "Hydrogen peroxide gas plasma sterilization"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SUD",
    "meanings": [
      "Substance use disorder"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "SVT",
    "meanings": [
      "Supraventricular tachycardia"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "T-PIECE",
    "meanings": [
      "T-piece resuscitator"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "T1DM",
    "meanings": [
      "Type 1 diabetes mellitus"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "T2DM",
    "meanings": [
      "Type 2 diabetes mellitus"
    ],
    "category": "Diabetes",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "T3",
    "meanings": [
      "Triiodothyronine"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "T4",
    "meanings": [
      "Thyroxine"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TAVI",
    "meanings": [
      "Transcatheter aortic valve implantation"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TAVR",
    "meanings": [
      "Transcatheter aortic valve replacement"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TB",
    "meanings": [
      "Tuberculosis"
    ],
    "category": "Infection, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TBI",
    "meanings": [
      "Traumatic brain injury"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TCA",
    "meanings": [
      "Tricyclic antidepressant"
    ],
    "category": "Psychiatry",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TEE",
    "meanings": [
      "Transesophageal echocardiography"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TFT",
    "meanings": [
      "Thyroid function tests"
    ],
    "category": "Diabetes, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "THA",
    "meanings": [
      "Total hip arthroplasty"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TIA",
    "meanings": [
      "Transient ischemic attack"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TIPS",
    "meanings": [
      "Transjugular intrahepatic portosystemic shunt"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TKA",
    "meanings": [
      "Total knee arthroplasty"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TLS",
    "meanings": [
      "Tumor lysis syndrome"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TLSO",
    "meanings": [
      "Thoracolumbosacral orthosis"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TNM",
    "meanings": [
      "Tumor node metastasis"
    ],
    "category": "Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TOF",
    "meanings": [
      "Tetralogy of Fallot"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TOLAC",
    "meanings": [
      "Trial of labor after cesarean"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TPE",
    "meanings": [
      "Therapeutic plasma exchange"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TPN",
    "meanings": [
      "Total parenteral nutrition"
    ],
    "category": "Drugs, GI, Oncology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TSH",
    "meanings": [
      "Thyroid stimulating hormone"
    ],
    "category": "Diabetes, General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TT",
    "meanings": [
      "Tracheostomy tube",
      "Tetanus toxoid"
    ],
    "category": "Respiratory",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "TTE",
    "meanings": [
      "Transthoracic echocardiography"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TTN",
    "meanings": [
      "Transient tachypnea of the newborn"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TURBT",
    "meanings": [
      "Transurethral resection of bladder tumor"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TURP",
    "meanings": [
      "Transurethral resection of the prostate"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "TV",
    "meanings": [
      "Tidal volume",
      "Television"
    ],
    "category": "Respiratory",
    "status": "ambiguous",
    "safetyNote": ""
  },
  {
    "short": "TXA",
    "meanings": [
      "Tranexamic acid"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "U",
    "meanings": [
      "Unit"
    ],
    "category": "Safety",
    "status": "unsafe",
    "safetyNote": "Write “units” in full"
  },
  {
    "short": "UAC",
    "meanings": [
      "Umbilical arterial catheter"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UAE",
    "meanings": [
      "Uterine artery embolization"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UC",
    "meanings": [
      "Ulcerative colitis"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UFH",
    "meanings": [
      "Unfractionated heparin"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UGI",
    "meanings": [
      "Upper gastrointestinal"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UGIB",
    "meanings": [
      "Upper gastrointestinal bleeding"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UGIE",
    "meanings": [
      "Upper gastrointestinal endoscopy"
    ],
    "category": "GI",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "USG",
    "meanings": [
      "Ultrasonography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UTI",
    "meanings": [
      "Urinary tract infection"
    ],
    "category": "Renal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "UVC",
    "meanings": [
      "Umbilical venous catheter"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VA",
    "meanings": [
      "Visual acuity"
    ],
    "category": "Ophthalmology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VAC",
    "meanings": [
      "Vacuum-assisted closure"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VAE",
    "meanings": [
      "Ventilator-associated event"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VAP",
    "meanings": [
      "Ventilator-associated pneumonia"
    ],
    "category": "Infection, Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VBAC",
    "meanings": [
      "Vaginal birth after cesarean"
    ],
    "category": "Maternal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VBG",
    "meanings": [
      "Venous blood gas"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VCV",
    "meanings": [
      "Volume-controlled ventilation"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VF",
    "meanings": [
      "Ventricular fibrillation"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VKA",
    "meanings": [
      "Vitamin K antagonist"
    ],
    "category": "Drugs",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VLBW",
    "meanings": [
      "Very low birth weight"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VP",
    "meanings": [
      "Ventriculoperitoneal"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VP SHUNT",
    "meanings": [
      "Ventriculoperitoneal shunt"
    ],
    "category": "Neurology",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VRE",
    "meanings": [
      "Vancomycin-resistant Enterococcus"
    ],
    "category": "Infection",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VSD",
    "meanings": [
      "Ventricular septal defect"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VT",
    "meanings": [
      "Ventricular tachycardia"
    ],
    "category": "Cardiac",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VTE",
    "meanings": [
      "Venous thromboembolism"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "VTID",
    "meanings": [
      "Tidal volume indexed to ideal body weight"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "WBC",
    "meanings": [
      "White blood cell"
    ],
    "category": "General",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "WHO",
    "meanings": [
      "World Health Organization"
    ],
    "category": "Surgery",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "X-RAY",
    "meanings": [
      "Radiography"
    ],
    "category": "Imaging",
    "status": "recognized",
    "safetyNote": ""
  },
  {
    "short": "XDR-TB",
    "meanings": [
      "Extensively drug-resistant tuberculosis"
    ],
    "category": "Respiratory",
    "status": "recognized",
    "safetyNote": ""
  }
];
