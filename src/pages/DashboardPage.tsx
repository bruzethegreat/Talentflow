import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchDashboardStats() {
  try {
    const [jobsRes, candidatesRes] = await Promise.all([
      fetch("/api/jobs?pageSize=100"), // Fetch all jobs
      fetch("/api/candidates?pageSize=1000"),
    ]);

    if (!jobsRes.ok) {
      console.error("Jobs API error:", await jobsRes.text());
      throw new Error("Failed to fetch jobs");
    }

    if (!candidatesRes.ok) {
      const errorText = await candidatesRes.text();
      console.error("Candidates API error:", errorText);
      throw new Error("Failed to fetch candidates: " + errorText);
    }

    const jobs = await jobsRes.json();
    const candidates = await candidatesRes.json();

    const activeJobs = jobs.data?.filter((j: any) => j.status === "active").length || 0;
    const totalCandidates = candidates.total || 0;
    const hired = candidates.data?.filter((c: any) => c.stage === "hired").length || 0;
    const inProgress = candidates.data?.filter(
      (c: any) => !["hired", "rejected"].includes(c.stage)
    ).length || 0;

    return { activeJobs, totalCandidates, hired, inProgress };
  } catch (error) {
    console.error("Dashboard stats error:", error);
    throw error;
  }
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to TalentFlow - Your hiring management platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeJobs}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalCandidates}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.hired}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.inProgress}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/jobs"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Manage Jobs</div>
              <div className="text-sm text-muted-foreground">
                Create, edit, and organize job postings
              </div>
            </a>
            <a
              href="/candidates"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">View Candidates</div>
              <div className="text-sm text-muted-foreground">
                Browse and manage candidate applications
              </div>
            </a>
            <a
              href="/candidates/board"
              className="block p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="font-medium">Kanban Board</div>
              <div className="text-sm text-muted-foreground">
                Track candidates through hiring stages
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Application details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium">Data Storage</div>
              <div className="text-sm text-muted-foreground">
                IndexedDB (Local Browser Storage)
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">API Simulation</div>
              <div className="text-sm text-muted-foreground">
                Mock Service Worker (MSW)
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Features</div>
              <div className="text-sm text-muted-foreground">
                Jobs • Candidates • Assessments • Kanban Board
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
