/** General-purpose clinical topic terms (candidate vocabulary, not a diagnoses authority). */
export const COMMON_CLINICAL_TERMS: string[] = `
Gastritis;Acute gastritis;Chronic gastritis;Gastric mucosal inflammation;Peptic ulcer disease;Gastroesophageal reflux disease;Gastrointestinal bleeding;Upper gastrointestinal bleeding;Lower gastrointestinal bleeding;Achalasia;Appendicitis;Cholecystitis;Cholelithiasis;Pancreatitis;Acute pancreatitis;Chronic pancreatitis;Hepatitis;Cirrhosis;Portal hypertension;Ascites;Hepatic encephalopathy;Inflammatory bowel disease;Ulcerative colitis;Crohn disease;Irritable bowel syndrome;Celiac disease;Intestinal obstruction;Constipation;Diarrhea;Colorectal cancer;Stoma care;Gastrostomy care;Nasogastric tube feeding;Enteral feeding;Parenteral nutrition;Aspiration prevention;Dysphagia;Pediatric nutrition;
Pneumonia;Bronchiolitis;Bronchial asthma;Chronic obstructive pulmonary disease;Pulmonary edema;Pleural effusion;Pneumothorax;Hemothorax;Pulmonary embolism;Pulmonary hypertension;Acute respiratory distress syndrome;Respiratory failure;Oxygen therapy;Non-invasive ventilation;Invasive mechanical ventilation;Tracheostomy care;Ventilator weaning;Airway suctioning;Endotracheal suctioning;Chest physiotherapy;High-flow nasal cannula;Inhaler technique;Nebulization;Obstructive sleep apnea;
Myocardial infarction;Acute coronary syndrome;Stable angina;Heart failure;Cardiac arrhythmia;Atrial fibrillation;Ventricular tachycardia;Cardiac arrest;Cardiopulmonary resuscitation;Basic life support;Advanced cardiovascular life support;Cardiogenic shock;Hypertension;Hypertensive emergency;Coronary angiography;Cardiac catheterization;Pacemaker care;Coronary artery bypass grafting;Rheumatic heart disease;Valvular heart disease;Infective endocarditis;Deep vein thrombosis;Peripheral vascular disease;Hemodynamic monitoring;Central venous pressure monitoring;Invasive blood pressure monitoring;Defibrillation;Cardioversion;
Stroke;Ischemic stroke;Hemorrhagic stroke;Transient ischemic attack;Seizure;Status epilepticus;Traumatic brain injury;Spinal cord injury;Intracranial pressure monitoring;Glasgow coma scale;Glasgow coma score;Guillain–Barré syndrome;Group B Streptococcus;Myasthenia gravis;Meningitis;Encephalitis;Hydrocephalus;Cerebral palsy;Dementia;Delirium;Parkinson disease;Neurological assessment;Pupil assessment;Cranial nerve examination;Neurorehabilitation;
Diabetes mellitus;Type 1 diabetes;Type 2 diabetes;Diabetic ketoacidosis;Hyperosmolar hyperglycemic state;Hypoglycemia;Insulin administration;Diabetic foot care;Diabetic neuropathy;Thyroid disorder;Hypothyroidism;Hyperthyroidism;Thyroidectomy care;Thyroid storm;Adrenal insufficiency;Cushing syndrome;Pheochromocytoma;Electrolyte imbalance;Hyponatremia;Hypernatremia;Hyperkalemia;Hypokalemia;Fluid management;Acid-base balance;Arterial blood gas analysis;Venous blood gas analysis;
Acute kidney injury;Chronic kidney disease;End-stage kidney disease;Hemodialysis;Peritoneal dialysis;Dialysis catheter care;Arteriovenous fistula care;Kidney transplantation;Renal biopsy;Nephrotic syndrome;Glomerulonephritis;Urinary tract infection;Catheter-associated urinary tract infection;Urinary catheterization;Foley catheterization;Urinary retention;Benign prostatic hyperplasia;Continuous bladder irrigation;Nephrectomy care;Urinary incontinence;
Sepsis;Septic shock;Shock management;Blood transfusion;Blood transfusion reactions;Blood product administration;Medication administration;Medication safety;Medication errors;High-alert medications;Look-alike sound-alike medications;Adverse drug reactions;Anaphylaxis;Extravasation;Chemotherapy;Antimicrobial stewardship;Antibiotic resistance;Infection prevention and control;Hand hygiene;Biomedical waste management;Needlestick injury;Surgical site infection;Central line-associated bloodstream infection;Ventilator-associated pneumonia;Pressure injury prevention;Pressure injury staging;Wound care;Wound dressing;Negative pressure wound therapy;Fall prevention;Patient safety;Informed consent;Medical documentation;Nursing handover;ISBAR communication;Emergency codes;Crash cart management;Triage;
Antenatal care;Postnatal care;Preeclampsia;Eclampsia;Postpartum hemorrhage;Placenta previa;Placenta accreta spectrum;Ectopic pregnancy;Gestational diabetes mellitus;Induction of labor;Cesarean section care;Breastfeeding counseling;Neonatal resuscitation;Neonatal sepsis;Neonatal jaundice;Prematurity;Low birth weight;Kangaroo mother care;Meconium aspiration syndrome;Neonatal hypoxic ischemic encephalopathy;Neonatal intensive care;Pediatric assessment;Pediatric airway management;Pediatric resuscitation;
Anemia;Pancytopenia;Acute leukemia;Lymphoma;Multiple myeloma;Neutropenia;Febrile neutropenia;Bone marrow transplantation;Stem cell transplantation;Oncological emergencies;Cancer pain management;Palliative care;End-of-life care;Radiotherapy care;Chemotherapy administration;Tumor lysis syndrome;
Depression;Suicide risk assessment;Anxiety disorder;Bipolar disorder;Schizophrenia;Obsessive-compulsive disorder;Post-traumatic stress disorder;Substance use disorder;De-addiction;Therapeutic communication;Electroconvulsive therapy;Delirium prevention;Mental health nursing;
Surgical safety checklist;Surgical counts;Surgical asepsis;Sterilization and disinfection;Operating theatre infection control;Postoperative care;Preoperative assessment;Postoperative pain management;Spinal anesthesia;General anesthesia;Postoperative nausea and vomiting;Regional anesthesia;Wound infection;Fracture management;Traction care;Total hip replacement;Total knee replacement;Rehabilitation nursing;Pressure injury risk assessment;Patient positioning;Surgical hand scrub;Personal protective equipment
`.split(';').map(x=>x.trim()).filter(Boolean);

