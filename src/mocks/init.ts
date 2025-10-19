import { db } from "@/lib/db";
import { generateSeedData } from "./seed";

const SEED_VERSION = "1.2"; // Increment this to force re-seeding

export async function initializeDatabase() {
  // Check seed version
  const storedVersion = localStorage.getItem("talentflow_seed_version");
  const jobCount = await db.jobs.count();

  if (jobCount === 0 || storedVersion !== SEED_VERSION) {
    if (storedVersion !== SEED_VERSION) {
      console.log("📦 Seed version changed. Clearing and re-seeding data...");
      // Clear all tables
      await db.jobs.clear();
      await db.candidates.clear();
      await db.assessments.clear();
      await db.timeline.clear();
      await db.notes.clear();
      await db.assessmentResponses.clear();
    } else {
      console.log("📦 Database is empty. Seeding data...");
    }

    const { jobs, candidates, assessments } = generateSeedData();

    // Bulk add to database
    await db.jobs.bulkAdd(jobs);
    await db.candidates.bulkAdd(candidates);
    await db.assessments.bulkAdd(assessments);

    // Create timeline events for all candidates
    const timelineEvents = candidates.map((candidate) => ({
      id: crypto.randomUUID(),
      candidateId: candidate.id,
      type: "created" as const,
      description: "Candidate profile created",
      createdAt: candidate.createdAt,
    }));

    await db.timeline.bulkAdd(timelineEvents);

    // Store seed version
    localStorage.setItem("talentflow_seed_version", SEED_VERSION);

    console.log("✅ Database seeded successfully with version", SEED_VERSION);
  } else {
    console.log("✅ Database already populated with", jobCount, "jobs");
  }
}
