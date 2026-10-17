export type UserRole = 'ADMIN' | 'AREA_INCHARGE' | 'INCHARGE' | 'RESOURCE_PERSON' | 'EMPLOYEE';

export type CNEStatus =
  | 'Scheduled'
  | 'Completed'
  | 'Canceled'
  | 'Cancelled'
  | 'Finalized'
  | 'Finalised'
  | 'Draft'
  | 'Pending';

export type ViewMode =
  | 'home'
  | 'dashboard'
  | 'my-cne-records'
  | 'calendar'
  | 'cne-schedule'
  | 'learning-resources'
  | 'gallery'
  | 'admin-areas'
  | 'admin-roles'
  | 'admin-content'
  | 'admin-reports'
  | 'admin-teaching-modes'
  | 'admin-departmental-cne-outcome';

export interface NewsEventItem {
  id: string;
  title: string;
  date: string;
  category: 'Workshop' | 'Circular' | 'Conference' | 'Training' | 'Update' | 'Notice';
  summary: string;
  content?: string;
  venue?: string;
  speaker?: string;
  isImportant?: boolean;
  blinkAttention?: boolean;
}

export interface ChairpersonMessageData {
  name: string;
  designation: string;
  institution: string;
  photoUrl: string;
  title: string;
  message: string[];
  keyHighlights: string[];
  driveFileId?: string;
  driveUrl?: string;
}

export interface QuickLinkItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  target: string;
  badge?: string;
  actionType: 'navigate' | 'modal' | 'external';
  modalContent?: {
    title: string;
    body: string[];
  };
}

export interface Employee {
  srNo?: number;
  employeeId: string;
  name: string;
  designation: string;
  contactNo?: string;
  employmentType?: string;
  typeOfEmployment?: string;
  email?: string;
  dob?: string;
  doj?: string;
}

