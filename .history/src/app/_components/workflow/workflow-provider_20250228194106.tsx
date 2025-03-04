"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from "react";
import { useRouter } from "next/navigation";

// Define workflow steps with their routes and step numbers
export const WORKFLOW_STEPS = {
    UPLOAD: { route: "/", number: 1, label: "Upload/Select" },
    CLEAN: { route: "/clean", number: 2, label: "Clean/Format" },
    ROUNDS: { route: "/rounds", number: 3, label: "Parse Rounds" },
    CHAPTERS: { route: "/chapters", number: 4, label: "Chapter Chunking" },
};

export type WorkflowStep = keyof typeof WORKFLOW_STEPS;

// Type for the workflow context
interface WorkflowContextType {
    currentStep: WorkflowStep;
    goToStep: (step: WorkflowStep) => void;
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    canGoNext: boolean;
    canGoPrevious: boolean;
    activeFileId: string | null;
    setActiveFileId: (id: string | null) => void;
    isStepCompleted: (step: WorkflowStep) => boolean;
    markStepComplete: (step: WorkflowStep, completed?: boolean) => void;
}

// Create the workflow context
const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// Types for the provider props
interface WorkflowProviderProps {
    children: ReactNode;
    initialStep?: WorkflowStep;
    initialFileId?: string | null;
}

// Steps in order of workflow progression
const STEP_ORDER: WorkflowStep[] = ["UPLOAD", "CLEAN", "ROUNDS", "CHAPTERS"];

export function WorkflowProvider({
    children,
    initialStep = "UPLOAD",
    initialFileId = null,
}: WorkflowProviderProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(initialStep);
    const [activeFileId, setActiveFileId] = useState<string | null>(initialFileId);
    const [completedSteps, setCompletedSteps] = useState<Set<WorkflowStep>>(new Set());

    // Calculate current step index in the workflow
    const currentStepIndex = STEP_ORDER.indexOf(currentStep);

    // Determine if navigation to next/previous steps is possible
    const canGoNext = currentStepIndex < STEP_ORDER.length - 1;
    const canGoPrevious = currentStepIndex > 0;

    // Navigate to a specific step
    const goToStep = useCallback(
        (step: WorkflowStep) => {
            setCurrentStep(step);
            router.push(WORKFLOW_STEPS[step].route);
        },
        [router]
    );

    // Navigate to the next step in the workflow
    const goToNextStep = useCallback(() => {
        if (canGoNext && currentStepIndex !== -1) {
            const nextStep = STEP_ORDER[currentStepIndex + 1];
            if (nextStep) {
                goToStep(nextStep);
            }
        }
    }, [canGoNext, currentStepIndex, goToStep]);

    // Navigate to the previous step in the workflow
    const goToPreviousStep = useCallback(() => {
        if (canGoPrevious && currentStepIndex !== -1) {
            const prevStep = STEP_ORDER[currentStepIndex - 1];
            if (prevStep) {
                goToStep(prevStep);
            }
        }
    }, [canGoPrevious, currentStepIndex, goToStep]);

    // Check if a specific step is completed
    const isStepCompleted = useCallback(
        (step: WorkflowStep) => completedSteps.has(step),
        [completedSteps]
    );

    // Mark a step as complete or incomplete
    const markStepComplete = useCallback((step: WorkflowStep, completed = true) => {
        setCompletedSteps((prevSteps) => {
            const newSteps = new Set(prevSteps);
            if (completed) {
                newSteps.add(step);
            } else {
                newSteps.delete(step);
            }
            return newSteps;
        });
    }, []);

    // Create the context value to provide
    const contextValue = useMemo(
        () => ({
            currentStep,
            goToStep,
            goToNextStep,
            goToPreviousStep,
            canGoNext,
            canGoPrevious,
            activeFileId,
            setActiveFileId,
            isStepCompleted,
            markStepComplete,
        }),
        [
            currentStep,
            goToStep,
            goToNextStep,
            goToPreviousStep,
            canGoNext,
            canGoPrevious,
            activeFileId,
            setActiveFileId,
            isStepCompleted,
            markStepComplete,
        ]
    );

    return (
        <WorkflowContext.Provider value={contextValue}>
            {children}
        </WorkflowContext.Provider>
    );
}

// Custom hook to use the workflow context
export function useWorkflow() {
    const context = useContext(WorkflowContext);

    if (!context) {
        throw new Error("useWorkflow must be used within a WorkflowProvider");
    }

    return context;
} 