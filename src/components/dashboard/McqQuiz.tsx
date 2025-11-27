import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, RotateCcw, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MCQQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

interface McqQuizProps {
  questions: MCQQuestion[];
  onRetry: () => void;
}

const McqQuiz = ({ questions, onRetry }: McqQuizProps) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});

  const handleAnswerChange = (questionId: number, answer: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    // Expand explanations for wrong answers automatically
    const wrongAnswers: Record<number, boolean> = {};
    questions.forEach(q => {
      if (answers[q.id] !== q.correctAnswer) {
        wrongAnswers[q.id] = true;
      }
    });
    setExpandedExplanations(wrongAnswers);
  };

  const toggleExplanation = (questionId: number) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const score = calculateScore();
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const percentage = submitted ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Score Card - Only shown after submission */}
      {submitted && (
        <Card className="p-6 bg-gradient-primary border-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="w-12 h-12 text-primary-foreground" />
              <div>
                <h3 className="text-2xl font-bold text-primary-foreground">
                  Your Score: {score}/{totalQuestions}
                </h3>
                <p className="text-primary-foreground/80">
                  {percentage >= 80 ? 'Excellent work!' : 
                   percentage >= 60 ? 'Good job!' : 
                   percentage >= 40 ? 'Keep practicing!' : 'Review the material and try again!'}
                </p>
              </div>
            </div>
            <div className="text-4xl font-bold text-primary-foreground">
              {percentage}%
            </div>
          </div>
        </Card>
      )}

      {/* Progress indicator before submission */}
      {!submitted && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Answered: {answeredCount}/{totalQuestions}</span>
          <span>Select an answer for each question</span>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, index) => {
          const userAnswer = answers[question.id];
          const isCorrect = userAnswer === question.correctAnswer;
          const hasAnswered = userAnswer !== undefined;

          return (
            <Card 
              key={question.id} 
              className={cn(
                "p-6 transition-all duration-300",
                submitted && isCorrect && "border-green-500/50 bg-green-500/5",
                submitted && hasAnswered && !isCorrect && "border-red-500/50 bg-red-500/5",
                submitted && !hasAnswered && "border-yellow-500/50 bg-yellow-500/5"
              )}
            >
              {/* Question Header */}
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <h4 className="text-lg font-medium text-foreground flex-1">
                  {question.question}
                </h4>
                {submitted && hasAnswered && (
                  isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  )
                )}
              </div>

              {/* Options */}
              <RadioGroup
                value={userAnswer || ''}
                onValueChange={(value) => handleAnswerChange(question.id, value)}
                className="space-y-2 ml-11"
              >
                {(['A', 'B', 'C', 'D'] as const).map((option) => {
                  const isThisCorrect = option === question.correctAnswer;
                  const isThisSelected = userAnswer === option;

                  return (
                    <div
                      key={option}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg border transition-all",
                        !submitted && "hover:bg-muted/50 border-border",
                        !submitted && isThisSelected && "bg-primary/10 border-primary",
                        submitted && isThisCorrect && "bg-green-500/10 border-green-500",
                        submitted && isThisSelected && !isThisCorrect && "bg-red-500/10 border-red-500",
                        submitted && !isThisCorrect && !isThisSelected && "opacity-60"
                      )}
                    >
                      <RadioGroupItem
                        value={option}
                        id={`q${question.id}-${option}`}
                        disabled={submitted}
                        className={cn(
                          submitted && isThisCorrect && "border-green-500 text-green-500",
                          submitted && isThisSelected && !isThisCorrect && "border-red-500 text-red-500"
                        )}
                      />
                      <Label
                        htmlFor={`q${question.id}-${option}`}
                        className={cn(
                          "flex-1 cursor-pointer text-foreground",
                          submitted && "cursor-default"
                        )}
                      >
                        <span className="font-semibold mr-2">{option}.</span>
                        {question.options[option]}
                      </Label>
                      {submitted && isThisCorrect && (
                        <span className="text-xs font-medium text-green-500">Correct</span>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>

              {/* Explanation - Collapsible */}
              {submitted && (
                <Collapsible
                  open={expandedExplanations[question.id]}
                  onOpenChange={() => toggleExplanation(question.id)}
                  className="mt-4 ml-11"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between hover:bg-muted/50"
                    >
                      <span className="text-muted-foreground">
                        {expandedExplanations[question.id] ? 'Hide' : 'Show'} Explanation
                      </span>
                      {expandedExplanations[question.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Explanation: </span>
                        {question.explanation}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </Card>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center pt-4">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={answeredCount < totalQuestions}
            className="px-8 py-3 bg-gradient-primary hover:opacity-90"
          >
            Submit Quiz ({answeredCount}/{totalQuestions} answered)
          </Button>
        ) : (
          <Button
            onClick={onRetry}
            variant="outline"
            className="px-8 py-3"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try New Quiz
          </Button>
        )}
      </div>
    </div>
  );
};

export default McqQuiz;
