import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { worker } from "./mocks/browser";
import { initializeDatabase } from "./mocks/init";
import { Layout } from "./components/layout/Layout";
import { JobsPage } from "./pages/jobs/JobsPage";
import { JobDetailPage } from "./pages/jobs/JobDetailPage";
import { CandidatesPage } from "./pages/candidates/CandidatesPage";
import { CandidateDetailPage } from "./pages/candidates/CandidateDetailPage";
import { KanbanBoardPage } from "./pages/candidates/KanbanBoardPage";
import { AssessmentBuilderPage } from "./pages/assessments/AssessmentBuilderPage";
import { AssessmentFormPage } from "./pages/assessments/AssessmentFormPage";
import { DashboardPage } from "./pages/DashboardPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Start MSW
      await worker.start({
        onUnhandledRequest: "bypass",
      });

      // Initialize database with seed data
      await initializeDatabase();

      setIsReady(true);
    }

    init();
  }, []);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading TalentFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />

            {/* Jobs Routes */}
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />

            {/* Candidates Routes */}
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="candidates/board" element={<KanbanBoardPage />} />
            <Route path="candidates/:id" element={<CandidateDetailPage />} />

            {/* Assessment Routes */}
            <Route path="assessments/:jobId" element={<AssessmentBuilderPage />} />
            <Route path="assessments/:jobId/form" element={<AssessmentFormPage />} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App
