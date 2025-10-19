import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, ExternalLink, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Candidate } from "@/types";

interface CandidatesResponse {
  data: Candidate[];
  total: number;
}

const STAGE_LABELS = {
  applied: "Applied",
  screen: "Screening",
  tech: "Technical",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const STAGE_COLORS = {
  applied: "default",
  screen: "secondary",
  tech: "outline",
  offer: "default",
  hired: "default",
  rejected: "destructive",
} as const;

async function fetchCandidates(): Promise<CandidatesResponse> {
  const res = await fetch("/api/candidates?pageSize=10000");
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

export function CandidatesPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("");
  const parentRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["candidates-all"],
    queryFn: fetchCandidates,
  });

  // Client-side filtering
  const filteredCandidates = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply stage filter
    if (stageFilter && stageFilter !== "all") {
      filtered = filtered.filter((c) => c.stage === stageFilter);
    }

    return filtered;
  }, [data?.data, search, stageFilter]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: filteredCandidates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Approximate row height
    overscan: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground mt-2">
            Browse and manage candidate applications
          </p>
        </div>
        <Link to="/candidates/board">
          <Button variant="outline">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Kanban Board
          </Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="screen">Screening</SelectItem>
            <SelectItem value="tech">Technical</SelectItem>
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
            <p className="text-muted-foreground">
              {search || stageFilter
                ? "Try adjusting your filters"
                : "No candidates in the system yet"}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="text-sm text-muted-foreground mb-2">
            Showing {filteredCandidates.length} of {data?.total || 0} candidates
          </div>

          <div
            ref={parentRef}
            className="h-[calc(100vh-300px)] overflow-auto border rounded-lg"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const candidate = filteredCandidates[virtualRow.index];
                return (
                  <Link
                    key={candidate.id}
                    to={`/candidates/${candidate.id}`}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="h-full px-4 py-3 hover:bg-accent transition-colors border-b flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">
                            {candidate.name}
                          </h3>
                          <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {candidate.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <Badge
                          variant={
                            STAGE_COLORS[candidate.stage] as any
                          }
                        >
                          {STAGE_LABELS[candidate.stage]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(candidate.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
