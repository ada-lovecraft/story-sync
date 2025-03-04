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
interface WorkflowData {
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

    setCurrentStep: (step) => {
        log("Setting current step", { step });
        set({ currentStep: step });
    },

    setNextEnabled: (enabled) => {
        log("Setting next enabled", { enabled });
        set({ isNextEnabled: enabled });
    },

    updateWorkflowData: (data) => {
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
        const nextStep = currentStep + 1;
        if (nextStep <= WorkflowStep.CHAPTER) {
            setCurrentStep(nextStep);
            setNextEnabled(false);
        }
    };

    // Move to the previous step in the workflow
    const goToPreviousStep = () => {
        const prevStep = currentStep - 1;
        if (prevStep >= WorkflowStep.UPLOAD) {
            setCurrentStep(prevStep);
            // Previous steps are always enabled
            setNextEnabled(true);
        }
    };

    // Jump to a specific step
    const goToStep = (step: WorkflowStep) => {
        if (step >= WorkflowStep.UPLOAD && step <= WorkflowStep.CHAPTER) {
            setCurrentStep(step);
            // When jumping backwards, enable next button
            setNextEnabled(step < currentStep);
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