export interface Area {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface TeachingMode {
  id?: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt?: string;
}

export interface RoleMapping {
  srNo?: number;
  employeeId: string;
  name: string;
  designation: string;
  role: UserRole;
  area?: string;
  assignedAreas?: string[];
  updatedAt?: string;
}

export type CNEType =
  | 'CENTRAL'
  | 'DEPARTMENTAL'
  | 'EXTERNAL_OFFSITE'
  | 'EXTERNAL_ONSITE';

/**
 * Authoritative Unified CNE Record
 * Represents a CNE program/session stored directly in the single authoritative 'CNE Schedule' sheet.
 */
export interface CNERecord {
  cneId: string;
  classId?: string; // Backward-compatibility alias for cneId
  dataId?: string; // Backward-compatibility alias for cneId
  topic: string;
  area: string;
  fromDate: string;
  date?: string; // Date alias for fromDate
  toDate?: string;
  duration: string; // Duration in HH:MM:SS format
  resourcePersonEmpId: string;
  resourcePersonEmpIds?: string[];
  resourcePersonName?: string;
  externalResourcePersons?: string[]; // Outside resource persons without employee ID
  modeOfTeaching: string;
  description?: string;
  maxParticipants?: number;
  status: CNEStatus;
  cneType?: CNEType;
  proposedByEmpId?: string;
  proposedByName?: string;
  adminRemarks?: string;
  remarks?: string;
  staffEmpId?: string; // Comma-separated internal employee IDs
  staffEmpIds?: string[]; // List of internal employee IDs
  staffNames?: string[]; // Populated when authorized
  externalStaffParticipants?: string[]; // Outside staff participants without employee ID
  staffCount?: number;
  coverageAreasSnapshot?: string;
  totalAllottedStaff?: number | null;
  internalAttendanceCount?: number | null;
  attendancePercentage?: number | null;
  postTestOutcomePercentage?: number | null;
  coverageFinalizedAt?: string;
  finalizedQuestionsCount?: number;
  isLocked?: boolean;
  isUnscheduled?: boolean;
  qrToken?: string;
  myPostTestScore?: number | null;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DepartmentalCneOutcomeRow {
  area: string;
  cneId?: string;
  topic?: string;
  status?: string;
  remarks?: string;
  createdByName?: string;
  totalAllottedStaff?: number | null;
  internalAttendanceCount?: number | null;
  attendancePercentage?: number | null;
  postTestOutcomePercentage?: number | null;
  date?: string;
}

export interface CNEActivityProgress {
  cneId: string;
  materialStatus: 'Added' | 'Not Added';
  questionsStatus: 'Generated' | 'Not Generated';
  finalizedQuestionsCount?: number;
  requiredQuestionsCount?: number;
  qrStatus: 'Generated' | 'Not Generated';
  participantsCount: number;
  postTestStatus: 'Available' | 'Not Available' | 'Completed';
  finalizationStatus: 'Finalized' | 'Not Finalized';
}

export interface DepartmentalScheduleRow {
  id: string;
  topic: string;
  area: string;
  date: string; // From Date & Time
  toDate?: string; // To Date & Time
  duration: string; // Duration in HH:MM:SS format
  resourcePersonEmpId: string;
  resourcePersonEmpIds?: string[];
  resourcePersonName?: string;
  externalResourcePersons?: string[];
  modeOfTeaching: string;
  description?: string;
  maxParticipants?: number;
  adminRemarks?: string;
}

export interface CNEQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  authoritativeSource?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'REPLACED';
  isFinalized?: boolean;
  isLocked?: boolean;
}

export interface CNEReferenceMaterial {
  cneId: string;
  topic: string;
  referenceText: string;
  unifiedContent?: string;
  updatedBy?: string;
  updatedAt?: string;
  linkUrl?: string;
  syllabus?: string;
  driveFileId?: string;
  fileName?: string;
  fileType?: string;
  resourcePersonName?: string;
  fileSize?: number;
  hasFile?: boolean;
}

export interface CNELearningResourceMetadata {
  cneId: string;
  topic: string;
  driveFileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  resourcePersonName?: string;
  area?: string;
  cneType?: CNEType;
  uploadedAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  hasFile?: boolean;
  indexingStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  indexingErrorCode?: string;
  indexingMessage?: string;
  chunksCount?: number;
  indexedAt?: string;
}


export interface CNENursingReferenceResource {
  resourceId: string;
  sourceType: 'LOCAL_REFERENCE_LIB';
  resourceTitle: string;
  driveFileId: string;
  authorOrganization: string;
  license: string;
  version: string;
  fileType: string;
  active: boolean;
  indexedAt: string;
  updatedAt: string;
}

export interface CNENursingReferenceDriveFile {
  driveFileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  lastUpdated: string;
  isIndexed: boolean;
  resourceId: string | null;
  resourceTitle: string;
}


export interface CNENursingReferenceIndexStatus {
  driveFileId: string;
  resourceId: string | null;
  resourceTitle: string;
  indexStatus: 'PENDING' | 'INDEXED' | 'FAILED';
  chunksCount: number;
  errorCode: string | null;
  message: string;
  indexedAt: string;
  updatedAt: string;
}

export interface CNEAiQuotaInfo {
  cneId: string;
  topic?: string;
  attemptsUsed: number;
  maxQuota: number;
  remaining: number;
  canGenerate: boolean;
  status?: 'AVAILABLE' | 'USED' | 'GENERATED';
  lastAttemptAt?: string;
  lastGeneratedBy?: string;
}

export interface CNEParticipant {
  id: string;
  cneId: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  participantType: 'POST_TEST' | 'MANUAL';
  score: number | null;
  totalQuestions: number | null;
  percentage: number | null;
  status: string;
  submittedAt: string;
  remarks?: string;
}

export interface CNEParticipantsSummary {
  cneId: string;
  topic: string;
  area: string;
  status: string;
  totalParticipants: number;
  postTestCount: number;
  manualCount: number;
  averageScore: number | null;
  participants: CNEParticipant[];
}

export interface PostTestSubmissionResult {
  participantId: string;
  cneId: string;
  participantType?: 'INTERNAL' | 'EXTERNAL';
  participantName?: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  status: string;
  submittedAt: string;
  review: {
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  imageUrl: string;
  driveFileId?: string;
  uploadedBy?: string;
  uploadedAt: string;
  isActive: boolean;
}

export interface SessionUser {
  employeeId: string;
  name: string;
  designation: string;
  email?: string;
  role: UserRole;
  assignedArea?: string;
  assignedAreas?: string[];
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
}

export interface SheetAuditItem {
  tab: string;
  status: string;
  rowCount?: number;
  error?: string;
}

export interface ProgramImpactStats {
  totalCompletedClasses: number;
  cneDuration: string;
  uniqueStaffTrained: number;
  scope: 'institutional' | 'user';
}

export interface DeskPerson {
  name: string;
  designation: string;
}

export interface CoordinatorDeskInfo {
  // Legacy fields retained for backward compatibility with existing portal data.
  note?: string;
  coordinators: string[];
  coordinatorPeople: DeskPerson[];
  members: DeskPerson[];
  email: string;
}

export interface HomeDashboardData {
  upcomingClasses: CNERecord[];
  newsEvents: NewsEventItem[];
  quickLinks: QuickLinkItem[];
  coordinatorDesk: CoordinatorDeskInfo;
  impactStats: ProgramImpactStats;
  chairpersonPhotoUrl?: string;
}

export type CneInterestStatus = 'INTERESTED' | 'WITHDRAWN';

export interface CneInterestRegistration {
  cneId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  status: CneInterestStatus;
  interestedAt: string;
  updatedAt: string;
}

export interface CneInterestStatusResponse {
  status: CneInterestStatus | null;
  isInterested: boolean;
  registeredAt?: string;
  updatedAt?: string;
}

export interface CneInterestedParticipantsResponse {
  cneId: string;
  topic: string;
  date: string;
  area?: string;
  totalInterested: number;
  participants: CneInterestRegistration[];
}




/** Admin-only aggregated reports; individual employee rows are opt-in and fetched on demand. */
export interface CNEAnalytics {
  period: {fromDate:string;toDate:string;search:string};
  kpis: {total:number;completed:number;scheduled:number;canceled:number;overdueScheduled?:number;deliveredHours:number;participantHours:number;resourceHours:number;attendanceVisits:number;uniqueParticipants:number;postTestCount:number;averagePostTestPercent:number|null;weightedPostTestPercent?:number|null;activeAreas:number};
  status: Array<{name:string;value:number}>;
  months: Array<{month:string;Scheduled:number;Completed:number;Canceled:number;postTestCount:number}>;
  areas: Array<{name:string;completed:number;attendance:number;staffAllotted:number|null;postTestCount:number;avgPostTestPercent:number|null}>;
  topics: Array<{name:string;completed:number;attendance:number;capacity:number;postTestCount:number;avgPostTestPercent:number|null}>;
  modes: Array<{name:string;completed:number;attendance:number;postTestCount:number;avgPostTestPercent:number|null}>;
  postTestTopics: Array<{name:string;postTestCount:number;avgPostTestPercent:number|null}>;
  participantHours: Array<{employeeId:string;name:string;department:string;participantHours:number;cnesAttended:number;postTestCount:number;averageScore:number|null}>;
  resourceHours: Array<{employeeId:string;name:string;resourceHours:number;sessions:number}>;
  employeeTotal: number;
  employeeRows: CNEAnalytics['participantHours'];
}
