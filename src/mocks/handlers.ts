import { http, HttpResponse, delay } from "msw";
import { dbHelpers, db } from "@/lib/db";
import type { Job } from "@/types";

// Simulate network latency (200-1200ms)
const simulateDelay = async () => {
  const latency = Math.random() * (1200 - 200) + 200;
  await delay(latency);
};

// Simulate 5-10% error rate on write operations
const shouldSimulateError = () => {
  return Math.random() < 0.075; // 7.5% error rate
};

export const handlers = [
  // ==================== JOBS ====================

  // GET /jobs - List jobs with pagination and filtering
  http.get("/api/jobs", async ({ request }) => {
    await simulateDelay();

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const sort = url.searchParams.get("sort") || undefined;

    try {
      const result = await dbHelpers.getJobs({
        search,
        status,
        page,
        pageSize,
        sort,
      });

      return HttpResponse.json(result);
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to fetch jobs" },
        { status: 500 }
      );
    }
  }),

  // GET /jobs/:id - Get single job
  http.get("/api/jobs/:id", async ({ params }) => {
    await simulateDelay();

    const { id } = params;
    const job = await db.jobs.get(id as string);

    if (!job) {
      return HttpResponse.json({ message: "Job not found" }, { status: 404 });
    }

    return HttpResponse.json(job);
  }),

  // POST /jobs - Create job
  http.post("/api/jobs", async ({ request }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to create job" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as Omit<
      Job,
      "id" | "createdAt" | "updatedAt"
    >;

    // Check for unique slug
    const existingJob = await db.jobs.where("slug").equals(body.slug).first();
    if (existingJob) {
      return HttpResponse.json(
        { message: "Slug must be unique", field: "slug" },
        { status: 400 }
      );
    }

    try {
      const newJob = await dbHelpers.createJob(body);
      return HttpResponse.json(newJob, { status: 201 });
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to create job" },
        { status: 500 }
      );
    }
  }),

  // PATCH /jobs/:id - Update job
  http.patch("/api/jobs/:id", async ({ params, request }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to update job" },
        { status: 500 }
      );
    }

    const { id } = params;
    const updates = (await request.json()) as Partial<Job>;

    // Check for unique slug if slug is being updated
    if (updates.slug) {
      const existingJob = await db.jobs
        .where("slug")
        .equals(updates.slug)
        .and((job) => job.id !== id)
        .first();

      if (existingJob) {
        return HttpResponse.json(
          { message: "Slug must be unique", field: "slug" },
          { status: 400 }
        );
      }
    }

    try {
      const updatedJob = await dbHelpers.updateJob(id as string, updates);
      return HttpResponse.json(updatedJob);
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to update job" },
        { status: 500 }
      );
    }
  }),

  // PATCH /jobs/:id/reorder - Reorder jobs (with occasional 500 error)
  http.patch("/api/jobs/:id/reorder", async ({ request }) => {
    await simulateDelay();

    // Higher error rate for testing rollback (10%)
    if (Math.random() < 0.1) {
      return HttpResponse.json(
        { message: "Failed to reorder jobs" },
        { status: 500 }
      );
    }

    const { fromOrder, toOrder } = (await request.json()) as {
      fromOrder: number;
      toOrder: number;
    };

    try {
      await dbHelpers.reorderJobs(fromOrder, toOrder);
      return HttpResponse.json({ success: true });
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to reorder jobs" },
        { status: 500 }
      );
    }
  }),

  // DELETE /jobs/:id - Delete job
  http.delete("/api/jobs/:id", async ({ params }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to delete job" },
        { status: 500 }
      );
    }

    const { id } = params;

    try {
      await db.jobs.delete(id as string);
      return HttpResponse.json({ success: true });
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to delete job" },
        { status: 500 }
      );
    }
  }),

  // ==================== CANDIDATES ====================

  // GET /candidates - List candidates with pagination and filtering
  http.get("/api/candidates", async ({ request }) => {
    await simulateDelay();

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || undefined;
    const stage = url.searchParams.get("stage") || undefined;
    const jobId = url.searchParams.get("jobId") || undefined;
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

    try {
      const result = await dbHelpers.getCandidates({
        search,
        stage,
        jobId,
        page,
        pageSize,
      });

      return HttpResponse.json(result);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      return HttpResponse.json(
        { message: "Failed to fetch candidates", error: String(error) },
        { status: 500 }
      );
    }
  }),

  // GET /candidates/:id - Get single candidate
  http.get("/api/candidates/:id", async ({ params }) => {
    await simulateDelay();

    const { id } = params;
    const candidate = await db.candidates.get(id as string);

    if (!candidate) {
      return HttpResponse.json(
        { message: "Candidate not found" },
        { status: 404 }
      );
    }

    return HttpResponse.json(candidate);
  }),

  // POST /candidates - Create candidate
  http.post("/api/candidates", async ({ request }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to create candidate" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as any;

    try {
      const newCandidate = await dbHelpers.createCandidate(body);
      return HttpResponse.json(newCandidate, { status: 201 });
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to create candidate" },
        { status: 500 }
      );
    }
  }),

  // PATCH /candidates/:id - Update candidate (including stage changes)
  http.patch("/api/candidates/:id", async ({ params, request }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to update candidate" },
        { status: 500 }
      );
    }

    const { id } = params;
    const updates = (await request.json()) as any;

    try {
      let updatedCandidate;

      if (updates.stage) {
        updatedCandidate = await dbHelpers.updateCandidateStage(
          id as string,
          updates.stage
        );
      } else {
        await db.candidates.update(id as string, {
          ...updates,
          updatedAt: new Date(),
        });
        updatedCandidate = await db.candidates.get(id as string);
      }

      return HttpResponse.json(updatedCandidate);
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to update candidate" },
        { status: 500 }
      );
    }
  }),

  // GET /candidates/:id/timeline - Get candidate timeline
  http.get("/api/candidates/:id/timeline", async ({ params }) => {
    await simulateDelay();

    const { id } = params;

    try {
      const events = await dbHelpers.getCandidateTimeline(id as string);
      return HttpResponse.json({ events });
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to fetch timeline" },
        { status: 500 }
      );
    }
  }),

  // GET /candidates/:id/notes - Get candidate notes
  http.get("/api/candidates/:id/notes", async ({ params }) => {
    await simulateDelay();

    const { id } = params;

    try {
      const notes = await db.notes
        .where("candidateId")
        .equals(id as string)
        .reverse()
        .sortBy("createdAt");

      // Transform to match frontend Note interface
      const transformedNotes = notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt,
        author: note.authorName,
      }));

      return HttpResponse.json(transformedNotes);
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to fetch notes" },
        { status: 500 }
      );
    }
  }),

  // POST /candidates/:id/notes - Add note to candidate
  http.post("/api/candidates/:id/notes", async ({ params, request }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to add note" },
        { status: 500 }
      );
    }

    const { id } = params;
    const { content } = (await request.json()) as { content: string };

    try {
      // Extract @mentions from content
      const mentions = content.match(/@\w+/g) || [];

      const newNote = {
        id: crypto.randomUUID(),
        candidateId: id as string,
        content,
        mentions: mentions.map((m) => m.slice(1)),
        authorId: "demo-user",
        authorName: "Demo User",
        createdAt: new Date(),
      };

      await db.notes.add(newNote);

      return HttpResponse.json({
        id: newNote.id,
        content: newNote.content,
        createdAt: newNote.createdAt,
        author: newNote.authorName,
      }, { status: 201 });
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to add note" },
        { status: 500 }
      );
    }
  }),

  // ==================== ASSESSMENTS ====================

  // GET /assessments/:jobId - Get assessment for job
  http.get("/api/assessments/:jobId", async ({ params }) => {
    await simulateDelay();

    const { jobId } = params;

    try {
      const assessment = await dbHelpers.getAssessment(jobId as string);
      return HttpResponse.json(assessment || null);
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to fetch assessment" },
        { status: 500 }
      );
    }
  }),

  // PUT /assessments/:jobId - Create or update assessment
  http.put("/api/assessments/:jobId", async ({ request }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to save assessment" },
        { status: 500 }
      );
    }

    const assessment = (await request.json()) as any;

    try {
      const savedAssessment = await dbHelpers.saveAssessment(assessment);
      return HttpResponse.json(savedAssessment);
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to save assessment" },
        { status: 500 }
      );
    }
  }),

  // POST /assessments/:jobId/submit - Submit assessment response
  http.post("/api/assessments/:jobId/submit", async ({ request }) => {
    await simulateDelay();

    if (shouldSimulateError()) {
      return HttpResponse.json(
        { message: "Failed to submit assessment" },
        { status: 500 }
      );
    }

    const response = (await request.json()) as any;

    try {
      const savedResponse = await dbHelpers.submitAssessmentResponse(response);
      return HttpResponse.json(savedResponse, { status: 201 });
    } catch (error) {
      return HttpResponse.json(
        { message: "Failed to submit assessment" },
        { status: 500 }
      );
    }
  }),
];
