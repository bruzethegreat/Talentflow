import Dexie, { type Table } from "dexie";
import type {
  Job,
  Candidate,
  Assessment,
  AssessmentResponse,
  TimelineEvent,
  Note,
} from "@/types";

export interface CandidateNote extends Note {
  candidateId: string;
}

export class TalentFlowDB extends Dexie {
  jobs!: Table<Job, string>;
  candidates!: Table<Candidate, string>;
  assessments!: Table<Assessment, string>;
  assessmentResponses!: Table<AssessmentResponse, string>;
  timeline!: Table<TimelineEvent, string>;
  notes!: Table<CandidateNote, string>;

  constructor() {
    super("TalentFlowDB");

    this.version(1).stores({
      jobs: "id, title, slug, status, order, createdAt, updatedAt, *tags",
      candidates:
        "id, name, email, jobId, stage, createdAt, updatedAt, phone",
      assessments: "id, jobId, title, createdAt, updatedAt",
      assessmentResponses:
        "id, assessmentId, candidateId, submittedAt, createdAt, updatedAt",
      timeline: "id, candidateId, createdAt, type",
      notes: "id, candidateId, createdAt, authorId",
    });
  }
}

export const db = new TalentFlowDB();

// Helper functions for common operations
export const dbHelpers = {
  // Jobs
  async getJobs(filters?: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
  }) {
    let query = db.jobs.toCollection();

    if (filters?.status) {
      query = db.jobs.where("status").equals(filters.status);
    }

    let results = await query.toArray();

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    if (filters?.sort) {
      const [field, direction] = filters.sort.split(":");
      results.sort((a, b) => {
        const aVal = a[field as keyof Job];
        const bVal = b[field as keyof Job];
        const modifier = direction === "desc" ? -1 : 1;
        return aVal > bVal ? modifier : aVal < bVal ? -modifier : 0;
      });
    } else {
      // Default sort by order
      results.sort((a, b) => a.order - b.order);
    }

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedResults = results.slice(start, start + pageSize);

    return {
      data: paginatedResults,
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize),
    };
  },

  async createJob(job: Omit<Job, "id" | "createdAt" | "updatedAt">) {
    const now = new Date();
    const id = crypto.randomUUID();
    const newJob: Job = {
      ...job,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.jobs.add(newJob);
    return newJob;
  },

  async updateJob(id: string, updates: Partial<Job>) {
    await db.jobs.update(id, { ...updates, updatedAt: new Date() });
    return db.jobs.get(id);
  },

  async reorderJobs(fromOrder: number, toOrder: number) {
    const jobs = await db.jobs.toArray();
    jobs.sort((a, b) => a.order - b.order);

    const [movedJob] = jobs.splice(fromOrder, 1);
    jobs.splice(toOrder, 0, movedJob);

    // Update order for all affected jobs
    const updates = jobs.map((job, index) => ({
      key: job.id,
      changes: { order: index },
    }));

    await db.jobs.bulkUpdate(updates);
  },

  // Candidates
  async getCandidates(filters?: {
    search?: string;
    stage?: string;
    jobId?: string;
    page?: number;
    pageSize?: number;
  }) {
    let query = db.candidates.toCollection();

    if (filters?.stage) {
      query = db.candidates.where("stage").equals(filters.stage);
    }

    if (filters?.jobId) {
      query = db.candidates.where("jobId").equals(filters.jobId);
    }

    let results = await query.toArray();

    // Apply search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (candidate) =>
          candidate.name.toLowerCase().includes(searchLower) ||
          candidate.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort by most recent
    results.sort(
      (a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      }
    );

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const start = (page - 1) * pageSize;
    const paginatedResults = results.slice(start, start + pageSize);

    return {
      data: paginatedResults,
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize),
    };
  },

  async createCandidate(
    candidate: Omit<Candidate, "id" | "createdAt" | "updatedAt">
  ) {
    const now = new Date();
    const id = crypto.randomUUID();
    const newCandidate: Candidate = {
      ...candidate,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await db.candidates.add(newCandidate);

    // Add timeline event
    await this.addTimelineEvent({
      candidateId: id,
      type: "created",
      description: "Candidate profile created",
    });

    return newCandidate;
  },

  async updateCandidateStage(id: string, newStage: string) {
    const candidate = await db.candidates.get(id);
    if (!candidate) throw new Error("Candidate not found");

    const oldStage = candidate.stage;
    await db.candidates.update(id, {
      stage: newStage as any,
      updatedAt: new Date(),
    });

    // Add timeline event
    await this.addTimelineEvent({
      candidateId: id,
      type: "stage_change",
      description: `Moved from ${oldStage} to ${newStage}`,
      fromStage: oldStage,
      toStage: newStage as any,
    });

    return db.candidates.get(id);
  },

  async addCandidateNote(candidateId: string, note: any) {
    const candidate = await db.candidates.get(candidateId);
    if (!candidate) throw new Error("Candidate not found");

    const notes = [...candidate.notes, note];
    await db.candidates.update(candidateId, { notes, updatedAt: new Date() });

    // Add timeline event
    await this.addTimelineEvent({
      candidateId,
      type: "note_added",
      description: "Note added",
    });

    return db.candidates.get(candidateId);
  },

  // Timeline
  async addTimelineEvent(
    event: Omit<TimelineEvent, "id" | "createdAt"> & { candidateId: string }
  ) {
    const id = crypto.randomUUID();
    const timelineEvent: TimelineEvent = {
      ...event,
      id,
      createdAt: new Date(),
    };
    await db.timeline.add(timelineEvent);
    return timelineEvent;
  },

  async getCandidateTimeline(candidateId: string) {
    const events = await db.timeline
      .where("candidateId")
      .equals(candidateId)
      .reverse()
      .sortBy("createdAt");
    return events;
  },

  // Assessments
  async getAssessment(jobId: string) {
    return db.assessments.where("jobId").equals(jobId).first();
  },

  async saveAssessment(assessment: Assessment) {
    const existing = await db.assessments.get(assessment.id);
    if (existing) {
      await db.assessments.update(assessment.id, {
        ...assessment,
        updatedAt: new Date(),
      });
    } else {
      await db.assessments.add(assessment);
    }
    return db.assessments.get(assessment.id);
  },

  async submitAssessmentResponse(response: Omit<AssessmentResponse, "id">) {
    const id = crypto.randomUUID();
    const newResponse: AssessmentResponse = {
      ...response,
      id,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.assessmentResponses.add(newResponse);
    return newResponse;
  },

  async getAssessmentResponse(assessmentId: string, candidateId: string) {
    return db.assessmentResponses
      .where("[assessmentId+candidateId]")
      .equals([assessmentId, candidateId])
      .first();
  },
};
