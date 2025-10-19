import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Candidate, CandidateStage } from "@/types";

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  author: string;
}

interface TimelineEvent {
  id: string;
  type: "stage_change" | "note";
  timestamp: Date;
  description: string;
  fromStage?: CandidateStage;
  toStage?: CandidateStage;
  note?: string;
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
  applied: "bg-blue-500",
  screen: "bg-yellow-500",
  tech: "bg-purple-500",
  offer: "bg-green-500",
  hired: "bg-emerald-500",
  rejected: "bg-red-500",
};

async function fetchCandidate(id: string): Promise<Candidate> {
  const res = await fetch(`/api/candidates/${id}`);
  if (!res.ok) throw new Error("Failed to fetch candidate");
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

async function fetchNotes(candidateId: string): Promise<Note[]> {
  const res = await fetch(`/api/candidates/${candidateId}/notes`);
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

async function addNote(candidateId: string, content: string) {
  const res = await fetch(`/api/candidates/${candidateId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to add note");
  return res.json();
}

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState("");

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => fetchCandidate(id!),
    enabled: !!id,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["candidate-notes", id],
    queryFn: () => fetchNotes(id!),
    enabled: !!id,
  });

  const updateStageMutation = useMutation({
    mutationFn: (stage: CandidateStage) => updateCandidateStage(id!, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", id] });
      queryClient.invalidateQueries({ queryKey: ["candidates-all"] });
      toast.success("Candidate stage updated");
    },
    onError: () => {
      toast.error("Failed to update candidate stage");
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => addNote(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-notes", id] });
      setNoteContent("");
      toast.success("Note added");
    },
    onError: () => {
      toast.error("Failed to add note");
    },
  });

  const handleAddNote = () => {
    if (noteContent.trim()) {
      addNoteMutation.mutate(noteContent);
    }
  };

  // Generate timeline from stage history and notes
  const timeline: TimelineEvent[] = [];

  if (candidate) {
    // Add initial application
    timeline.push({
      id: "initial",
      type: "stage_change",
      timestamp: new Date(candidate.createdAt),
      description: "Applied to position",
      toStage: "applied",
    });

    // Add notes to timeline
    notes.forEach((note) => {
      timeline.push({
        id: note.id,
        type: "note",
        timestamp: new Date(note.createdAt),
        description: note.content,
      });
    });

    // Sort by timestamp
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Candidate not found</h2>
        <Button onClick={() => navigate("/candidates")}>Back to Candidates</Button>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
            <p className="text-muted-foreground mt-1">{candidate.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Candidate Info */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Candidate contact details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{candidate.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Applied {new Date(candidate.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <hr className="border-t" />

              <div className="space-y-2">
                <label className="text-sm font-medium">Current Stage</label>
                <Select
                  value={candidate.stage}
                  onValueChange={(value) => updateStageMutation.mutate(value as CandidateStage)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="screen">Screening</SelectItem>
                    <SelectItem value="tech">Technical</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {candidate.skills && candidate.skills.length > 0 && (
                <>
                  <hr className="border-t" />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill: string) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {candidate.experience && (
                <>
                  <hr className="border-t" />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Experience</label>
                    <p className="text-sm">{candidate.experience} years</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes
              </CardTitle>
              <CardDescription>Add notes and comments about this candidate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note... (use @name to mention someone)"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddNote}
                    disabled={!noteContent.trim() || addNoteMutation.isPending}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>

              {notes.length > 0 && (
                <>
                  <hr className="border-t" />
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div key={note.id} className="border-l-2 border-primary pl-4 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{note.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Timeline */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
              <CardDescription>Candidate journey and activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={event.id} className="relative">
                    {index !== timeline.length - 1 && (
                      <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className="flex gap-3">
                      <div
                        className={`mt-1 h-4 w-4 rounded-full flex-shrink-0 ${
                          event.type === "stage_change"
                            ? event.toStage
                              ? STAGE_COLORS[event.toStage]
                              : "bg-gray-400"
                            : "bg-blue-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {event.type === "stage_change" ? (
                            <>
                              Moved to{" "}
                              <Badge variant="outline" className="ml-1">
                                {event.toStage ? STAGE_LABELS[event.toStage] : "Unknown"}
                              </Badge>
                            </>
                          ) : (
                            "Note added"
                          )}
                        </p>
                        {event.type === "note" && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
