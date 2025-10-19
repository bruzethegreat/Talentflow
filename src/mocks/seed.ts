import { faker } from "@faker-js/faker";
import type {
  Job,
  Candidate,
  Assessment,
  CandidateStage,
  JobStatus,
  Question,
  AssessmentSection,
} from "@/types";

// Seed configuration
const SEED_CONFIG = {
  JOBS_COUNT: 6,
  CANDIDATES_COUNT: 20,
  ASSESSMENTS_COUNT: 3,
  MIN_QUESTIONS_PER_ASSESSMENT: 10,
  MAX_QUESTIONS_PER_ASSESSMENT: 15,
};

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Customer Success",
  "HR",
  "Finance",
  "Operations",
];

const JOB_TITLES = [
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Product Manager",
  "UX Designer",
  "UI Designer",
  "Marketing Manager",
  "Sales Representative",
  "Customer Success Manager",
  "HR Manager",
  "Financial Analyst",
  "Operations Coordinator",
];

const TAGS = [
  "remote",
  "onsite",
  "hybrid",
  "urgent",
  "full-time",
  "part-time",
  "contract",
  "senior",
  "junior",
  "mid-level",
];

const CANDIDATE_STAGES: CandidateStage[] = [
  "applied",
  "screen",
  "tech",
  "offer",
  "hired",
  "rejected",
];

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateJobs(): Job[] {
  const jobs: Job[] = [];
  const usedSlugs = new Set<string>();

  for (let i = 0; i < SEED_CONFIG.JOBS_COUNT; i++) {
    const title = faker.helpers.arrayElement(JOB_TITLES);
    let slug = createSlug(title);

    // Ensure unique slug
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${createSlug(title)}-${counter}`;
      counter++;
    }
    usedSlugs.add(slug);

    const createdAt = faker.date.past({ years: 1 });

    const job: Job = {
      id: faker.string.uuid(),
      title: title + (counter > 1 ? ` ${counter}` : ""),
      slug,
      status: "active", // All jobs are active
      tags: faker.helpers.arrayElements(TAGS, { min: 1, max: 4 }),
      order: i,
      description: faker.lorem.paragraphs(2),
      department: faker.helpers.arrayElement(DEPARTMENTS),
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
    };

    jobs.push(job);
  }

  return jobs;
}

export function generateCandidates(jobs: Job[]): Candidate[] {
  const candidates: Candidate[] = [];

  for (let i = 0; i < SEED_CONFIG.CANDIDATES_COUNT; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const createdAt = faker.date.past({ years: 1 });

    const candidate: Candidate = {
      id: faker.string.uuid(),
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({
        firstName,
        lastName,
      }),
      phone: faker.phone.number(),
      jobId: faker.helpers.arrayElement(jobs).id,
      stage: faker.helpers.arrayElement(CANDIDATE_STAGES),
      resume: faker.internet.url(),
      notes: [],
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
    };

    // Add some random notes to some candidates
    if (faker.datatype.boolean({ probability: 0.3 })) {
      const noteCount = faker.number.int({ min: 1, max: 3 });
      for (let j = 0; j < noteCount; j++) {
        candidate.notes.push({
          id: faker.string.uuid(),
          content: faker.lorem.sentences(2),
          mentions: [],
          authorId: "hr-user",
          authorName: "HR Manager",
          createdAt: faker.date.between({
            from: createdAt,
            to: new Date(),
          }),
        });
      }
    }

    candidates.push(candidate);
  }

  return candidates;
}

export function generateQuestion(order: number): Question {
  const questionTypes = [
    "single-choice",
    "multi-choice",
    "short-text",
    "long-text",
    "numeric",
    "file-upload",
  ] as const;

  const type = faker.helpers.arrayElement(questionTypes);
  const question: Question = {
    id: faker.string.uuid(),
    type,
    text: faker.lorem.sentence() + "?",
    description: faker.datatype.boolean({ probability: 0.5 })
      ? faker.lorem.sentence()
      : undefined,
    required: faker.datatype.boolean({ probability: 0.7 }),
    order,
  };

  // Add type-specific properties
  if (type === "single-choice" || type === "multi-choice") {
    question.options = faker.helpers.multiple(
      () => faker.lorem.words(2),
      { count: { min: 3, max: 5 } }
    );
  }

  if (type === "numeric") {
    question.minValue = 0;
    question.maxValue = 100;
  }

  if (type === "short-text") {
    question.maxLength = 100;
  }

  if (type === "long-text") {
    question.maxLength = 500;
  }

  return question;
}

export function generateAssessments(jobs: Job[]): Assessment[] {
  const assessments: Assessment[] = [];

  // Select random jobs for assessments
  const selectedJobs = faker.helpers.arrayElements(
    jobs.filter((j) => j.status === "active"),
    SEED_CONFIG.ASSESSMENTS_COUNT
  );

  selectedJobs.forEach((job) => {
    const questionCount = faker.number.int({
      min: SEED_CONFIG.MIN_QUESTIONS_PER_ASSESSMENT,
      max: SEED_CONFIG.MAX_QUESTIONS_PER_ASSESSMENT,
    });

    const sectionCount = faker.number.int({ min: 2, max: 4 });
    const questionsPerSection = Math.floor(questionCount / sectionCount);

    const sections: AssessmentSection[] = [];
    let questionOrder = 0;

    for (let i = 0; i < sectionCount; i++) {
      const sectionQuestions: Question[] = [];
      const questionsInThisSection =
        i === sectionCount - 1
          ? questionCount - questionOrder // Last section gets remaining questions
          : questionsPerSection;

      for (let j = 0; j < questionsInThisSection; j++) {
        const question = generateQuestion(questionOrder);

        // Add conditional logic to some questions
        if (questionOrder > 0 && faker.datatype.boolean({ probability: 0.2 })) {
          const previousQuestion = sectionQuestions[j - 1] || sections[i - 1]?.questions.slice(-1)[0];
          if (previousQuestion && (previousQuestion.type === "single-choice" || previousQuestion.type === "multi-choice")) {
            question.conditionalLogic = [
              {
                questionId: previousQuestion.id,
                operator: "equals",
                value: previousQuestion.options?.[0] || "Yes",
              },
            ];
          }
        }

        sectionQuestions.push(question);
        questionOrder++;
      }

      sections.push({
        id: faker.string.uuid(),
        title: `Section ${i + 1}: ${faker.lorem.words(3)}`,
        description: faker.lorem.sentence(),
        questions: sectionQuestions,
        order: i,
      });
    }

    const createdAt = faker.date.past({ years: 0.5 });

    assessments.push({
      id: faker.string.uuid(),
      jobId: job.id,
      title: `${job.title} Assessment`,
      description: faker.lorem.paragraph(),
      sections,
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
    });
  });

  return assessments;
}

export function generateSeedData() {
  console.log("🌱 Generating seed data...");

  const jobs = generateJobs();
  console.log(`✅ Generated ${jobs.length} jobs`);

  const candidates = generateCandidates(jobs);
  console.log(`✅ Generated ${candidates.length} candidates`);

  const assessments = generateAssessments(jobs);
  console.log(`✅ Generated ${assessments.length} assessments`);

  return {
    jobs,
    candidates,
    assessments,
  };
}
