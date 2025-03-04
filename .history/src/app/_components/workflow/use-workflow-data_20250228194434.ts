"use client";

import { useCallback } from "react";
import { useWorkflow, type WorkflowStep } from "./workflow-provider";
import { api } from "@/trpc/react";
import { toast } from "sonner";

/**
 * Custom hook that combines the workflow context with tRPC for data operations
 */
export function useWorkflowData() {
    const {
        currentStep,
        goToStep,
        goToNextStep,
        activeFileId,
        setActiveFileId,
        markStepComplete,
    } = useWorkflow();

    // tRPC hooks
    const updateWorkflowStep = api.workflow.updateWorkflowStep.useMutation();
    const getAllChatLogs = api.workflow.getAllChatLogs.useQuery(undefined, {
        enabled: currentStep === "UPLOAD",
    });

    // Transition to next step with data saving
    const completeStepAndContinue = useCallback(
        async (step: WorkflowStep) => {
            if (!activeFileId) {
                toast.error("No file selected. Please select a file first.");
                return;
            }

            try {
                // Update the workflow step in the database
                const stepNumber = {
                    UPLOAD: 1,
                    CLEAN: 2,
                    ROUNDS: 3,
                    CHAPTERS: 4,
                }[step];

                await updateWorkflowStep.mutateAsync({
                    chatLogId: activeFileId,
                    stepNumber,
                });

                // Mark the step as complete in the local state
                markStepComplete(step);

                // Navigate to the next step
                goToNextStep();

                toast.success(`${step} step completed successfully!`);
            } catch (error) {
                console.error("Error completing step:", error);
                toast.error(`Failed to complete ${step} step. Please try again.`);
            }
        },
        [activeFileId, updateWorkflowStep, markStepComplete, goToNextStep]
    );

    // Select a file and set it as active
    const selectFile = useCallback(
        (fileId: string) => {
            setActiveFileId(fileId);
            toast.success("File selected successfully!");
        },
        [setActiveFileId]
    );

    return {
        // Workflow context
        currentStep,
        goToStep,
        goToNextStep,
        activeFileId,

        // Data operations
        completeStepAndContinue,
        selectFile,

        // tRPC queries
        chatLogs: getAllChatLogs.data,
        isLoadingChatLogs: getAllChatLogs.isLoading,
    };
} 