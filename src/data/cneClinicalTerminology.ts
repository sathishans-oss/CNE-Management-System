/**
 * AIIMS Rishikesh CNE Smart Topic suggestions — candidate library for educator review.
 * NOT an institutional list of approved abbreviations. Medication-related safety
 * flags are informed by Joint Commission / ISMP guidance; avoid use in orders.
 * Historic title suggestions exclude identifiable case presentations and names.
 * Add approved changes by reviewing this data; don't derive safety from AI.
 */
export interface ClinicalAbbreviation {
  short: string;
  meanings: string[];
  category: string;
  status: 'recognized' | 'ambiguous' | 'unsafe';
  safetyNote: string;
}
export const CLINICAL_ABBREVIATIONS: ClinicalAbbreviation[] = [
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
    "meanings": [
      "Bronchopulmonary dysplasia"
    ],
    "category": "Neonatal",
    "status": "recognized",
    "safetyNote": ""
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
export const HISTORICAL_CNE_TITLES: string[] = [
  "Labelling of Injectable Medicines, fluidbags and lines",
  "Pancytopenia",
  "Folys catheterisation and Catheter care(Male)",
  "Hemodialysis line care",
  "Management of pelvic fractures",
  "Prevention of VAP: Nurse’s Role",
  "5 's' policy , Emergeny codes",
  "5S of organization, Needle Stick Injuy, Hand Hygiene, Biomedical Waste Management,",
  "A CNE ON CENTRAL LINE AND HD LINE CAFRE",
  "A CNE ON NURSING CARE AND MANAGEMENT OF NEPHRECTOMY PATIENTS",
  "ABG & Analysis",
  "ABG analysis & procedure",
  "ABG AND VBG ANALYSIS",
  "ABG INTERPRETATION",
  "Abnormal uterine Bleeding",
  "Accurate count protocols for sponges and instruments.",
  "Achalasia Cardia",
  "Acute coronary syndome recognition and nursing care",
  "Acute kidney disease",
  "Acute renal failure & its mgt",
  "Adjuvant and Neo adjuvant Chemotherapy protocols",
  "Administration & dosage of MgSO4 in patient with pre-eclampsia & eclampsia",
  "Administration & Monitoring of Medications",
  "Administration of blood & it's products",
  "Administration of Blood & Nursing Management of Blood Transfusion Reactions",
  "Administration of chemotharepy drug-Nursing Responsibilities",
  "Administration of Chemotherapy",
  "Adminstration of Inj Phesgo",
  "Admission & Discharge procedure",
  "Admission & Discharge procedure (Online & offline)",
  "Admission and Discharge Procedure",
  "Admission and discharge process and File documentation",
  "Admission and discharge process and file doucumentation",
  "Admission Process and eligibilty criteria of admission in Private Ward D6",
  "Adnexal mass and its management",
  "ADVANCED PAIN RELIEF PROCEDURES",
  "Adverse drug reaction",
  "Adverse effect of Psychotropic Drug",
  "Agilia Infusion (Volumetric & Non volumetric)",
  "Airway Management",
  "Airway Management and Anesthesia Assistance in the Operation Theatre",
  "Airway Management and Devices",
  "AIRWAY MANAGEMNET",
  "AMBU BAG",
  "AML/CML",
  "Anaesthesia work station LAYOUT",
  "Anatomy and physiology of ear",
  "ANATOMY AND PHYSIOLOGY OF GI SYSTEM",
  "Anatomy and Physiology of Liver",
  "ANC with IVF Preganancy",
  "Anemia",
  "Anemia management",
  "ANOPHTHALMIA",
  "Anorectal Malformation & care",
  "Anti -coagulation protocol in HD",
  "Antibiotic allergic test before Administation",
  "And Antibiotic sensitiblity testing",
  "ANTIEPLEPTIC DRUGS",
  "Antimicrobial resistance",
  "Anxiety disorder",
  "Appendicitis & Its Managemt",
  "Application & Interpretation of NST (Non-Stress Test)",
  "Argon Plasma Coagulation",
  "Asepsis & Disinfection in NICU",
  "ASIA impairment scale",
  "Aspergilloma",
  "Assemble Thomson Retractor",
  "Assessment and intervention for Cardiac Arrest",
  "Assessment and Management of",
  "Polytrauma Patients",
  "Assisting and care of Central Line",
  "Assisting and care of Foleys",
  "Assisting in neonatal Cental line insertions",
  "AST (ALLERGY SKIN TEST)",
  "Asthma -Its Management & Correct Inhaler Techniques",
  "Augmention of Labour",
  "Autoimmune encephalitis",
  "AV fistula Care, complications and its Management",
  "AV malformation",
  "B/T CELL ALL",
  "Bag and mask Ventilation",
  "Bartholin Cyst",
  "Basic ECG",
  "BASIC HYGENIC STANDARD IN THE WARD",
  "BASIC LIFE SUPPORT",
  "BASIC LIFE SUPPORT/CARDIO PULMONARY RESUSCITATION",
  "Basic neonatal care",
  "Basic NRP",
  "BASIC NURSING AWARENESS IN IPD AREA",
  "BASIC OF ECG RHTYM",
  "Basics in OPD and Chemo preparation area.",
  "Basics in Premedication and IPD area.",
  "Basics in preparation of chemo therapy",
  "Basics of Anesthesia for OT Nurses",
  "Basics of asepsis in patient care unit",
  "Basics of mechanical ventilator",
  "Basics of neonatal care Nursing",
  "BASICS OF PREMEDICATION AND CHEMO PREPARATION AREA",
  "Basics of Tracheostomy – Indications, Types,",
  "and Equipment",
  "Basics of Ventilators",
  "Bed Sore - Prevention & care",
  "Bed sore grading",
  "Bed sore prevention ,staging and management",
  "Bed sore-Type,assessment & care",
  "Bed sores, and its management",
  "Behavioral pain scale",
  "bendamustine",
  "Best Practices for Catheterization Procedures",
  "Bile Duct Injury",
  "Biliary Stenting",
  "Bio Medical Waste Management in Cath-Lab",
  "BIO MEDICAL WASTE MANAGEMENT IN OT",
  "Bio medical waste manangement",
  "Bio-Medical waste management in the OT",
  "Biomedical waste management",
  "Biomedical Waste Management and Environmental cleaning",
  "Biomedical Waste Management in OT",
  "Biosafety Cabinet",
  "Bladder stone & its mgt with care of patient",
  "Blood Heamorrhage",
  "Blood sampling procedure",
  "Blood transfusion",
  "Blood Transfusion Practices in Oncology",
  "BLOOD TRANSFUSION PROTOCOL",
  "Blood Transfusion protocol and procedure",
  "Blood Transfusion Safety",
  "Blood Transfusion- Role of Nurse",
  "Blood transfussion",
  "BMW & NSI MANAGEMENT",
  "BMW MANAGEMENT AND HAND HYGINE PROCEDURE",
  "Bmw segregation",
  "Body image issues and rehabilitation in cancer surgery patients",
  "Body mechanics in Nursing",
  "BONE MARROW TRANSPLANT",
  "Bowel Preparation: Nursing Role in Ensuring Quality Colonoscopy",
  "BPAD(Bipolar affective disorder)",
  "Brachial plexus injury",
  "BRADEN SCALE FOR PRESSURE INJURY",
  "Braden scale, risk factors-Bed sore",
  "Brain Abscess",
  "BRIEF EXPLANATION OF BPH AND ITS MEDICAL ,SURGICAL AND NURSING MANAGEMENT",
  "BRIEF DESCRIPTION OF BMW AND ITS MANAGEMENT",
  "BRIEF DESCRIPTION OF URINARY TRACT INFECTION",
  "BROWN SYNDROME",
  "BUNDLE CARE (CAUTI/CLABSI/VAP)",
  "Bundle care check list",
  "Bundle care checklist",
  "BUNDLE CARE(CAUTI/CLABSI)",
  "Bundle check list",
  "Bundle Checklist",
  "bundle checklist $surgical safety checklist",
  "Buphthalmos",
  "Burn Wound Dressing Techniques",
  "Burnout prevention strategies",
  "Ca buccal mucosa",
  "Ca Ovary",
  "Ca pacreas",
  "CAPSULE ENDOSCOPY",
  "Carboplatine",
  "Cardiac arrest management",
  "during dialysis",
  "cardiac arrest management during dialysis",
  "Cardiac Arrhythmia",
  "cardiac emergencies and management",
  "Cardiopulmonary Resuscitation",
  "Care and Maintenance of Hospital supply and Equipments",
  "CARE AND MANAGEMENT OF PATIENT UNDERGOING ERCP PROCEDURE",
  "CARE AND MANAGEMENT OF SURGICAL DRAINS",
  "Care of Bundles",
  "CARE OF CABG PATIENT",
  "Care of cancer patient post surgery: Nursing management essentials",
  "Care of central line",
  "Care of Dead Body",
  "Care of Endotracheal Tube",
  "Care of immunocompromised oncology patients",
  "Care of invasive lines",
  "Care of invasive lines in ICU",
  "Care of laparoscopic Instrument during and after surgery",
  "CARE OF LAPAROSCOPIC INSTRUMENTS",
  "Care of low birth weight baby",
  "Care of Patient on Ventilator",
  "Care of Patient Post-Urological Surgery (TURP, Nephrectomy, Cystectomy)",
  "Care of patient with arterial line",
  "Care of Patient with Bedsore",
  "Care of Patient with renal biopsy",
  "Care of patient with spinal cord injury",
  "care of patient with spinal injuries",
  "Care of patient with thyroidectomy",
  "CARE OF PATIENTS ON VENTILATOR",
  "CARE OF PATIENTS WITH AMPUTATION AND REHABILITATION",
  "Care of Patients with Stroke",
  "Care of Patients with suicidal attempt by hanging",
  "Care of PICC Line",
  "Care of post CABG patient",
  "Care of post operative Cardiac Surgery Patient",
  "Care of post valve replacement pt.",
  "care of post- operative cardiac Surgery Patients",
  "Care of pressure ulcers",
  "Care of Pt with ICD & COMPLICATION",
  "Care of Valular patient.",
  "Care of Venti Patient",
  "CARE OF VENTILATOR PATIENT",
  "Carsh Cart Policy",
  "Cast & Slab",
  "CATARACT",
  "Catatonia",
  "Catheter-related bloodstream infection(CRBSI)",
  "CATHETERIZATION",
  "CAUTI / CLABSI / VAP BUNDLES",
  "CAUTI CLABSI VAP CHECKLIST",
  "Center line - prepration , care, removal",
  "central line care and bundle checklist",
  "Central line care procedure and protocol",
  "Central Line Dressing and care, CLABSI",
  "Central line overview ,maitenance",
  "and care",
  "Central line overview ,maitenance and care",
  "Cerebral Aneurism",
  "cerebral palsy",
  "Chemo preparation",
  "Chemoport handeling & care",
  "Chemotherapy administration protocol in Gynaecology",
  "Chemotherapy administration protocols in Gynaecology ward",
  "CHEMOTHERAPY PROTOCOL AND PREVENTION OF MEDICINE ERROR",
  "CHEMOTHRAPY PROTOCOL AND MEDICATION ERROR",
  "CHEST PAIN",
  "Chest Physiotherapy",
  "CHEST TRAUMA",
  "Chronic kidney disease",
  "Chronic renal failure & its mgt",
  "CLABSI",
  "Classification of burn injury",
  "Classification of Neonates on the basis of Birth weight and Gestational age",
  "CLEANING OF ENDOSCOPE",
  "Cleaning of Instruments and Sterilization monitoring",
  "Clinical Nursing handover",
  "CNCP & ISBAR",
  "CNCP, ISBAR & Nursing Documentation",
  "CO Poisoning",
  "Cognitive behavioural therapy (CBT)",
  "COLOBOMA",
  "Colorectal cancer",
  "Colostomy care and Bowel irrigation",
  "Colstomy & Its Management",
  "comlication of thyroid surgery and nursing",
  "implications Hypocalcemia: Identification,",
  "Nursing Care",
  "Common Disinfectant Used in OT",
  "Communication & Teamwork in OT",
  "Communication and Teamwork in the Surgical Team",
  "Communication skills",
  "COMMUNITY ACQUIRED PNEUMONIA",
  "complication during hemodialysis & their management",
  "Congenital cleft lip and palate",
  "Conjunctivitis",
  "constipation in post-operative cases cause and management",
  "Corneal Anatomy & Corneoscleral Button Recovery",
  "Counselling for breastfeeding success (nursing Services)",
  "CPN/CPB",
  "CPR and use of Emergency drugs",
  "Cranial Nerve examination",
  "Crash cart",
  "Crash cart & Emergency medications",
  "Crash cart & its management",
  "Crash Cart and Defibrillator",
  "Crash cart drugs",
  "Crash cart equipments",
  "Crash Cart management and handling ( mechanism of action of emergency drugs",
  "Crash cart medicine",
  "Crash cart medicines: group, preparation, administration and monitoring",
  "Crash cart policies and its",
  "handling",
  "Crash cart policies and its handling",
  "Crash cart policy",
  "critical care nutrition for ICU Patients",
  "CSSD Instruments used in Gynaecological Procedures",
  "CSSD STANDERD AND GUIDELINES",
  "Cushing’s syndrome",
  "CVA- Types, Pathophysiology, Treatment & Nursing care",
  "CVP Monotoring",
  "Cyanotic Congenital Heart Disease.",
  "CYCLOPHOSPHAMIDE",
  "CYCLOSPORINE",
  "CYSTOGASTROSTOMY",
  "Cystoscopy and Nursing Responsibilities",
  "cytarabine",
  "DCLD INCLUDING DIETARY MANAGEMENT",
  "Dealing a Medicolegal case-admission to discharge",
  "Dealing with patients Refusing medicines :nursing Responsibilities",
  "DEATH PROTOCOLS",
  "Debrillator",
  "DECUBITIS ULCER AND BRADEN SCALE",
  "Defibrillation & cardioversion",
  "Defibrillation and cardioversion",
  "DEFIBRILLATOR",
  "Defibrillator Functioning",
  "Define dialysis ,principle and nursing care of dialysis",
  "DEFINE FOLYS CATHETERIZATION PROCEDURE",
  "DEFINE TB AND ITS PREVENTIONS AND MG",
  "Definition and classify, causes, pathology,clinical features, diagnosis and managment of diabatic foot",
  "Definition and classify, causes, pathology,clinical features, diagnosis and managment of necrotising fascitis",
  "Dementia",
  "Dementia and Alzheimers disease",
  "DEMONSTRATION ON VENTILATOR",
  "Dengue fever",
  "Depression",
  "DETAILED EXPLANATION OF NURSING INITIAL CHART AND ISBAR CHART",
  "Diabetes mellitus",
  "Diabetes Mellitus: Definition, types, pathophysiology,s/s, management, nursing care",
  "Diabetic foot care",
  "DIABETIC FOOT/ GANGRENE",
  "Diabtic Mellitus",
  "Diagnostic and Therapeutic Endoscopic procedures",
  "Diagnostic test in cancer",
  "Dialysis",
  "Dialysis machine alarms and",
  "immediate nursing action.",
  "dialysis overview prepration of patient and nursing care",
  "Dialyzer re-use from",
  "reprocesing to safe patient",
  "Dibetes Mellitus and nursing perspective",
  "Diet for BMT patient",
  "Difibrilator Protocol",
  "Digital and behavioural addiction",
  "Discharge education of cardiac patient.",
  "Disinfection and sterilization",
  "DKA and Management",
  "DM, RBS Charting & Insulin Therapy",
  "DOCETAXEL / PACLIAQUALIP",
  "DOCUMENTATION",
  "Documentation ISBAR",
  "Documentation & Handover in ICU",
  "Documentation & handover taking of ICU patient",
  "Documentation and Legal Aspects in OR Master Register",
  "Documentation And Reporting",
  "Documentation in psychiatric nursing",
  "Documentation of Bedsore",
  "Documentation of MLC cases",
  "Documnetation and Reporting In Nursing",
  "donning and doffing of PPE",
  "Dos & Donts of sample collection,transportation & storage",
  "Dos and dont s of sample collection,transportation and storage",
  "DOXORUBICIN",
  "Drain management of post op patient",
  "Drug carboprost:All Aspects",
  "DRUG CLASS ON FENTANYL",
  "Drug Inj. Amiodarone: All Aspects",
  "Drug Inj.Carboprost Tromethamine : All Aspects",
  "Drug Inj.Sugammadex: All Aspects",
  "Drug Nitroglycerin indications,contraindications,side effects and nursing responsibility.",
  "Drug Oxytocin:All Aspects",
  "Drug Use in Cardiac Emergencies",
  "Dry Eye Syndrome",
  "Dysphagia assessment and aspiration prevention",
  "E FAST AND ITS IMPORTANCE",
  "E-Office (NOC, Digital communication)",
  "Early Recognition and Management of Sepsis in Burn Patients",
  "Early Recognition of possible complications in post-renal Transplant Patient",
  "ECG & its interpretation",
  "ECT (Electro-convulsive therapy)",
  "ECT Checklist",
  "ECT:nursing consideration",
  "Effective operating room air management and flow control.",
  "Electrolyte balance and intake- output in post transplant patients",
  "ELECTROSURGICAL SAFETY AND EQUIPMENT USE",
  "Electrosurgical Unit (Cautery) Safety",
  "Emergency Codes",
  "EMERGENCY DRUGS",
  "Emergency intubation & anaesthetic drugs",
  "Emergency Intubation,indication,procedure and Nursing Responsibility",
  "Emergency Management",
  "and Complications in",
  "Tracheostomy Care",
  "Emergency management of patient with postpartum hemorrhage",
  "Emergency management of patient with pre-eclampsia",
  "EMERGENCY MEDICINE & CRASH CART MANAGEMENT",
  "Emergency Paediatric and adult tracheostomy management",
  "END OF LIFE CARE",
  "End-of-life care and palliative approaches in oncology",
  "Endoscope cleaning and disinfection",
  "Endoscope Disinfection",
  "ENDOSCOPIC CLIP",
  "Endotracheal tube (ET)/ Tracheostomy tube (TT) suctioning",
  "Endotracheal tube care & suctioning in children",
  "Endotracheal/tracheostomy and oral suctioning",
  "Engraftment Syndrom",
  "Enteric Fever",
  "ENTROSCOPY",
  "Environmental cleaning & Hypochlorite preparation",
  "EPS and Their Management",
  "ERAS protocol",
  "ESOPHAGEAL SEMS",
  "ET intubation and its care",
  "ET/ TT Suctioning",
  "Ethics & Advocacy",
  "ETOPOSIDE",
  "EUS COIL",
  "EVD Management and Pediatrics GCS Scoring",
  "EXPLANATION OF IV CANNULIZATION PROCEDURE",
  "External Beam Radiotherapy (EBRT)",
  "external ventricular darin (EVD)",
  "External ventricular drain and ICP monitoring",
  "Extrapyramidal symptoms and their management",
  "Extravasation and prevention",
  "Extravasation Management",
  "Extravasation Prevention and Management",
  "Eye donation awareness",
  "Eye infection and management",
  "EYE Sjogrens syndrome",
  "Facial, mouth opening and swallowing exercises",
  "FASTHUGSBID",
  "Febrile Neutropenia and Sepsis",
  "FEEDING JEJUNOSTOMY",
  "Feeding Jejunostomy, feed preparation and Nursing care",
  "Fire & Safety",
  "Fire and safety class",
  "Fire safety / LASA Drugs / Emergency Codes / 5S of Organization",
  "Fistula/Fissure: Definition, types, pathophysiology,s/s, management, nursing care",
  "flap monitoring and early detection of complication",
  "Fluid & Drug calculation",
  "Fluid and electrolyte balance in urology patients",
  "Fluid and electrolyte imbalance",
  "Fluid and electrolyte imbalance ,intake output monitorig",
  "Fluid and electrolyte imbalance in dialysis patients",
  "Focal seizure",
  "FOLEYS CATHETER INSERTION AND CARE",
  "Foleys catheterisation and its care",
  "Foly's Catheter overview ,maitenance",
  "Foly's Catheter overview ,maitenance and care",
  "Forest Classificaion",
  "Fracture Management",
  "and Nursing Care",
  "fracture of cranial bones",
  "Fungal endocarditis",
  "GA PROTOCOL AND POST-OP CAER AFTER MAJOR AND MINOR SURGERIES",
  "GCS Assessment",
  "generalized seizure",
  "Geriatric Rehabilitation",
  "Glasgow coma scale",
  "Glasgow Coma Scale (GCS) Assessment",
  "GLASGOW COMMA SCALE ASSESSMENT",
  "GLAUCOMA",
  "Glomerulonephritis",
  "GOWNING & GLOVING TECHNIQUE",
  "Guidance on use of Vasopressor agents by Peripheral/ CVC/CVAD /Intravenous infusion in adult Critical care patient",
  "Guillain Barre syndrome",
  "GYNECOMASTIA",
  "Hand Hygeine,BMW segregation,NSI Reporting",
  "Hand hygiene",
  "Hand hygiene ,spill kit management & BMW management",
  "Hand Hygiene (Steps & Moments)",
  "Hand Hygiene / Needle Stick Injury/ BMW/Spill Kit",
  "Hand Hygiene & Spill Management",
  "Hand hygiene and spill manangement",
  "Hand Hygiene, IV Lines & Vitals Monitoring",
  "Hand hygiene,BMW,NSI and spill management.",
  "HAND HYGIENE/BMW/NSI/SPILL MNGMNT",
  "HAND HYGINE AND SPILL MANAGEMENT",
  "Hand rub",
  "Handhygiene,firesafety,BMW,NSIspill mgt",
  "Handling Medico legal cases in Nursing Practice",
  "Handling Medicolegal Cases in Nursing Practice",
  "Handling of biomedical equipment - Syringe Pump, DVT pump, Defibrillator, Ventilator, Cardiac Monitor, Bipap, ECG machine,",
  "HD line dressing and Sampling techniques",
  "Head injuries and its types , Nursing care of head injury patients",
  "HEADLING MEDICO-LEGAL CASES IN NURSING PRACTICE",
  "Healthy living after transplant: Care, Prevention, Nutrition & Follow Up",
  "HEAMODYNAMIC MONITORING",
  "hearing loss cause/type/assessment",
  "Hemodynamic Monitoring",
  "HEMOPTYSIS",
  "Heparin saline preparation,use,indication and contraindications",
  "Hepatic Encephalopathy",
  "Hepatitis C",
  "HFNC functioning and care",
  "of patients with HFNC",
  "HFNC Venti setting",
  "High Flow Nasal Oxygenation (HFNO / HFNC)",
  "High risk & Narcotics Drug uses",
  "Hodgkin's lymphoma",
  "Hospital acquired infection",
  "Hospital bundle care",
  "Hospital infection control",
  "Hospital infection control Practices",
  "How to clean laparoscopic instruments",
  "How to complete a patient handover",
  "HOW TO PACK PLASMA ITEMS",
  "HOW TO PERFORM HAND RUB AND HAND WASHING (MEDICAL AND SURGICAL)",
  "How to use resuscitare warmers and T-Piece",
  "HYDROCEPHALUS",
  "Hydrocephalus & care",
  "Hydrocephalus: pathophysiology&management",
  "Hypertension",
  "Hypertensive Disorders of Pregnancy : All Aspects",
  "Hyperthermic Intraperitoneal Chemotherapy (HIPEC)",
  "hypospadiasis",
  "Hypoxic Ischemic Encephalopathy (HIE)",
  "Hyrdocephalus",
  "IBP Monitoring",
  "ICD (Intercostal chest drainage)",
  "ICD Care",
  "Icd Nursing care and assistance",
  "ICP management-Role of nurse",
  "ICP on lines and drains",
  "ICU delirium :Identification and interventions",
  "ICU related psychosis/delerium",
  "uncontrolled DM",
  "Identification & prevention of absconding of patient from obstetrics IPD",
  "IgA Nephropathy",
  "Immediate Newborn care",
  "importance of Documentation",
  "Importance of Intake output Monitiorning and charting in Post Operative Patients",
  "Importance of nutrition in rehabilitation patients",
  "IMPORTENCE OF EMERGENCY TRAY (checklist)",
  "Induction of labour",
  "Indwelling foley's catheter care",
  "INFECTION CONTROL",
  "PRACTICES AND PROTOCOL",
  "Infection control care bundles (SSI, CLABSI, CAUTI, VAE)",
  "Infection control in Burn Unit",
  "Infection control in ICU",
  "Infection control practice:- Spill Kit Management",
  "INFECTION CONTROL PRACTICES",
  "INFECTION CONTROL PRACTICES IN HOSPITAL",
  "Infection Control Practices in OT",
  "Infection controle practices for nurses working with HIV/AIDS patients",
  "Infection prevention and control",
  "in HD unit.",
  "Infection prevention and control in Psychiatric ward",
  "Infertility",
  "INFLAMMATORY BOWEL DISEASE",
  "Informed Consent and Legalities",
  "Infrastructure of the Operation Theatre (OT) Complex",
  "Inhaler Techniques",
  "Initial Nursing Asessment",
  "Initial nursing assessment",
  "Initial nursing management",
  "inj Adalimumab in pediatric patients",
  "Inj rituximab",
  "INJ RITUXIMAB IN PEDIATRIC PATIENTS",
  "Inj. Docetaxel",
  "Inj. Nab-Paclitaxel",
  "Inj. Paclitaxel",
  "Inj. Peg L-Aspargenase",
  "Inj. Trastuzumab",
  "Inotropic Drugs, Preparation,Doses and Nursing Responsibility.",
  "Institutional MLC protocol",
  "Instrument handling with sharp management",
  "Insulin adminstration to diabetes patient",
  "INTAKE AND OUTPUT MONITORING",
  "Intake Output Charting",
  "Integrated Antimicrobial Stewardship in Nursing Practice",
  "intellectual Disability",
  "INTERCOUSTAL DRAIN SYSTEM",
  "INTERNATIONAL PATIENT SAFETY GOALS",
  "Interpersonal relationships & professional etiquette",
  "Interstitial Lung Disease (ILD): ICU Perspective & Nursing Management",
  "Intra arterial blood pressure monitoring & management",
  "Intra Uterine Blood Transfusion",
  "Intracerebral hemorrhage",
  "Intradialytic hypertension mgt.(IDHTN)",
  "Intradialytic hypotension",
  "management",
  "Intraoperative Injury Prevention",
  "Intravenous Colloid Therapy:Benefits,Risks and Patient Safety",
  "Intubation- Ventilator, prepration , Care",
  "Invasive blood pressure monitoring",
  "inventary management in healthcare setting",
  "IPD AND CHEMO PREPARATION AREA",
  "ISBAR & CNCP Charting",
  "ISBAR & NCP",
  "ISBAR and CNCP documentation protocol",
  "Ischemic Stroke",
  "IV CANNULATION",
  "IV fluids in paediatrics (types, preparations, and monitoring)",
  "JAUNDICE",
  "JAUNDICE (CONJUGATED & UNCONJUGATED)",
  "Keratitis",
  "Koch's abdomen and its mgt with care",
  "Labelling of injectable medicines,fluid bags and lines",
  "laparoscopic surgical stapplers,trochars",
  "Large ASD",
  "Large VSD",
  "Laryngectomy -",
  "Comprehensive Nursing care",
  "LASA and high risk drugs",
  "LASA DRUGS",
  "LASA drugs policy",
  "LASA Policy",
  "LASA Policy & High Risk Medicine",
  "LASA, High risk medication, Narcotics/Emergency code",
  "LEGAL AND ETHICAL CONSIDERATIONS IN GENERAL MEDICINE",
  "Legal and Ethical issues in nursing",
  "LEUKOCORIA",
  "Lithium Therapy :Nursing Responsibilities",
  "LIVE SAVING DRUG INDICATIONS CONTRAINDICATION AND NURSES REPONSIBILITIES",
  "LIVER ABSCESS",
  "Liver Injury: Types,Grading, Management, and",
  "Nursing roleGrading, Management, and Nursing role",
  "Loading Dose in MI Patients.",
  "Loading dose in Myocardial infarction",
  "Look-Alike, Sound-Alike (LASA) Drugs",
  "LSCS steps and Trolley Preparation",
  "Lumbar puncture: pre and post procedure care",
  "Lung Hydatid Cyst /Cystic Lesion",
  "Maintenance of MLC, Non MLC MRD files and death files",
  "Malignant hyperthermia",
  "MALIGNENT NEVUS",
  "Management of hypoglycemia",
  "Management of Acute Psychosis",
  "Management of DKA",
  "Management of hypersenstivity reaction",
  "Management of patients with GDM",
  "Management of patients with Placenta Accreta Spectrum",
  "Management of patients with Placenta Previa",
  "Management of patients with PPH",
  "Management of patients with PreEclampsia",
  "Management of patients with Rh incompatibility",
  "Management of Shock in Trauma",
  "MANAGEMNT OF PATIENT WITH SHORTNESS OF BREATH",
  "Massive blood transfusion protocol in obstetrics",
  "Mastering Pediatrics Respiratory Therapy: A Hands-On Skills Workshop",
  "Material pharmaco Vigilance",
  "Maternal Cardiac Arrest and Perimortem Cesarean Delivery",
  "Meconium Aspiration Syndrome (MAS)",
  "Medical Management of Ectopic Pregnancy",
  "MEDICATION ADMINISTRATION-(ORAL/INTRAVENOUS/INTRAMUSCULAR/SUBCUTANEOUS)",
  "MEDICATION ERROR",
  "Medication Error & high risk medicine",
  "Medication error prevention in dialysis area",
  "MEDICATION ERRORS",
  "Medication Management",
  "Medication safety",
  "Medication safety and high alert medications",
  "Medicine - Dose calculation",
  "Medico-Legal Cases & All Consent",
  "Meningitis",
  "Mental Healthcare Act 2017 – Key Points for Nurses",
  "METHOTRAXATE",
  "Mindray, Drager, Hamilton ventilator Device Check & set up",
  "Miscarriage (Abortion)",
  "Mitral stenosis and Regurgitation",
  "MLC patient - Admission & Discharge procedure & Protocol",
  "Modes of mechanical ventilator",
  "MORSE FOR FALLS SCALE",
  "MSDS & DISINFECTANTS USED IN OT",
  "MULTIPLE MYELOMA",
  "Multiple Myleloma",
  "Multiple Pregnancy: All Aspects",
  "Myexedma coma",
  "NAB PACLITAXEL",
  "Nacotic policy",
  "nacrotizing soft tissue infection",
  "Narcotic & Controlled Drug Handling in OT",
  "Narcotic policy",
  "NASOGASTRIC TUBE FEEDING",
  "Nebulisation in paediatric patients: drugs and right practices",
  "Nebulization therapy and common nebulizing agents",
  "Necrotizing Entrocolitis (NEC)",
  "Needle stick injury",
  "Negative Pressure Wound Therapy (VAC Therapy)",
  "Neonatal Hyperbilirubinemia (NNH)",
  "Neonatal Hyperbilirubinemia (NNH) and blood incompatibility",
  "Neonatal Jaundice: Updated Guidelines and Management",
  "Neonatal resuscitation",
  "Neonatal Resuscitation Programme (NRP Basics)",
  "Neonatal Sepsis",
  "Neonatal sepsis & care",
  "Nephrotic Syndrome",
  "Neruological assessment (GCS, Pupil, cranial nerve assessment, muscle power & tone, reflex)",
  "Neruological assessment (GCS, Pupil, muscle power & tone, reflex, sensory examination, gait)",
  "Neurocysticercosis",
  "Neurofibroma",
  "Neurological examination",
  "Neurovascular assessment",
  "NEUTROPENIC CARE",
  "Neutropenic precautions",
  "Next gen E hospital",
  "NG TUBE",
  "Non proliferative diabetic retinopathy",
  "Non-Invasive Ventilation(NIV & HFNC)",
  "NSI Prevention and management",
  "NSI, Spill Management & Quality Indicator/Emergency code",
  "Nurses role in LIVER BIOPSY",
  "Nurses role in RENAL BIOPSY",
  "Nurses’",
  "handover",
  "Nursing and clinical management of DM",
  "Nursing care and management in deep vein thrombosis and its complications",
  "Nursing care and management in fracture and spinal injury patients",
  "Nursing care and management in patient safety",
  "of bed ridden and trauma ortho patients",
  "Nursing care and management in patient safety of bed ridden and trauma ortho patient",
  "Nursing care for the patient with spinal cord injury",
  "Nursing Care in Empyema & Lung Abscess",
  "NURSING CARE IN EXTUBATION",
  "Nursing care in pain management in trauma ortho patient",
  "Nursing care in pain management in trauma ortho patients",
  "NURSING CARE IN TB PATIENTS",
  "Nursing Care of Patient",
  "with Tracheostomy",
  "NURSING CARE OF PATIENT ON CONTINIOUS BLADDER IRRIGATION",
  "Nursing care of patient with Trachestomy",
  "Nursing care of patient with Traumatic Brain Injuries",
  "Nursing care of postnatal mother",
  "nursing care of ventilator patient",
  "Nursing ethics& professinal conduct & patient safety",
  "Nursing hand over sheet (ISBAR) Nursing Documentation CNCP",
  "Nursing Handover Sheet (ISBAR)",
  "Nursing management for patient before and after radiotherapy",
  "Nursing management of CKD",
  "Nursing management of diabetic foot and pressure injury",
  "Nursing Management of emergency codes and fire safety",
  "Nursing Management of Neonatal Cholestasis",
  "Nursing Management of Patient safety , 5S, Infection Control practice, spill Management/ NSI",
  "Nursing Management Of Patient With cellulitis",
  "Nursing management of patients with appendicitis",
  "Nursing management of patients with cholelithiasis",
  "Nursing management of patients with Advance wound care",
  "Nursing management of patients with Blood Transfusion",
  "Nursing management of Patients with cervical cancer",
  "Nursing management of patients with Exploratory Laparotomy",
  "Nursing management of patients with Frey's procedure",
  "Nursing management of patients with frey's proceduure",
  "Nursing management of patients with Gall Bladder",
  "Nursing Management of patients with Hiatal Hernia",
  "Nursing Management of patients with Hydatid cyst",
  "Nursing management of patients with Inguinal Hernia",
  "Nursing Management of Patients with Pheochromocytoma",
  "Nursing management of patients with Radical cholecystectomy",
  "Nursing management of patients with Total parentral nutrition",
  "Nursing management of patients with Whipples procedure",
  "Nursing management of patients with Wipples proceduure",
  "Nursing management of Stroke",
  "Nursing management on Cardiac Arrest",
  "Nursing responsibility in admission and discharge procedure",
  "nursing roles on patient with ICD",
  "Nusring Management of patient with cholecystitis",
  "Nusring Management of patient with pancreatitis",
  "Nutrional Assessment of Patient admitted in ICU",
  "Nutrition and Diet in post Renal-transplant",
  "Nutrition in Trauma & Post-Surgical Patients",
  "Nutritional assessement and nutritional managment in gastroenetrology . Explain Nutritional Risk Screening 2002",
  "Nutritional assessment and dietary management in paediatric patients",
  "Nutritional Support Modalities",
  "Obsessive–Compulsive Disorder",
  "ODONTOGENIC KERATOCYST OF MANDIBLE",
  "Oncologic VTE Prophylaxis:",
  "Oncological Emergencies",
  "OPD AND PRE MEDICATION AREA",
  "Oral Care",
  "order of blood draw",
  "Orientation on Ethicon advanced electrosurgical unit",
  "Orientation to Next GEN e hospital services",
  "Oro-Motor Stimulation and Oral Se in Neonates",
  "OSTEOARTHRITIS",
  "Osteoporosis in Endocrine Patients",
  "Osteoporosis Nursing mangement",
  "OT ATTIRE,STAFF CONDUCT-PRACTICE,ORIENTATION",
  "OT Documentation & Record Keeping",
  "OT Master register entry:Legal aspects",
  "OT REGISTER ENTRY(DOS AND DONTs)",
  "OT Sterility and Aseptic Techniques",
  "Overview of anti hypertensive medicine for CKD Patients",
  "Overview of insulin,types,administration,techniques,side effects and patient education",
  "Overview of kidney disease for transplant",
  "Oxygen therapy and Airway Management",
  "Pain and Sedation Management in ICU",
  "Pain Assessment in ICU",
  "Pain Assessment& management",
  "Pain Management",
  "Pain Management for Cancer Patient",
  "Pain Management in",
  "ENT and Head &",
  "Neck Surgeries - Nursing role",
  "Pain Scale and Assessment",
  "Pancreatitis",
  "PARACENTECIS",
  "Patient and Family Education & Discharge Planning in Tracheostomy Care",
  "Patient counselling & Health education",
  "Patient counselling Techniques",
  "Patient Discharge and MRD file Prepration",
  "Patient Education and Counselling",
  "Patient file management",
  "Patient Hand over- Policies & Protocols",
  "Patient Handover",
  "Patient Handover in CCU",
  "PATIENT SAFETY",
  "Patient Safety & fall prevention",
  "PATIENT SAFETY & PREVENTION OF MEDICAL ERRORS",
  "PATIENT SAFETY AND FALL PREVENTION",
  "PATIENT SAFETY AND INFECTION CONTROL PRACTICES IN UROLOGY UNIT",
  "patient safety and medication safety",
  "Patient safety-role of Nurse",
  "Patient saftey Goals",
  "Patients rights",
  "PDA DISEASE & ITS MANAGEMENT",
  "Pediatric assessment",
  "PEDIATRIC VENTILATION AND RESPIRATORY SUPPORT: A PRACTICAL APPROACH",
  "PEG TUBE",
  "Pelvic inflammatory disease and management",
  "Pemphigous Vulgaris",
  "Peripheral artery disease",
  "PERITONEAL DIALYSIS",
  "Permanent pacemaker nursing care and patient education",
  "Persistent Pulmonary Hypertension of the Newborn (PPHN)",
  "Personality Disorders",
  "Pheochromocytoma",
  "Photorefractive keratectomy",
  "Phthisical Eye (Phthisis Bulbi)",
  "Physiological changes during first trimester",
  "PICC LINE",
  "picc line dressing",
  "Pitutory Apoplexy",
  "Placental Abnormalities : All Aspects",
  "Plasma Sterilization",
  "Pneumonia",
  "PNEUMOTHORAX",
  "Polycystic Ovary Syndrome and its management",
  "POLYMER AND TITANIUM LIGA CLIP-USAGE AND BENEFITS",
  "Polytrauma Patient: Initial Assessment,",
  "Damage Control Resuscitation, and",
  "Comprehensive Nursing Management",
  "PORTAL CIRCULATION AND PORTAL HYPERTENSION",
  "Portal system, Portal Hypertention , TIPS and post procedure nursing care",
  "Positiong of Unconsciuous patient",
  "Post medication observation ansd patient safety",
  "Post op care of CABG patient.",
  "Post op care of patient with hemicraniectomy",
  "post operative emergencies and managment",
  "Post Operative Handover of the Patient",
  "Post operative management",
  "Post procedure care cardiac catheterization",
  "Post procedure care for cardiac catheterization.",
  "Post renal transplant Infections",
  "Post Transplant Complications",
  "Post traumatic stress disorder(PTSD)",
  "Post-mastectomy care and lymphedema management",
  "after nasal surgery",
  "after thyroid surgery",
  "Post-thyroidectomy",
  "Airway Emergencies",
  "Patient Education & Discharge Instructions",
  "PostOP nursing care of neuro surgical patients",
  "Postoperative Care of Cancer Patients",
  "PRE ,INTRA AND POST DIALYSIS NSG. CARE",
  "Pre & Post BMV Care",
  "PRE AND POST ENDOSCOPIC PROCEDURE PREPARATION AND CARE",
  "Pre and Post operative care after hystrectomy",
  "Pre and post operative Nursing management of patients admitted in General Surgery IPD",
  "Pre-operative dietery management in Head Neck cancer patient",
  "PREOPERATIVE NURSING MANAGEMENT IN KIDNEY TRANSPLANT SURGERY",
  "PREOPERATIVE NURSING MANAGEMENT IN TYROIDECTOMY",
  "Preparation for PPI",
  "Preparation of ANC mother for delivery",
  "Preparation of patient for prenatal- diagnostic test",
  "Preparation of PPI",
  "Presbyopia",
  "Pressure injuries",
  "Pressure injury overview",
  "Pressure injury overview and nursing managment",
  "PRESSURE INJURY STAGES & CARE",
  "pressure ulcer",
  "PRESSURE ULCER AND ITS NURSING MANGEMENT",
  "Preventing and Managing Medical Device-Related Injuries in Pediatrics Care",
  "Prevention and care of bed sore",
  "Prevention of Hospital Aquired Infection",
  "PREVENTION OF SAMPLE COLLECTION AND HANDOVER ERROR IN OT",
  "Prevention of Surgical Site Infection (SSI)",
  "prevention of ventilator associate pneumonia preventio,",
  "PRIMARY MEMBRANOUS NEPHROPATHY",
  "Procedure for various sample collection including samples for culture and sensitivity",
  "PROFESSIONAL ETIQUETTES",
  "Proliferative Diabetic Retinopathy",
  "Promoting Therapeutic Communication in Psychiatric Nursing",
  "Protein and Energy Requirements",
  "in Wound Healing",
  "Psychiatric Nursing Care for Patients with Depression",
  "Pulmonary Embolism – Early Recognition and Care",
  "Pulmonary Function Test (PFT",
  "Raised intracranial pressure: signs and nursing managemen",
  "RCIC AND NURSING MG OF RCIC",
  "Recieving of Baby in Delivery and skin-to-skin contact",
  "Record & Report",
  "Records , Reports & Documentation in Nursing",
  "Renal Wilms Tumor",
  "Retained Surgical Items Prevantion and Best Practices",
  "Retinal Detachment",
  "RFA Procedure",
  "Rheumatic Heart Disease Sign & Symptom and Nursing responsibility.",
  "Risk assessment of pressure injury",
  "ROBOTICNSURGERY INSTRUMEMTS",
  "Role if nurse in Neurorehabilitation",
  "Role of a nurse in de-addiction",
  "Role of Circulatory Nurse in OT",
  "Role of Google Sheets in Modern Nursing Practice",
  "Role of Nurse in Bilary stenting",
  "Role of Nurse in Bone biopsy",
  "Role of Nurse in Microwave Ablation",
  "Role of nurse in Neurorehabilitation",
  "Role of Nurse in PCPNDT USG",
  "Role of Nurse in PERMA CATH",
  "Role of Nurse in PTBD",
  "Role of Nurse in TJLB",
  "Role of Nurse in UAE",
  "Role of Nurse in USG guide PCN",
  "Role of Nurse inSpinal cord injury",
  "Role of Nurses in BAE",
  "Role of Nurses in CT Guided Microwave Ablation",
  "Role of Nurses in documentation",
  "Role of Nurses in Documentation in Cath -Lab",
  "Role of Nurses in Documentation in NICU - An insight to CNCP",
  "Role of Nurses in Emergency Drugs",
  "Role of Nurses in EVLA",
  "Role of Nurses in GB biology",
  "Role of Nurses in PCD",
  "Role of Nurses in RUT and Biopsy During Upper GI Endoscopy",
  "Role of Nurses in Soft Skills and communication",
  "Role of Nurses in UAE",
  "ROM exercises and comfort devices in children",
  "Routine Ward management",
  "Ryles Tube- Inserion, feeding, drain, care",
  "Safe administration",
  "and nursing",
  "care of Amphoterecin B",
  "Safe administration of chemotherapy medicine",
  "Safe adminstraytion of aleret medication in PICU",
  "Safe blood transfusion practices",
  "Safe Handling of Equipments",
  "Safe Insulin Administration",
  "Safe medication practice",
  "Safe medication practices",
  "Safe Patient Handover from OT to Recovery Room",
  "SAFE PATIENT POSITIONING DURING SURGERY",
  "Safe Use of OT tables: Prevention of Damage Due to Improper Handling",
  "Safety event reporting and CAPA",
  "SAMPLE COLLECTION",
  "Sample collection for culture & sensitivity",
  "Sample collection Techniques",
  "Sampling- Specific , Routine, culture",
  "Schizophrenia",
  "Seizure Disorder",
  "Seizure management",
  "Sensitzation on Material and Pharmacovigilence Reporting in AIIMS Rishikesh",
  "Sepsis Management",
  "SERF & CAPA form Filling",
  "SHOCK AND ITS MANAGEMNT",
  "Signs of Respiratory Distress",
  "Soft skill",
  "Soft Skill and Communication",
  "Soft skill in nursing for interacting with patients’ family members",
  "SOFT SKILLS",
  "Soft skills & Communications",
  "Soft Skills and Communication",
  "Soft skills and conflict resolution in nursing",
  "Soft skills for Nursess",
  "Specimen Handling and Labelling in OT",
  "Spill kit, LASA Drugs, Fire Safety, Codes, hand Hygiene, BMW, 5s of organization",
  "Spill kit,5s,hand hygiene,standard precaution",
  "Spill kit/ Hand Hygiene / BMW / Needle stick injury",
  "Spill management",
  "SPILL Management (SPILL KIT)",
  "Spill Management and its documentation",
  "Spill Management, NSI, Hand Hygiene/Emergency code",
  "Spill Management/NSI/BMW",
  "Spinal cord injury",
  "Spinal injuries and nursing care for spinal injury parients",
  "Spirometer",
  "Spirometry",
  "SPY GLASS/EHL",
  "SQUINT",
  "SSI DETECTION AND INFECTION CONTROL AFTER FLAP AND GRAFTING",
  "Stages of pressure injury and care",
  "Standard of Documentation: Before and After procedure.",
  "Standard Precaution",
  "Standard precaution ,5 s and Emergency Codes",
  "Standard precaution-role of nurse",
  "STANDARD PRECAUTIONS",
  "Standard precautions and IEC updates",
  "Standard precautions in hospital",
  "settings",
  "STENTS",
  "STEP BY STEP EXPLANATION OF URINE AND BLOOD CULTURE COLLECTION",
  "Sterile Suction Technique (ET & TT)",
  "Sterile suctioning techniques - ET/TT",
  "Sterilization and Disinfection",
  "STERILIZATION METHOD USED IN OT,VARIOUS DISINFECTANTS USED AND ITS RATIO",
  "Strandard Precaution",
  "Stroke & Its Management",
  "Suction- oral, ET, TT",
  "SUCTIONING (ET,TT,ORAL)",
  "Suctioning ET",
  "Suctioning of Patients with Ventilator",
  "SUCTIONING: TYPES, PROCEDURE, NURSING MANAGEMENT",
  "Suicidal risk assessment",
  "Surfactant Administration Therapy",
  "Surgical Asepsis & Infection Control in OT",
  "SURGICAL CHECKLIST",
  "SURGICAL COUNT & MISCELLANEOUS",
  "Surgical Counts in the Operation Theatre:Principles,Practice and Patient Safety",
  "Surgical Hand Scrub Procedure",
  "Surgical Hand Scrubbing Technique",
  "surgical hand scrubbing techniques",
  "Surgical Handwashing",
  "Surgical Instrument Handling & Sterilization",
  "SURGICAL INSTRUMENTS & EQUIPMENTS HANDLING",
  "SURGICAL SAFETY CHECK LIST",
  "SURGICAL SCRUBBING,GOWNING GLOVING,DE GOWNING,DE GLOVING ,SURGICAL TROLLEY PREPARATION",
  "Surgical site Infection (SSI) Prevention",
  "Surgical Sutures",
  "surgical wound",
  "Swab,Needle & instruments count in surgical procedure",
  "Synductyly",
  "T N M Classification",
  "T. Misoprost :- All aspects",
  "T.T & E.T Suctioning",
  "Tacrolimus uses,dose,side effect,and toxicity",
  "TB Treatment & Management",
  "Telecanthus and Hypertelorism",
  "Temporary pacemaker & nursing care.",
  "Terson Syndrome",
  "Thalesemia",
  "The nursing role in renal ERAS Pathways",
  "Therapeutic Hypothermia",
  "Therapeutic Hypothermia (Indications, Eligibility and Principle)",
  "Thyroid Anatomy",
  "and Physiology for Nurses & pre-operative",
  "nursing care in thyroid sx",
  "Thyroid cancer",
  "Thyroid overview - Anatomy & function",
  "thyroid surgery /post operative nursing care",
  "thyroid surgery /rehabilitation and discharge advise ,health education",
  "Time Management in Nursing",
  "TLSO brace use and function",
  "TNM Classification in cancer",
  "TOLAC (trial of labour after cesarean)",
  "Total Hip Replacement",
  "Total Knee Replacement",
  "TRACHEAL SUCTIONING (T T SUCTION)",
  "TRACHEAL SUCTIONING AND CARE",
  "Tracheo-esophageal fistula and its mgt with care",
  "Tracheostomy Care and Suctioning",
  "Tracheostomy tube Nursing Procedure Suctioning Nasal, oral",
  "Tracheostomy tube overview,maitenance and care",
  "Traction care (Clinical presentation)",
  "Transfering a patient rom baed to stretcher or wheelchair",
  "Transmission based precaution,NSI & standard precaution,Hand hygiene",
  "Traumatic Brain Injury (TBI):",
  "Nursing Care and ICP Monitoring",
  "Triage and prioritization in acute GI bleeding",
  "TT & ET suctioning",
  "Tubercular Meningitis",
  "Tuberculosis and nursing management",
  "Tuberculosos and Nursing management",
  "Tumor lysis syndrome",
  "TYPE OF ANTIBIOTICS AND ITS ADMINISTRATION",
  "TYPE OF BALLON USED IN ERCP",
  "TYPE OF SURGICAL SUTURES ALL ASPECTS",
  "TYPES OF ANAESTHESIA",
  "Types of Diet",
  "Types of thyroid surgery &post-operative management",
  "UGIE DILATATION",
  "UGIE ENTROSCOPY",
  "Ulcerative colitis",
  "Umbillical Catheterization",
  "URINARY BLADDER MASS,EARLY IDENTIFICATION ,DIAGNOSTIC APPROCH AND NURSING MANAGEMENT",
  "Urinary Catheterization/UTI Bundle care",
  "Urinary Tract Infection",
  "URINARY TRACT INFECTION ,PREVENTION,EARLY DETACTION AND NURSING MANAGEMENT",
  "Urinary tract infection including causes diagnosis,risk factor,prevention,treatment and education for patients.",
  "Use of Crash cart",
  "Use of defibrillator",
  "Use of Defibrillator & patient management",
  "Use of Hospital Bundle Care",
  "Use of syringe pump",
  "Uterine prolapse and its Management",
  "VAP bundle checklist",
  "Various Methods of Sterilization",
  "Venous thrombo embolism :Early identification and prevention strategies",
  "Ventilator",
  "Ventilator - Weaning Protocol",
  "Ventilator & NIV",
  "Ventilator circute and NIV Mask",
  "Ventilator management during dialysis",
  "VENTILATOR MANAGMENT AND PATIENT CARE",
  "VENTILATOR MODES",
  "vENTILATOR- Basic",
  "Ventilators & defebrilator calibration",
  "ventilators and defebrilator calibration",
  "vinblastine",
  "VIP scoring",
  "Vitals Monitoring of Neonates & Use of Pulse Oximeter",
  "Water purification for hemodialysis patients",
  "WHAT IS URETERIC AND URETHRAL STRICTURE AND ITS MANAGEMENT AND ROLE OF NURSING IN PATIENT CARE",
  "Withdrawn of culture specimen",
  "withdrawn of specimen for culture (Blood,Urine & TT aspirate)",
  "workshop on \"Expanding Antimicrobial Resistance Research and Surveillance Activities in Secondary-Level Hospitals",
  "Wound Care & Pressure Injury",
  "WOUND CARE AND INFETION CONTROL",
  "Wound care/Management",
  "Wound Dressing",
  "Yoga and Physiotherapy for Geriatric Patient",
  "ZYGOMATIC FRACTURE NURSING MANAGMENT"
];
