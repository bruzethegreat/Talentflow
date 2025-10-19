import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { Candidate, CandidateStage } from "@/types";

interface CandidatesResponse {
  data: Candidate[];
  total: number;
}

const STAGES: { id: CandidateStage; label: string; color: string }[] = [
  { id: "applied", label: "Applied", color: "bg-blue-500" },
  { id: "screen", label: "Screening", color: "bg-yellow-500" },
  { id: "tech", label: "Technical", color: "bg-purple-500" },
  { id: "offer", label: "Offer", color: "bg-green-500" },
  { id: "hired", label: "Hired", color: "bg-emerald-500" },
  { id: "rejected", label: "Rejected", color: "bg-red-500" },
];

async function fetchCandidates(): Promise<CandidatesResponse> {
  const res = await fetch("/api/candidates?pageSize=10000");
  if (!res.ok) throw new Error("Failed to fetch candidates");
  return res.json();
}

async function updateCandidateStage(id: string, stage: CandidateStage) {
  const res = await fetch(`/api/candidates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error("Failed to update candidate stage");
  return res.json();
}

function DraggableCandidate({ candidate }: { candidate: Candidate }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidate },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Link to={`/candidates/${candidate.id}`}>
        <Card className="mb-2 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm truncate flex items-center gap-1">
                  {candidate.name}
                  <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {candidate.email}
                </p>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {new Date(candidate.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function DroppableColumn({
  stage,
  candidates,
}: {
  stage: { id: CandidateStage; label: string; color: string };
  candidates: Candidate[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="flex flex-col min-h-0">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h3 className="font-semibold">{stage.label}</h3>
        </div>
        <Badge variant="secondary">{candidates.length}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto pr-4 min-h-[500px] rounded-lg p-2 transition-colors ${
          isOver ? "bg-accent/50 ring-2 ring-primary" : ""
        }`}
      >
        {candidates.map((candidate) => (
          <DraggableCandidate key={candidate.id} candidate={candidate} />
        ))}
        {candidates.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Drop candidates here
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoardPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["candidates-all"],
    queryFn: fetchCandidates,
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: CandidateStage }) =>
      updateCandidateStage(id, stage),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["candidates-all"] });

      const previousCandidates = queryClient.getQueryData<CandidatesResponse>([
        "candidates-all",
      ]);

      if (previousCandidates) {
        queryClient.setQueryData<CandidatesResponse>(["candidates-all"], {
          ...previousCandidates,
          data: previousCandidates.data.map((c) =>
            c.id === id ? { ...c, stage } : c
          ),
        });
      }

      return { previousCandidates };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousCandidates) {
        queryClient.setQueryData(["candidates-all"], context.previousCandidates);
      }
      toast.error("Failed to update candidate stage");
    },
    onSuccess: () => {
      toast.success("Candidate stage updated");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates-all"] });
    },
  });

  const candidatesByStage = useMemo(() => {
    const grouped: Record<CandidateStage, Candidate[]> = {
      applied: [],
      screen: [],
      tech: [],
      offer: [],
      hired: [],
      rejected: [],
    };

    data?.data.forEach((candidate) => {
      grouped[candidate.stage].push(candidate);
    });

    return grouped;
  }, [data?.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const candidateId = active.id as string;
    const newStage = over.id as CandidateStage;

    const candidate = data?.data.find((c) => c.id === candidateId);
    if (!candidate) return;

    if (candidate.stage !== newStage) {
      updateStageMutation.mutate({ id: candidateId, stage: newStage });
    }
  };

  const activeCandidate = data?.data.find((c) => c.id === activeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/candidates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
            <p className="text-muted-foreground mt-1">
              Drag candidates between stages to update their status
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-6 gap-4">
            {STAGES.map((stage) => (
              <DroppableColumn
                key={stage.id}
                stage={stage}
                candidates={candidatesByStage[stage.id]}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCandidate ? (
              <Card className="opacity-90 cursor-grabbing rotate-3 shadow-lg">
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm">{activeCandidate.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {activeCandidate.email}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
