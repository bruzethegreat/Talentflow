import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, ExternalLink, Archive, ArchiveRestore, Briefcase, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Job } from "@/types";
import { CreateJobDialog } from "./CreateJobDialog";

interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function fetchJobs(params: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}): Promise<JobsResponse> {
  const url = new URL("/api/jobs", window.location.origin);
  url.searchParams.set("page", params.page.toString());
  url.searchParams.set("pageSize", params.pageSize.toString());
  if (params.search) url.searchParams.set("search", params.search);
  if (params.status && params.status !== "all") url.searchParams.set("status", params.status);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

async function updateJobStatus(id: string, status: "active" | "archived") {
  const res = await fetch(`/api/jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update job");
  return res.json();
}

async function deleteJob(id: string) {
  const res = await fetch(`/api/jobs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete job");
  return res.json();
}

async function reorderJobs(fromOrder: number, toOrder: number, jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromOrder, toOrder }),
  });
  if (!res.ok) throw new Error("Failed to reorder jobs");
  return res.json();
}

function SortableJobRow({ job, onArchive, onDelete }: { job: Job; onArchive: (id: string, status: "active" | "archived") => void; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "relative z-50" : ""}>
      <TableCell className="w-12">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <Link to={`/jobs/${job.id}`} className="hover:underline flex items-center gap-2">
          {job.title}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant={job.status === "active" ? "default" : "secondary"}>
          {job.status}
        </Badge>
      </TableCell>
      <TableCell>{job.department}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {job.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {job.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{job.tags.length - 3}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(job.id, job.status === "active" ? "archived" : "active")}
          >
            {job.status === "active" ? (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </>
            ) : (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restore
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(job.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function JobsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", { page, pageSize, search, status }],
    queryFn: () => fetchJobs({ page, pageSize, search, status }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "archived" }) =>
      updateJobStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job status updated");
    },
    onError: () => {
      toast.error("Failed to update job status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete job");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ fromOrder, toOrder, jobId }: { fromOrder: number; toOrder: number; jobId: string }) =>
      reorderJobs(fromOrder, toOrder, jobId),
    onError: () => {
      toast.error("Failed to reorder jobs");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && data?.data) {
      const oldIndex = data.data.findIndex((job) => job.id === active.id);
      const newIndex = data.data.findIndex((job) => job.id === over.id);

      // Optimistic update
      const newData = arrayMove(data.data, oldIndex, newIndex);
      queryClient.setQueryData(["jobs", { page, pageSize, search, status }], {
        ...data,
        data: newData,
      });

      // Perform actual reorder
      reorderMutation.mutate({
        fromOrder: oldIndex,
        toOrder: newIndex,
        jobId: active.id as string,
      });
    }
  };

  const handleArchive = (id: string, newStatus: "active" | "archived") => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Manage job postings and organize your hiring pipeline
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              {search || status ? "Try adjusting your filters" : "Get started by creating your first job"}
            </p>
            {!search && !status && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={data?.data.map((job) => job.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    {data?.data.map((job) => (
                      <SortableJobRow
                        key={job.id}
                        job={job}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.total)} of {data.total} jobs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateJobDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
