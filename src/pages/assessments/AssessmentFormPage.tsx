import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Upload } from "lucide-react";
import type { Assessment, Question } from "@/types";

interface AssessmentResponse {
  id?: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  answers: Record<string, any>;
  submittedAt?: Date;
}

async function fetchAssessment(jobId: string): Promise<Assessment | null> {
  const res = await fetch(`/api/assessments/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch assessment");
  return res.json();
}

async function submitAssessmentResponse(response: AssessmentResponse) {
  const res = await fetch(`/api/assessments/${response.jobId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(response),
  });
  if (!res.ok) throw new Error("Failed to submit assessment");
  return res.json();
}

export function AssessmentFormPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [candidateInfo, setCandidateInfo] = useState({
    name: "",
    email: "",
  });
  const [infoSubmitted, setInfoSubmitted] = useState(false);

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", jobId],
    queryFn: () => fetchAssessment(jobId!),
    enabled: !!jobId,
  });

  const submitMutation = useMutation({
    mutationFn: submitAssessmentResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Assessment submitted successfully!");
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to submit assessment");
    },
  });

  // Calculate progress
  const totalQuestions = assessment?.sections.reduce(
    (sum, section) => sum + section.questions.length,
    0
  ) || 0;
  const answeredQuestions = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  // Check if a question should be shown based on conditional logic
  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.conditionalLogic || question.conditionalLogic.length === 0) {
      return true;
    }

    return question.conditionalLogic.every((condition) => {
      const answer = answers[condition.questionId];

      if (!answer) return false;

      switch (condition.operator) {
        case "equals":
          if (Array.isArray(answer)) {
            return answer.includes(condition.value);
          }
          return answer === condition.value;

        case "not_equals":
          if (Array.isArray(answer)) {
            return !answer.includes(condition.value);
          }
          return answer !== condition.value;

        case "contains":
          if (Array.isArray(answer)) {
            return answer.includes(condition.value);
          }
          return String(answer).toLowerCase().includes(String(condition.value).toLowerCase());

        case "greater_than":
          return Number(answer) > Number(condition.value);

        case "less_than":
          return Number(answer) < Number(condition.value);

        default:
          return true;
      }
    });
  };

  // Validate a single question
  const validateQuestion = (question: Question, value: any): string | null => {
    if (!shouldShowQuestion(question)) {
      return null; // Skip validation for hidden questions
    }

    if (question.required && (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0))) {
      return "This field is required";
    }

    if (question.type === "numeric" && value !== undefined && value !== "") {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return "Please enter a valid number";
      }
      if (question.minValue !== undefined && numValue < question.minValue) {
        return `Value must be at least ${question.minValue}`;
      }
      if (question.maxValue !== undefined && numValue > question.maxValue) {
        return `Value must be at most ${question.maxValue}`;
      }
    }

    if ((question.type === "short-text" || question.type === "long-text") && question.maxLength && value) {
      if (String(value).length > question.maxLength) {
        return `Maximum ${question.maxLength} characters allowed`;
      }
    }

    return null;
  };

  // Validate current section
  const validateCurrentSection = (): boolean => {
    if (!assessment) return false;

    const currentSection = assessment.sections[currentSectionIndex];
    const newErrors: Record<string, string> = {};

    currentSection.questions.forEach((question) => {
      if (shouldShowQuestion(question)) {
        const error = validateQuestion(question, answers[question.id]);
        if (error) {
          newErrors[question.id] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle answer change
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // Clear error for this question
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  // Handle multi-choice checkbox toggle
  const handleMultiChoiceToggle = (questionId: string, option: string) => {
    const currentValues = (answers[questionId] as string[]) || [];
    const newValues = currentValues.includes(option)
      ? currentValues.filter((v) => v !== option)
      : [...currentValues, option];

    handleAnswerChange(questionId, newValues);
  };

  // Navigate to next section
  const handleNext = () => {
    if (validateCurrentSection()) {
      if (assessment && currentSectionIndex < assessment.sections.length - 1) {
        setCurrentSectionIndex((prev) => prev + 1);
        window.scrollTo(0, 0);
      }
    }
  };

  // Navigate to previous section
  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  // Submit the assessment
  const handleSubmit = () => {
    if (!validateCurrentSection()) {
      return;
    }

    // Validate all sections
    const allErrors: Record<string, string> = {};
    assessment?.sections.forEach((section) => {
      section.questions.forEach((question) => {
        if (shouldShowQuestion(question)) {
          const error = validateQuestion(question, answers[question.id]);
          if (error) {
            allErrors[question.id] = error;
          }
        }
      });
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast.error("Please complete all required fields");
      return;
    }

    submitMutation.mutate({
      jobId: jobId!,
      candidateId: crypto.randomUUID(),
      candidateName: candidateInfo.name,
      candidateEmail: candidateInfo.email,
      answers,
      submittedAt: new Date(),
    });
  };

  // Render candidate info form
  if (!infoSubmitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Candidate Information</CardTitle>
            <CardDescription>
              Please provide your information to begin the assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={candidateInfo.name}
                onChange={(e) =>
                  setCandidateInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={candidateInfo.email}
                onChange={(e) =>
                  setCandidateInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john@example.com"
              />
            </div>

            <Button
              onClick={() => {
                if (!candidateInfo.name || !candidateInfo.email) {
                  toast.error("Please fill in all fields");
                  return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateInfo.email)) {
                  toast.error("Please enter a valid email address");
                  return;
                }
                setInfoSubmitted(true);
              }}
              className="w-full"
            >
              Begin Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Assessment Not Found</h3>
            <p className="text-muted-foreground mb-4">
              No assessment has been created for this job yet.
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSection = assessment.sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === assessment.sections.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{assessment.title}</h1>
        {assessment.description && (
          <p className="text-muted-foreground mt-2">{assessment.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {answeredQuestions} of {totalQuestions} questions answered
              </span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {/* Section Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {assessment.sections.map((section, index) => (
          <Button
            key={section.id}
            variant={index === currentSectionIndex ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (index < currentSectionIndex || validateCurrentSection()) {
                setCurrentSectionIndex(index);
              }
            }}
            className="whitespace-nowrap"
          >
            {index + 1}. {section.title}
          </Button>
        ))}
      </div>

      {/* Current Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            Section {currentSectionIndex + 1}: {currentSection.title}
          </CardTitle>
          {currentSection.description && (
            <CardDescription>{currentSection.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection.questions.map((question, qIdx) => {
            if (!shouldShowQuestion(question)) {
              return null; // Hide question if conditional logic doesn't pass
            }

            const questionNumber = `${currentSectionIndex + 1}.${qIdx + 1}`;
            const error = errors[question.id];

            return (
              <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                <Label className="text-base">
                  {questionNumber}. {question.text}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {question.description && (
                  <p className="text-sm text-muted-foreground">{question.description}</p>
                )}

                {/* Single Choice */}
                {question.type === "single-choice" && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                  >
                    {question.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                        <Label
                          htmlFor={`${question.id}-${option}`}
                          className="font-normal cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Multiple Choice */}
                {question.type === "multi-choice" && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${question.id}-${option}`}
                          checked={((answers[question.id] as string[]) || []).includes(option)}
                          onCheckedChange={() => handleMultiChoiceToggle(question.id, option)}
                        />
                        <Label
                          htmlFor={`${question.id}-${option}`}
                          className="font-normal cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Short Text */}
                {question.type === "short-text" && (
                  <div className="space-y-1">
                    <Input
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      maxLength={question.maxLength}
                      placeholder="Your answer"
                    />
                    {question.maxLength && (
                      <p className="text-xs text-muted-foreground text-right">
                        {(answers[question.id] || "").length} / {question.maxLength} characters
                      </p>
                    )}
                  </div>
                )}

                {/* Long Text */}
                {question.type === "long-text" && (
                  <div className="space-y-1">
                    <Textarea
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      maxLength={question.maxLength}
                      placeholder="Your answer"
                      rows={5}
                    />
                    {question.maxLength && (
                      <p className="text-xs text-muted-foreground text-right">
                        {(answers[question.id] || "").length} / {question.maxLength} characters
                      </p>
                    )}
                  </div>
                )}

                {/* Numeric */}
                {question.type === "numeric" && (
                  <div className="space-y-1">
                    <Input
                      type="number"
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      min={question.minValue}
                      max={question.maxValue}
                      placeholder="Enter a number"
                    />
                    {(question.minValue !== undefined || question.maxValue !== undefined) && (
                      <p className="text-xs text-muted-foreground">
                        {question.minValue !== undefined && question.maxValue !== undefined
                          ? `Range: ${question.minValue} - ${question.maxValue}`
                          : question.minValue !== undefined
                          ? `Minimum: ${question.minValue}`
                          : `Maximum: ${question.maxValue}`}
                      </p>
                    )}
                  </div>
                )}

                {/* File Upload */}
                {question.type === "file-upload" && (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </p>
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleAnswerChange(question.id, file.name);
                          toast.success(`File "${file.name}" selected`);
                        }
                      }}
                      className="max-w-xs mx-auto"
                    />
                    {answers[question.id] && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Selected: {answers[question.id]}
                      </p>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSectionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {isLastSection ? (
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {submitMutation.isPending ? "Submitting..." : "Submit Assessment"}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
