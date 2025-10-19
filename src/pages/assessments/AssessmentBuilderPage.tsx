import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Save,
  Eye,
  GripVertical,
  Trash2,
  Edit2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type {
  Assessment,
  AssessmentSection,
  Question,
  QuestionType,
  ConditionalLogic,
} from "@/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "single-choice", label: "Single Choice" },
  { value: "multi-choice", label: "Multiple Choice" },
  { value: "short-text", label: "Short Text" },
  { value: "long-text", label: "Long Text (Paragraph)" },
  { value: "numeric", label: "Numeric" },
  { value: "file-upload", label: "File Upload" },
];

async function fetchAssessment(jobId: string) {
  const res = await fetch(`/api/assessments/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch assessment");
  return res.json();
}

async function saveAssessment(jobId: string, assessment: Partial<Assessment>) {
  const res = await fetch(`/api/assessments/${jobId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assessment),
  });
  if (!res.ok) throw new Error("Failed to save assessment");
  return res.json();
}

function SortableSection({
  section,
  onEdit,
  onDelete,
  onAddQuestion,
  onEditQuestion,
  onDeleteQuestion,
  onReorderQuestions,
}: {
  section: AssessmentSection;
  onEdit: () => void;
  onDelete: () => void;
  onAddQuestion: () => void;
  onEditQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestions: (oldIndex: number, newIndex: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = section.questions.findIndex((q) => q.id === active.id);
      const newIndex = section.questions.findIndex((q) => q.id === over.id);
      onReorderQuestions(oldIndex, newIndex);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                {section.description && (
                  <CardDescription className="mt-1">
                    {section.description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={section.questions.map((q) => q.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {section.questions.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    onEdit={() => onEditQuestion(question.id)}
                    onDelete={() => onDeleteQuestion(question.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onAddQuestion}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionItem({
  question,
  onEdit,
  onDelete,
}: {
  question: Question;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeLabel = QUESTION_TYPES.find((t) => t.value === question.type)?.label;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 border rounded-md bg-card"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{question.text}</p>
          {question.required && (
            <Badge variant="secondary" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {typeLabel}
          </Badge>
          {question.conditionalLogic && question.conditionalLogic.length > 0 && (
            <Badge variant="outline" className="text-xs">
              Conditional
            </Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function QuestionEditor({
  question,
  allQuestions,
  onSave,
  onCancel,
}: {
  question?: Question;
  allQuestions: Question[];
  onSave: (question: Omit<Question, "id">) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<Omit<Question, "id">>(() => {
    if (question) return { ...question };
    return {
      type: "short-text",
      text: "",
      description: "",
      required: false,
      order: allQuestions.length,
    };
  });

  const [optionInput, setOptionInput] = useState("");

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setFormData({
        ...formData,
        options: [...(formData.options || []), optionInput.trim()],
      });
      setOptionInput("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options?.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="questionText">Question Text *</Label>
        <Input
          id="questionText"
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          placeholder="Enter your question..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description || ""}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Add helper text or instructions..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Question Type *</Label>
        <Select
          value={formData.type}
          onValueChange={(value) =>
            setFormData({ ...formData, type: value as QuestionType })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(formData.type === "single-choice" || formData.type === "multi-choice") && (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="space-y-2">
            {formData.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input value={option} readOnly className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveOption(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                placeholder="Add an option..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={handleAddOption}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {formData.type === "numeric" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minValue">Minimum Value</Label>
            <Input
              id="minValue"
              type="number"
              value={formData.minValue || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  minValue: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxValue">Maximum Value</Label>
            <Input
              id="maxValue"
              type="number"
              value={formData.maxValue || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxValue: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      )}

      {(formData.type === "short-text" || formData.type === "long-text") && (
        <div className="space-y-2">
          <Label htmlFor="maxLength">Maximum Length (Optional)</Label>
          <Input
            id="maxLength"
            type="number"
            value={formData.maxLength || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxLength: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="Leave empty for no limit"
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="required"
          checked={formData.required}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, required: checked as boolean })
          }
        />
        <Label htmlFor="required" className="cursor-pointer">
          Required question
        </Label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          Save Question
        </Button>
      </div>
    </form>
  );
}

export function AssessmentBuilderPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showPreview, setShowPreview] = useState(false);
  const [sections, setSections] = useState<AssessmentSection[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");

  const [editingQuestion, setEditingQuestion] = useState<{
    sectionId: string;
    question?: Question;
  } | null>(null);

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", jobId],
    queryFn: () => fetchAssessment(jobId!),
    enabled: !!jobId,
  });

  useEffect(() => {
    if (assessment) {
      setTitle(assessment.title || "");
      setDescription(assessment.description || "");
      setSections(assessment.sections || []);
    }
  }, [assessment]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveAssessment(jobId!, {
        title,
        description,
        sections,
        jobId: jobId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment", jobId] });
      toast.success("Assessment saved successfully");
    },
    onError: () => {
      toast.error("Failed to save assessment");
    },
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      setSections(arrayMove(sections, oldIndex, newIndex));
    }
  };

  const handleAddSection = () => {
    setSectionTitle("");
    setSectionDescription("");
    setEditingSectionId(null);
    setSectionDialogOpen(true);
  };

  const handleEditSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      setSectionTitle(section.title);
      setSectionDescription(section.description || "");
      setEditingSectionId(sectionId);
      setSectionDialogOpen(true);
    }
  };

  const handleSaveSection = () => {
    if (!sectionTitle.trim()) return;

    if (editingSectionId) {
      setSections(
        sections.map((s) =>
          s.id === editingSectionId
            ? { ...s, title: sectionTitle, description: sectionDescription }
            : s
        )
      );
    } else {
      const newSection: AssessmentSection = {
        id: crypto.randomUUID(),
        title: sectionTitle,
        description: sectionDescription || undefined,
        questions: [],
        order: sections.length,
      };
      setSections([...sections, newSection]);
    }
    setSectionDialogOpen(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (window.confirm("Delete this section and all its questions?")) {
      setSections(sections.filter((s) => s.id !== sectionId));
    }
  };

  const handleAddQuestion = (sectionId: string) => {
    setEditingQuestion({ sectionId });
  };

  const handleEditQuestion = (sectionId: string, questionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const question = section?.questions.find((q) => q.id === questionId);
    if (question) {
      setEditingQuestion({ sectionId, question });
    }
  };

  const handleSaveQuestion = (questionData: Omit<Question, "id">) => {
    if (!editingQuestion) return;

    setSections(
      sections.map((s) => {
        if (s.id === editingQuestion.sectionId) {
          if (editingQuestion.question) {
            return {
              ...s,
              questions: s.questions.map((q) =>
                q.id === editingQuestion.question!.id
                  ? { ...questionData, id: q.id }
                  : q
              ),
            };
          } else {
            return {
              ...s,
              questions: [
                ...s.questions,
                { ...questionData, id: crypto.randomUUID() },
              ],
            };
          }
        }
        return s;
      })
    );
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (sectionId: string, questionId: string) => {
    if (window.confirm("Delete this question?")) {
      setSections(
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
            : s
        )
      );
    }
  };

  const handleReorderQuestions = (
    sectionId: string,
    oldIndex: number,
    newIndex: number
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: arrayMove(s.questions, oldIndex, newIndex) }
          : s
      )
    );
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading assessment...</div>;
  }

  const allQuestions = sections.flatMap((s) => s.questions);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/jobs/${jobId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Assessment Builder
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage job-specific assessments
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Assessment"}
          </Button>
        </div>
      </div>

      <div className={showPreview ? "grid grid-cols-2 gap-6" : ""}>
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assessment Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Technical Skills Assessment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description (Optional)</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide instructions or context..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Sections & Questions</h2>
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          {sections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No sections yet. Click "Add Section" to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onEdit={() => handleEditSection(section.id)}
                    onDelete={() => handleDeleteSection(section.id)}
                    onAddQuestion={() => handleAddQuestion(section.id)}
                    onEditQuestion={(qId) => handleEditQuestion(section.id, qId)}
                    onDeleteQuestion={(qId) => handleDeleteQuestion(section.id, qId)}
                    onReorderQuestions={(oldIdx, newIdx) =>
                      handleReorderQuestions(section.id, oldIdx, newIdx)
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {showPreview && (
          <div className="sticky top-6 h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <CardDescription>
                  How candidates will see this assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold">{title || "Untitled Assessment"}</h3>
                    {description && (
                      <p className="text-muted-foreground mt-2">{description}</p>
                    )}
                  </div>

                  {sections.map((section, sIdx) => (
                    <div key={section.id} className="space-y-4">
                      <div className="pt-4 border-t">
                        <h4 className="text-lg font-semibold">
                          {sIdx + 1}. {section.title}
                        </h4>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {section.description}
                          </p>
                        )}
                      </div>

                      {section.questions.map((question, qIdx) => (
                        <div key={question.id} className="pl-4">
                          <Label className="text-base">
                            {sIdx + 1}.{qIdx + 1} {question.text}
                            {question.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                          {question.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {question.description}
                            </p>
                          )}

                          <div className="mt-2">
                            {question.type === "single-choice" &&
                              question.options?.map((option, idx) => {
                                const optionText = typeof option === 'string' ? option : (option as any).label || (option as any).value || String(option);
                                return (
                                  <div key={idx} className="flex items-center gap-2 py-1">
                                    <input type="radio" name={question.id} disabled />
                                    <span className="text-sm">{optionText}</span>
                                  </div>
                                );
                              })}

                            {question.type === "multi-choice" &&
                              question.options?.map((option, idx) => {
                                const optionText = typeof option === 'string' ? option : (option as any).label || (option as any).value || String(option);
                                return (
                                  <div key={idx} className="flex items-center gap-2 py-1">
                                    <input type="checkbox" disabled />
                                    <span className="text-sm">{optionText}</span>
                                  </div>
                                );
                              })}

                            {question.type === "short-text" && (
                              <Input
                                placeholder="Type your answer..."
                                disabled
                                className="mt-1"
                              />
                            )}

                            {question.type === "long-text" && (
                              <Textarea
                                placeholder="Type your answer..."
                                disabled
                                rows={4}
                                className="mt-1"
                              />
                            )}

                            {question.type === "numeric" && (
                              <Input
                                type="number"
                                placeholder={`${
                                  question.minValue !== undefined
                                    ? `Min: ${question.minValue}`
                                    : ""
                                } ${
                                  question.maxValue !== undefined
                                    ? `Max: ${question.maxValue}`
                                    : ""
                                }`.trim() || "Enter a number..."}
                                disabled
                                className="mt-1"
                              />
                            )}

                            {question.type === "file-upload" && (
                              <div className="mt-1 border-2 border-dashed rounded-md p-4 text-center text-sm text-muted-foreground">
                                Click to upload or drag and drop
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {sections.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Add sections and questions to see them here
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSectionId ? "Edit Section" : "Add New Section"}
            </DialogTitle>
            <DialogDescription>
              Sections help organize your assessment into logical groups.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sectionTitle">Section Title *</Label>
              <Input
                id="sectionTitle"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g., Technical Knowledge"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectionDesc">Description (Optional)</Label>
              <Textarea
                id="sectionDesc"
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                placeholder="Describe this section..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection} disabled={!sectionTitle.trim()}>
              {editingSectionId ? "Save Changes" : "Add Section"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingQuestion}
        onOpenChange={(open) => !open && setEditingQuestion(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion?.question ? "Edit Question" : "Add New Question"}
            </DialogTitle>
            <DialogDescription>
              Configure question type, options, and validation rules.
            </DialogDescription>
          </DialogHeader>
          <QuestionEditor
            question={editingQuestion?.question}
            allQuestions={allQuestions}
            onSave={handleSaveQuestion}
            onCancel={() => setEditingQuestion(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