/** De-identified, educator-editable examples from additional CNE titles; not standardized diagnoses. */
export const ADDITIONAL_CNE_TOPIC_SUGGESTIONS: string[] = [
  'Care of gastritis patients',
  'Nursing management of neonatal hyperbilirubinemia and Rh incompatibility (Skills: Care of neonates on phototherapy)',
  'Nursing management of Tetralogy of Fallot (Skills: Management during Tet spell)',
  'Nursing management of glaucoma (Skills: Instillation of eye drops)',
  'Nursing management of urinary bladder mass (Skills: Postoperative care after TURBT)',
  'Nursing management of chronic kidney disease',
  'Nursing management of pneumonia (Skills: Care of patients during prone ventilation)',
  'Nursing management of chest injury (Skills: Primary survey ABCDE approach)',
  'Nursing management of anemia (Skills: Transfusion safety)',
  'Nursing management of cyanotic heart disease (Skills: Prevention of hypoxic crisis)',
  'Nursing management of nonunion fractures (Skills: Pin site care)',
  'Nursing management of abnormal uterine bleeding (Skills: Early recognition of bleeding)',
  'Nursing management of cholecystitis and cholelithiasis (Skills: Surgical safety and perioperative care)',
  'Nursing management of pneumothorax (Skills: Incentive spirometry)',
  'Nursing management of intracerebral hemorrhage (Skills: GCS and neurological monitoring)',
  'Nursing management of ulcerative colitis (Skills: Stoma care)',
  'Nursing management of breast cancer (Skills: Breast self-examination and postoperative exercises)',
  'Nursing management of tracheoesophageal fistula (Skills: Aspiration prevention)',
  'Nursing management of diabetes mellitus (Skills: Glycemic control)',
  'Nursing management of hypertension (Skills: Lifestyle modification and DASH diet)',
  'Nursing management of congenital cleft lip and palate (Skills: Safe feeding and suture line care)',
  'Nursing management of neonatal cholestasis (Skills: Feeding and nutritional management)',
  'Nursing management of traumatic brain injury (Skills: Intracranial pressure monitoring)',
  'Nursing management of acute and chronic liver failure (Skills: Fluid and electrolyte balance)',
  'Nursing management of abdominal trauma (Skills: Primary and secondary survey)',
  'Nursing management of stroke',
  'Workshop on ICD-11 in tertiary care hospitals',
  'Soft skills',
  'From conflict to collaboration',
  'Nursing induction training programme',
  'Transfusion safety capacity building programme',
  'Workshop on advanced wound care',
  'NextGen e-Hospital training session',
  'Yoga for healthy ageing and cardiometabolic health',
  'Yoga for nurses',
  'Basic medical skills workshop',
  'Internship orientation: ABG sampling and wound care',
  'Workshop on research methodology: From proposal to publication',
  'CNE open forum: Patient safety',
  'Workshop on library resources',
  'Mass casualty management training of trainers',
  'CNE open forum: Crash cart management',
  'CNE open forum: Insulin administration',
  'Sponge bath (hot and cold)',
  'Surgical wound care: Irrigation, debridement and dressing',
  'Whole blood transfusion',
  'Basic life support',
  'Advanced cardiovascular life support',
  'Wound care and stoma management',
  'Pain management and palliative care',
  'Pediatric basic life support',
  'Nebulisation',
  'Procedure series: Transfer patient from bed to stretcher',
  'Procedure series: Surgical wound dressing',
  'CNE open forum: IV fluid administration',
  'IV cannulation',
  'Care of tracheostomy patients',
  'Incentive spirometry demonstration',
  'Cardiopulmonary resuscitation',
  'Crash cart',
  'Arterial blood gas sampling'
];
