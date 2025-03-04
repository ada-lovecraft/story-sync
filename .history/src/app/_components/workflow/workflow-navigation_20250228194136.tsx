"use client";

import { Button } from "@/app/_components/ui/button";
import { useWorkflow, WORKFLOW_STEPS, type WorkflowStep } from "./workflow-provider";
import { ChevronRight, ChevronLeft, Check, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkflowNavigation() {
    const {
        currentStep,
        goToStep,
        goToNextStep,
        goToPreviousStep,
        canGoNext,
        canGoPrevious,
        isStepCompleted,
    } = useWorkflow();

    return (
        <div className="flex flex-col space-y-4 w-full">
            {/* Step indicators */}
            <div className="flex justify-between items-center w-full px-2">
                {(Object.keys(WORKFLOW_STEPS) as WorkflowStep[]).map((step) => {
                    const stepData = WORKFLOW_STEPS[step];
                    const isCurrent = currentStep === step;
                    const isCompleted = isStepCompleted(step);

                    return (
                        <div
                            key={step}
                            className="flex flex-col items-center"
                            onClick={() => goToStep(step)}
                        >
                            <div
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors",
                                    isCurrent
                                        ? "bg-primary text-primary-foreground"
                                        : isCompleted
                                            ? "bg-primary/20 text-primary hover:bg-primary/30"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {isCompleted ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <span>{stepData.number}</span>
                                )}
                            </div>
                            <span
                                className={cn(
                                    "text-xs mt-1",
                                    isCurrent
                                        ? "text-primary font-medium"
                                        : isCompleted
                                            ? "text-primary/70"
                                            : "text-muted-foreground"
                                )}
                            >
                                {stepData.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between w-full">
                <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={!canGoPrevious}
                    className="flex items-center space-x-1"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                </Button>

                <Button
                    onClick={goToNextStep}
                    disabled={!canGoNext}
                    className="flex items-center space-x-1"
                >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export function WorkflowStepper() {
    const { currentStep, goToStep, isStepCompleted } = useWorkflow();

    return (
        <nav className="flex items-center space-x-2 py-4" aria-label="Workflow steps">
            {(Object.keys(WORKFLOW_STEPS) as WorkflowStep[]).map((step, index, array) => (
                <div key={step} className="flex items-center">
                    {/* Step button */}
                    <button
                        onClick={() => goToStep(step)}
                        className={cn(
                            "flex items-center justify-center h-8 px-3 rounded-md text-sm transition-colors",
                            currentStep === step
                                ? "bg-primary text-primary-foreground"
                                : isStepCompleted(step)
                                    ? "text-primary hover:bg-primary/10"
                                    : "text-muted-foreground hover:bg-muted"
                        )}
                        aria-current={currentStep === step ? "step" : undefined}
                    >
                        <span className="flex items-center justify-center w-5 h-5 mr-1">
                            {isStepCompleted(step) ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <CircleDashed className="h-4 w-4" />
                            )}
                        </span>
                        <span>{WORKFLOW_STEPS[step].label}</span>
                    </button>

                    {/* Connector line between steps */}
                    {index < array.length - 1 && (
                        <div
                            className={cn(
                                "w-5 h-px mx-1",
                                isStepCompleted(step) ? "bg-primary" : "bg-border"
                            )}
                        />
                    )}
                </div>
            ))}
        </nav>
    );
} 