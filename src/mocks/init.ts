import { db } from "@/lib/db";
import { generateSeedData } from "./seed";

const SEED_VERSION = "v2.0"; // Increment this to force re-seeding

// Lock to prevent double initialization in React StrictMode
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

export async function initializeDatabase() {
  // If already initializing, wait for it to complete
  if (isInitializing && initializationPromise) {
    console.log("⏳ Initialization already in progress, waiting...");
    await initializationPromise;
    return;
  }

  // Check seed version
  const storedVersion = localStorage.getItem("talentflow_seed_version");

  // Force clear and reseed if version doesn't match
  if (storedVersion !== SEED_VERSION) {
    isInitializing = true;
    initializationPromise = (async () => {
    console.log(`📦 Seed version mismatch (stored: ${storedVersion}, current: ${SEED_VERSION}). Deleting entire database...`);

    // NUCLEAR OPTION: Delete the entire database and recreate it
    try {
      await db.delete();
      console.log("✅ Database completely deleted");

      // Wait a bit for deletion to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Recreate the database by reopening it
      await db.open();
      console.log("✅ Database recreated");
    } catch (error) {
      console.error("Error during database deletion:", error);
    }

    console.log("📦 Generating fresh seed data...");
    const { jobs, candidates, assessments } = generateSeedData();

    console.log(`📊 Seeding ${jobs.length} jobs, ${candidates.length} candidates, ${assessments.length} assessments`);

    // Bulk add to database
    try {
      await db.jobs.bulkAdd(jobs);
      console.log(`✅ Added ${jobs.length} jobs`);

      await db.candidates.bulkAdd(candidates);
      console.log(`✅ Added ${candidates.length} candidates`);

      await db.assessments.bulkAdd(assessments);
      console.log(`✅ Added ${assessments.length} assessments`);
    } catch (error) {
      console.error("Error adding seed data:", error);
      throw error;
    }

    // Create timeline events for all candidates
    const timelineEvents = candidates.map((candidate) => ({
      id: crypto.randomUUID(),
      candidateId: candidate.id,
      type: "created" as const,
      description: "Candidate profile created",
      createdAt: candidate.createdAt,
    }));

    await db.timeline.bulkAdd(timelineEvents);
    console.log(`✅ Added ${timelineEvents.length} timeline events`);

    // Store seed version
    localStorage.setItem("talentflow_seed_version", SEED_VERSION);

    const finalJobCount = await db.jobs.count();
    const finalCandidateCount = await db.candidates.count();
    console.log(`✅ Database seeded successfully with version ${SEED_VERSION}`);
    console.log(`✅ Final counts: ${finalJobCount} jobs, ${finalCandidateCount} candidates`);
    })();

    try {
      await initializationPromise;
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  } else {
    const jobCount = await db.jobs.count();
    const candidateCount = await db.candidates.count();
    console.log(`✅ Database already at version ${SEED_VERSION}: ${jobCount} jobs, ${candidateCount} candidates`);
  }
}
