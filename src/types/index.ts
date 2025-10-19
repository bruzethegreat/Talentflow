// Job Types
export type JobStatus = "active" | "archived";

export interface Job {
  id: string;
  title: string;
  slug: string;
  status: JobStatus;
  tags: string[];
  order: number;
  description: string;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

// Candidate Types
export type CandidateStage =
  | "applied"
  | "screen"
  | "tech"
  | "offer"
  | "hired"
  | "rejected";

export interface Note {
  id: string;
  content: string;
  mentions: string[];
  authorId: string;
  authorName: string;
  createdAt: Date;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  jobId: string;
  stage: CandidateStage;
  resume: string;
  notes: Note[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineEvent {
  id: string;
  type: "stage_change" | "note_added" | "created";
  description: string;
  fromStage?: CandidateStage;
  toStage?: CandidateStage;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface CandidateTimeline {
  candidateId: string;
  events: TimelineEvent[];
}

// Assessment Types
export type QuestionType =
  | "single-choice"
  | "multi-choice"
  | "short-text"
  | "long-text"
  | "numeric"
  | "file-upload";

export interface ConditionalLogic {
  questionId: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
  value: any;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  required: boolean;
  order: number;
  options?: string[]; // for single-choice and multi-choice
  minValue?: number; // for numeric
  maxValue?: number; // for numeric
  maxLength?: number; // for text fields
  conditionalLogic?: ConditionalLogic[];
}

export interface AssessmentSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  order: number;
}

export interface Assessment {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  sections: AssessmentSection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  candidateId: string;
  answers: Record<string, any>;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

// Filter and Sort Types
export interface JobFilters {
  search?: string;
  status?: JobStatus;
  tags?: string[];
}

export interface CandidateFilters {
  search?: string;
  stage?: CandidateStage;
  jobId?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string;
  direction: SortDirection;
}
