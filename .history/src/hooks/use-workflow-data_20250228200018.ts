"use client";

import { create } from "zustand";
import { createLogger } from "@/lib/logger";

const { log } = createLogger("use-workflow-data");

export enum WorkflowStep {
    UPLOAD = 1,
    CLEAN = 2,
    PARSE = 3,
    CHAPTER = 4,
}

// Define workflow data structure
export interface WorkflowData {
    selectedDocumentId?: string;
    selectedDocumentName?: string;
    [key: string]: unknown;
}

// Define workflow store state
interface WorkflowState {
    currentStep: WorkflowStep;
    isNextEnabled: boolean;
    workflowData: WorkflowData;
    setCurrentStep: (step: WorkflowStep) => void;
    setNextEnabled: (enabled: boolean) => void;
    updateWorkflowData: (data: Partial<WorkflowData>) => void;
    resetWorkflow: () => void;
}

// Create store with zustand
const useWorkflowStore = create<WorkflowState>((set) => ({
    currentStep: WorkflowStep.UPLOAD,
    isNextEnabled: false,
    workflowData: {},

    setCurrentStep: (step: WorkflowStep) => {
        log("Setting current step", { step });
        set({ currentStep: step });
    },

    setNextEnabled: (enabled: boolean) => {
        log("Setting next enabled", { enabled });
        set({ isNextEnabled: enabled });
    },

    updateWorkflowData: (data: Partial<WorkflowData>) => {
        log("Updating workflow data", { data });
        set((state) => ({
            workflowData: { ...state.workflowData, ...data },
        }));
    },

    resetWorkflow: () => {
        log("Resetting workflow");
        set({
            currentStep: WorkflowStep.UPLOAD,
            isNextEnabled: false,
            workflowData: {},
        });
    },
}));

// Hook for workflow state
export function useWorkflowData() {
    const {
        currentStep,
        isNextEnabled,
        workflowData,
        setCurrentStep,
        setNextEnabled,
        updateWorkflowData,
        resetWorkflow,
    } = useWorkflowStore();

    // Move to the next step in the workflow
    const goToNextStep = () => {
        const nextStepValue = currentStep + 1;
        // Convert to number for safe comparison
        if (nextStepValue <= WorkflowStep.CHAPTER) {
            setCurrentStep(nextStepValue as WorkflowStep);
            setNextEnabled(false);
        }
    };

    // Move to the previous step in the workflow
    const goToPreviousStep = () => {
        const prevStepValue = currentStep - 1;
        // Convert to number for safe comparison
        if (prevStepValue >= WorkflowStep.UPLOAD) {
            setCurrentStep(prevStepValue as WorkflowStep);
            // Previous steps are always enabled
            setNextEnabled(true);
        }
    };

    // Jump to a specific step
    const goToStep = (step: WorkflowStep) => {
        // Use direct enum comparison without the >= or <= operators
        const isValidStep = step === WorkflowStep.UPLOAD ||
            step === WorkflowStep.CLEAN ||
            step === WorkflowStep.PARSE ||
            step === WorkflowStep.CHAPTER;

        if (isValidStep) {
            setCurrentStep(step);
            // When jumping backwards, enable next button
            const isBackwardsJump = Number(step) < Number(currentStep);
            setNextEnabled(isBackwardsJump);
        }
    };

    return {
        currentStep,
        isNextEnabled,
        workflowData,
        setCurrentStep,
        setNextEnabled,
        updateWorkflowData,
        resetWorkflow,
        goToNextStep,
        goToPreviousStep,
        goToStep,
    };
} 