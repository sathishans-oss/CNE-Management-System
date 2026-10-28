import { Area, CNERecord, GalleryItem, ChairpersonMessageData, NewsEventItem, QuickLinkItem, CoordinatorDeskInfo, ProgramImpactStats } from '../types';

// Ward/area options are authoritative in the existing Google Sheets "Area" tab.
// Do not ship a prepopulated ward list or silently fall back to stale ward names.
export const INITIAL_AREAS: Area[] = [];

export const INITIAL_CNE_RECORDS: CNERecord[] = [];

export const INITIAL_UPCOMING_CLASSES: CNERecord[] = [];

export const INITIAL_GALLERY: GalleryItem[] = [];

export const INITIAL_CHAIRPERSON_MESSAGE: ChairpersonMessageData = {
  name: "Dr. Anita Rani Kansal",
  designation: "Chief Nursing Officer (C.N.O) & Chairperson-CNE Cell",
  institution: "All India Institute of Medical Sciences (AIIMS), Rishikesh",
  photoUrl: "",
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
    title: "Contact CNE Desk",
    description: "Get in touch with CNE coordinators, raise roster queries, or propose a specialized training session.",
    iconName: "Users",
    target: "contact",
    badge: "Help & Support",
    actionType: "modal",
    modalContent: {
      title: "CNE Desk Contact Information",
      body: [
        "Office: Nursing Services, All India Institute of Medical Sciences, Rishikesh - 249203, Uttarakhand, India.",
        "CNE Coordinators: Mr. Jino Jacob | Mr. Arun Ravi",
        "For the latest committee member list, see the CNE Desk on the homepage.",
        "Email: training.nur@aiimsrishikesh.edu.in",
        "Working Hours: Monday to Friday: 09:00 AM – 05:00 PM | Saturday: 09:00 AM – 01:00 PM"
      ]
    }
  }
];

export const INITIAL_COORDINATOR_DESK: CoordinatorDeskInfo = {
  coordinators: ['Mr. Jino Jacob', 'Mr. Arun Ravi'],
  coordinatorPeople: [{"name": "Mr. Jino Jacob", "designation": "Deputy Nursing Superintendent"}, {"name": "Mr. Arun Ravi", "designation": "Deputy Nursing Superintendent"}],
  members: [{"name": "Ms. Vandana", "designation": "Deputy Nursing Superintendent"}, {"name": "Mr. Hemanthkumar K", "designation": "Assistant Nursing Superintendent"}, {"name": "Mr. Chandu Raj B", "designation": "Assistant Nursing Superintendent"}, {"name": "Mr. Girraj Saini", "designation": "Assistant Nursing Superintendent"}, {"name": "Ms. Priyanka Patiyal", "designation": "Senior Nursing Officer"}, {"name": "Mr. Alwin T. Varghese", "designation": "Senior Nursing Officer"}, {"name": "Mr. Robi Kuldeep", "designation": "Senior Nursing Officer"}, {"name": "Mr. Pankaj Punjot", "designation": "Nursing Officer"}, {"name": "Ms. Deepika Kandpal", "designation": "Nursing Officer"}, {"name": "Ms. Anjani Dobhal", "designation": "Nursing Officer"}, {"name": "Ms. Suman Choudhary", "designation": "Nursing Officer"}, {"name": "Ms. Ramya T", "designation": "Nursing Officer"}],
  email: 'training.nur@aiimsrishikesh.edu.in'
};

export const INITIAL_PROGRAM_IMPACT: ProgramImpactStats = {
  totalCompletedClasses: 0,
  cneDuration: '0 Hrs',
  uniqueStaffTrained: 0,
  scope: 'institutional'
};
