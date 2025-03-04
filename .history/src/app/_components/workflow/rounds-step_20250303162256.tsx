/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { useWorkflow, WorkflowStep } from "./workflow-provider";
// eslint-disable-next-line import/no-cycle
import { useWorkflowData, WorkflowStep as WorkflowStepEnum } from "@/hooks/use-workflow-data";
import { type RouterOutputs } from "@/trpc/react";
import { createLogger } from "@/lib/logger";

const { log, err } = createLogger("rounds-step");

// Define types for props and rounds
interface RoundsStepProps {
    className?: string;
}

type ChatLog = RouterOutputs["workflow"]["getAllChatLogs"][number];
type Round = RouterOutputs["workflow"]["getRounds"][0];

export function RoundsStep({ className }: RoundsStepProps) {
    // State for parsing and rounds
    const [isParsing, setIsParsing] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("parsed");

    // Get workflow data from both state systems
    const { workflowData, updateWorkflowData, setNextEnabled, goToStep } = useWorkflowData();
    const { activeFileId, setActiveFileId } = useWorkflow();

    // Get the selected document ID from either source, preferring workflowData
    const selectedDocumentId = workflowData.selectedDocumentId ?? activeFileId;
    const selectedDocumentName = workflowData.selectedDocumentName;

    // Ensure both state systems are synchronized
    useEffect(() => {
        if (selectedDocumentId) {
            // If we have a document ID in workflowData but not in workflow context, update the context
            if (workflowData.selectedDocumentId && !activeFileId) {
                log("Synchronizing activeFileId with selectedDocumentId", {
                    selectedDocumentId: workflowData.selectedDocumentId
                });
                setActiveFileId(workflowData.selectedDocumentId);
            }
            // If we have a document ID in workflow context but not in workflowData, update workflowData
            else if (activeFileId && !workflowData.selectedDocumentId) {
                log("Synchronizing selectedDocumentId with activeFileId", {
                    activeFileId
                });
                updateWorkflowData({
                    selectedDocumentId: activeFileId,
                });
            }
        }
    }, [workflowData.selectedDocumentId, activeFileId, setActiveFileId, updateWorkflowData]);

    // tRPC hooks for parsing rounds and getting rounds
    const parseRounds = api.workflow.parseRounds.useMutation();
    const { data: rounds, isLoading: isLoadingRounds, refetch: refetchRounds } = api.workflow.getRounds.useQuery(
        { chatLogId: selectedDocumentId ?? "" },
        { enabled: !!selectedDocumentId }
    );

    // Get the fileId from the synchronized state
    const fileId = selectedDocumentId;

    // Get the selected document name
    const documentName = selectedDocumentName ?? "Selected document";

    // Parse rounds mutation
    const parseRoundsMutation = api.workflow.parseRounds.useMutation({
        onSuccess: () => {
            toast("Rounds parsed successfully", {
                description: "Your chat log has been parsed into rounds.",
            });
            setIsParsing(false);
            void refetchRounds();
        },
        onError: (error) => {
            toast.error("Error parsing rounds", {
                description: error.message,
            });
            setIsParsing(false);
        },
    });

    // Handle parse rounds
    const handleParseRounds = useCallback(() => {
        if (!fileId) {
            toast.error("No document selected", {
                description: "Please select a document to parse into rounds.",
            });
            return;
        }

        setIsParsing(true);
        parseRoundsMutation.mutate({ chatLogId: fileId });
    }, [fileId, parseRoundsMutation]);

    // Handle continue to chapters
    const handleContinueToChapters = useCallback(() => {
        // Ensure both state systems are updated before proceeding
        if (fileId) {
            // Update workflowData if needed
            if (workflowData.selectedDocumentId !== fileId) {
                updateWorkflowData({
                    selectedDocumentId: fileId,
                    selectedDocumentName: documentName,
                });
            }

            // Update workflow context if needed
            if (activeFileId !== fileId) {
                setActiveFileId(fileId);
            }
        }

        // Set next enabled
        setNextEnabled(true);

        // Navigate to chapters step
        goToStep(WorkflowStepEnum.CHAPTER);
    }, [fileId, documentName, goToStep, setNextEnabled, workflowData.selectedDocumentId,
        updateWorkflowData, activeFileId, setActiveFileId]);

    // Check if we need to automatically parse rounds
    useEffect(() => {
        if (fileId && !isLoadingRounds && (!rounds || rounds.length === 0) && !isParsing) {
            handleParseRounds();
        }
    }, [fileId, handleParseRounds, isLoadingRounds, isParsing, rounds]);

    // Enable/disable next button based on rounds availability
    useEffect(() => {
        if (rounds && rounds.length > 0) {
            setNextEnabled(true);
        } else {
            setNextEnabled(false);
        }
    }, [rounds, setNextEnabled]);

    // If no file is selected, show a message
    if (!fileId) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Parse Rounds</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6">
                    <AlertCircle className="mb-4 h-12 w-12 text-yellow-500" />
                    <p className="text-center text-lg font-medium">No document selected</p>
                    <p className="text-center text-muted-foreground">
                        Please select a document in the File Upload step first.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => goToStep(WorkflowStepEnum.UPLOAD)}
                    >
                        Go to File Upload
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Loading state
    if (isLoadingRounds) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Parse Rounds</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6">
                    <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                    <p className="text-center text-lg font-medium">Loading rounds...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Parse Rounds</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {documentName}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleParseRounds}
                        disabled={isParsing}
                    >
                        {isParsing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Parsing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Re-parse Rounds
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="parsed" value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="parsed">Parsed Rounds</TabsTrigger>
                    </TabsList>
                    <TabsContent value="parsed" className="space-y-4">
                        {rounds && rounds.length > 0 ? (
                            <div className="space-y-4">
                                <div className="grid gap-4">
                                    {rounds.map((round) => (
                                        <Card key={round.id}>
                                            <CardHeader className="py-2">
                                                <CardTitle className="text-base">
                                                    Round {round.roundNumber}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="py-2">
                                                <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                                                    {round.content}
                                                </pre>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleContinueToChapters}>
                                        Continue to Chapters
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <AlertCircle className="mb-4 h-12 w-12 text-yellow-500" />
                                <p className="text-center text-lg font-medium">No rounds parsed yet</p>
                                <p className="text-center text-muted-foreground">
                                    Click the button below to parse this document into rounds.
                                </p>
                                <Button
                                    className="mt-4"
                                    onClick={handleParseRounds}
                                    disabled={isParsing}
                                >
                                    {isParsing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Parsing Rounds...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Parse into Rounds
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
} 