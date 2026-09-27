import { Area, CNERecord, GalleryItem, ChairpersonMessageData, NewsEventItem, QuickLinkItem, CoordinatorDeskInfo, ProgramImpactStats } from '../types';

export const INITIAL_AREAS: Area[] = [
  "216(OT-Complex)-(DSA & IR)",
  "231A(NICU)-(Inborn)",
  "232(OT-Complex)-(Obstetrics)",
  "233A(IPD)-(Obstetrics)",
  "233B(CCU)-(Labour Room)",
  "234A(CCU)-(Paediatric Warmer)",
  "234B(IPD)-(Paediatric Surgery)",
  "235A(CCU)-(PICU)",
  "236(IPD)-(Paediatric Medicine)",
  "241A(IPD)-(Nephrology)",
  "241D(OT-Complex)-(Dialysis)",
  "243A(IPD)-(Psychiatry)",
  "243B(IPD)-(Ophthal)",
  "244(IPD)-(Gynaecology)",
  "245(IPD)-(Med-Onco & Hemat)",
  "246A(IPD)-(Radiotheraphy)",
  "246B(IPD)-(Surgical Oncology)",
  "252(HDU)-(Paediatric Cardiology)",
  "253(OT-Complex)-(Cathlab)",
  "254A(IPD)-(Cardiology)",
  "255A(HDU)-(CTVS)",
  "256A(IPD)-(Pulmonary)",
  "256B(CCU)-(Pulmonary)",
  "261A(OT-Complex)-(Anaesthesia)",
  "261B(OT-Complex)",
  "264A(CCU)-(Neuro Surgery)",
  "264C(OT-Complex)",
  "266(CCU)",
  "312A(ED)-(HDU & CCU)",
  "312B(ED)-(Paediatric Emergency)",
  "313(ED)-(Yellow & Red Area)",
  "341A(IPD)-(General Medicine)",
  "342(CCU)-(Medicine)",
  "343A(IPD)-(General Medicine)",
  "345A(IPD)-(Endocrinology)",
  "346(OT-Complex)-(ERCP & Endoscopy)",
  "351(IPD)-(Orthopaedics)",
  "352A(IPD)-(General Allocation Pool)",
  "353A(IPD)-(General Surgery)",
  "353B(CCU)-(General Surgery)",
  "354(IPD)-(General Surgery)",
  "355B(IPD)-(ENT)",
  "356A(IPD)-(Surgical Gastro)",
  "361(HDU)-(Private Ward)",
  "362A(IPD)-(Plastic Surgery)",
  "362B(IPD)-(OMFS)",
  "363A(IPD)-(Urology)",
  "364A(IPD)-(Geriatric Medicine)",
  "365A(IPD)-(Neurology)",
  "365B(CCU)-(Neurology)",
  "366A(IPD)-(Medical Gastro)",
  "366B(CCU)-(Medical Gastro)",
  "411(OPD)-(Trauma_Telemedicine)",
  "413(OT-Complex)-(Trauma)",
  "414(ED)-(Trauma Emergency)",
  "421A(IPD)-(Neuro Surgery)",
  "422(CCU)-(Neuro Surgery)",
  "423(IPD)-(Trauma Surgery)",
  "424B(IPD)-(General Allocation Pool)",
  "426B(CCU)-(Burn)",
  "426C(HDU)-(Sleep Lab)",
  "431(CCU)-(Trauma)",
  "433(OT-Complex)",
  "434(CCU)-(KTU)",
  "48(Day Care)",
  "511A(IPD)-(CAP)",
  "Airport MI Room",
  "Blood-Bank(OPD)",
  "ICN&Quality Nursing(OPD)",
  "Long Leave Pool Roster",
  "Nursing Pool Roster-I",
  "OPD-Areas(OPD)",
  "PHC Raiwala",
  "DSA & IR",
  "CNE Open Forum",
  "All Department",
  "Outside AIIMS"
].map((name, idx) => ({
  id: `AREA-${idx + 1}`,
  name,
  status: 'ACTIVE',
  createdAt: '2026-01-01'
}));

export const INITIAL_CNE_RECORDS: CNERecord[] = [];

export const INITIAL_UPCOMING_CLASSES: CNERecord[] = [];

export const INITIAL_GALLERY: GalleryItem[] = [];

export const INITIAL_CHAIRPERSON_MESSAGE: ChairpersonMessageData = {
  name: "Dr. Anita Rani Kansal",
  designation: "Chief Nursing Officer (C.N.O) & Chairperson-CNE Cell",
  institution: "All India Institute of Medical Sciences (AIIMS), Rishikesh",
  photoUrl: "https://lh3.googleusercontent.com/d/1JubdIDqy_apCuS9mlU8BB68k1hiC-gXE",
  title: "Fostering Clinical Rigour, Compassion & Lifelong Learning in Nursing",
  message: [
    "Welcome to the Continuing Nursing Education (CNE) Portal of AIIMS Rishikesh. Continuing education is not merely a professional obligation; it is the cornerstone of patient safety, clinical excellence, and progressive nursing practice.",
    "In a tertiary healthcare and apex academic institution like AIIMS Rishikesh, our nursing fraternity stands on the frontlines of complex medical care, specialized surgical interventions, and intensive critical monitoring. Continuous upskilling ensures that every intervention delivered to our patients meets national and international benchmarks of evidence-based nursing care.",
    "This centralized CNE portal serves as an institutional hub to democratize learning, maintain transparent training portfolios, and recognize the scholarly contributions of both our resource persons and enthusiastic learners. I encourage every nursing officer to take full ownership of their professional development and participate actively in our Clinical Nursing Education education calendar."
  ],
  keyHighlights: [
    "Institutional commitment to 100% evidence-based clinical protocols",
    "Comprehensive simulation-assisted emergency & critical care modules",
    "Standardized digital documentation for annual training records and professional portfolios",
    "Equal growth and continuous skill enhancement for all nursing cadres"
  ]
};

