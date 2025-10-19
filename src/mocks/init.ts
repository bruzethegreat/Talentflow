import { db } from "@/lib/db";
import { generateSeedData } from "./seed";

export async function initializeDatabase() {
  // Check if database is already populated
  const jobCount = await db.jobs.count();

  if (jobCount === 0) {
    console.log("📦 Database is empty. Seeding data...");
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

    console.log("✅ Database seeded successfully!");
  } else {
    console.log("✅ Database already populated with", jobCount, "jobs");
  }
}