export const INITIAL_NEWS_EVENTS: NewsEventItem[] = [];

export const INITIAL_QUICK_LINKS: QuickLinkItem[] = [
  {
    id: "ql-cne-schedule",
    title: "Upcoming CNE Schedule",
    description: "Browse open classes, curriculum topics, venue allocations, and secure your registration.",
    iconName: "Sparkles",
    target: "cne-schedule",
    badge: "Open for Enrollment",
    actionType: "navigate"
  },
  {
    id: "ql-calendar",
    title: "CNE Interactive Calendar",
    description: "View monthly training schedules, departmental rotations, and upcoming skill sessions.",
    iconName: "Calendar",
    target: "calendar",
    badge: "Monthly View",
    actionType: "navigate"
  },
  {
    id: "ql-guidelines",
    title: "CNE Guidelines & Policy",
    description: "Institutional policy document outlining attendance requirements, credits, and speaker recognition.",
    iconName: "FileCheck",
    target: "guidelines",
    badge: "Official Norms",
    actionType: "modal",
    modalContent: {
      title: "AIIMS Rishikesh CNE Guidelines & Attendance Norms",
      body: [
        "1. Minimum Attendance: All Nursing Officers (N.O) and Senior Nursing Officers (S.N.O) should aim to complete at least 20 documented CNE hours per academic year.",
        "2. Punctuality & Verification: Attendance is digitally signed and logged through the Area Incharge and verified against institutional roster data.",
        "3. Faculty / Resource Person Recognition: Serving as an approved resource person or instructor carries double CNE credits and is recognized as institutional academic leadership.",
        "4. Certificate of Completion: Certificates and annual summary records can be downloaded directly from the portal once logged in with verified credentials.",
        "5. Leave & Excusal: Prior written notification to the CNE Coordinator is required if unable to attend a class for which registration was confirmed."
      ]
    }
  },
  {
    id: "ql-cell-info",
    title: "Nursing Education Cell",
    description: "Overview of CNE Committee mandate, organizational hierarchy, and departmental coordinators.",
    iconName: "GraduationCap",
    target: "cell-info",
    badge: "Committee Info",
    actionType: "modal",
    modalContent: {
      title: "About the Nursing Education Cell",
      body: [
        "The Nursing Education Cell at AIIMS Rishikesh is constituted under the Nursing Services to foster academic vitality, clinical competence, and professional innovation.",
        "Leadership: Chaired by the Chief Nursing Officer (C.N.O) in coordination with Deputy Nursing Superintendents (D.N.S) and Assistant Nursing Superintendents (A.N.S).",
        "Coordinators: Ms. Ramya T and Ms. Suman Choudhary.",
        "Key Mandates: Curriculum design for clinical specialties, simulation-based resuscitation workshops, orientation programmes for newly recruited officers, and institutional continuous learning audits.",
        "Contact: Nursing Education Cell, AIIMS Rishikesh."
      ]
    }
  },
  {
    id: "ql-cne-portfolio-guide",
    title: "CNE Portfolio Guide",
    description: "Step-by-step instructions on generating certified CNE portfolios for verification by CNE Coordinator & Chairperson.",
    iconName: "Award",
    target: "cne-portfolio-guide",
    badge: "Portfolio Guide",
    actionType: "modal",
    modalContent: {
      title: "CNE Portfolio Certification Guide",
      body: [
        "Step 1: Sign in to the CNE Portal using your institutional Employee ID.",
        "Step 2: Review your cumulative CNE hours and completed sessions under 'My CNE Records'.",
        "Step 3: Click the 'Generate PDF' button to download the institutional CNE Training Record PDF report matching the selected filters.",
        "Step 4: Get your generated record verified and signed by the CNE Coordinator and Chairperson, CNE Committee / CNO.",
        "Step 5: Retain the verified record in your personal professional portfolio."
      ]
    }
  },
  {
    id: "ql-contact",
    title: "Contact CNE Coordinator Desk",
    description: "Get in touch with CNE coordinators, raise roster queries, or propose a specialized training session.",
    iconName: "Users",
    target: "contact",
    badge: "Help & Support",
    actionType: "modal",
    modalContent: {
      title: "CNE Coordinator Desk Contact Information",
      body: [
        "Office: Nursing Services, All India Institute of Medical Sciences, Rishikesh - 249203, Uttarakhand, India.",
        "CNE Coordinators: Ms. Ramya T | Ms. Suman Choudhary",
        "Email: training.nur@aiimsrishikesh.edu.in",
        "Working Hours: Monday to Friday: 09:00 AM – 05:00 PM | Saturday: 09:00 AM – 01:00 PM"
      ]
    }
  }
];

export const INITIAL_COORDINATOR_DESK: CoordinatorDeskInfo = {
  note: 'Have questions regarding class credits, attendance verification, or training schedules?',
  coordinators: ['Ms. Ramya T', 'Ms. Suman Choudhary'],
  email: 'training.nur@aiimsrishikesh.edu.in'
};

export const INITIAL_PROGRAM_IMPACT: ProgramImpactStats = {
  totalCompletedClasses: 0,
  cneDuration: '0 Hrs',
  uniqueStaffTrained: 0,
  scope: 'institutional'
};
