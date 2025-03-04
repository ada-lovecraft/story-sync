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
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Edit, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { useWorkflow } from "./workflow-provider";
// eslint-disable-next-line import/no-cycle
import { useWorkflowData, WorkflowStep as WorkflowStepEnum } from "@/hooks/use-workflow-data";
import { type RouterOutputs } from "@/trpc/react";
import { createLogger } from "@/lib/logger";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/app/_components/ui/dialog";
import { Textarea } from "@/app/_components/ui/textarea";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { type TRPCClientErrorLike } from "@trpc/client";

const { log } = createLogger("rounds-step");

// Define types for props and rounds
interface RoundsStepProps {
    className?: string;
}

type ChatLog = RouterOutputs["workflow"]["getAllChatLogs"][number];
type Round = RouterOutputs["workflow"]["getRounds"][0];

// Define interface for the edit round form
interface EditRoundFormData {
    id: string;
    roundNumber: number;
    content: string;
}

export function RoundsStep({ className }: RoundsStepProps) {
    // State for parsing and rounds
    const [isParsing, setIsParsing] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("parsed");

    // State for editing rounds
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRound, setEditingRound] = useState<EditRoundFormData | null>(null);

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

    // tRPC utils for cache invalidation
    const utils = api.useUtils();

    // Get the fileId from the synchronized state
    const chatLogId = selectedDocumentId ?? "";
    const documentName = selectedDocumentName ?? "Selected document";

    // tRPC hooks for parsing rounds and getting rounds
    const { data: rounds, isLoading: isLoadingRounds, refetch: refetchRounds } = api.workflow.getRounds.useQuery(
        { chatLogId },
        { enabled: !!chatLogId }
    );

    // tRPC mutation for parsing rounds
    const parseRoundsMutation = api.workflow.parseRounds.useMutation({
        onSuccess: () => {
            toast.success("Rounds parsed successfully");
            setIsParsing(false);
            void refetchRounds();
        },
        onError: (error: TRPCClientErrorLike<any>) => {
            toast.error(`Failed to parse rounds: ${error.message}`);
            setIsParsing(false);
        },
    });

    // tRPC mutation for updating a round
    const updateRoundMutation = api.workflow.updateRound.useMutation({
        onSuccess: () => {
            toast.success("Round updated successfully");
            setIsEditModalOpen(false);
            setEditingRound(null);
            void refetchRounds();
        },
        onError: (error: TRPCClientErrorLike<any>) => {
            toast.error(`Failed to update round: ${error.message}`);
        }
    });

    // Handle parse rounds
    const handleParseRounds = useCallback(() => {
        if (!chatLogId) {
            toast.error("No document selected", {
                description: "Please select a document to parse into rounds.",
            });
            return;
        }

        setIsParsing(true);
        parseRoundsMutation.mutate({ chatLogId });
    }, [chatLogId, parseRoundsMutation]);

    // Handle continue to chapters
    const handleContinueToChapters = useCallback(() => {
        // Ensure both state systems are updated before proceeding
        if (chatLogId) {
            // Update workflowData if needed
            if (workflowData.selectedDocumentId !== chatLogId) {
                updateWorkflowData({
                    selectedDocumentId: chatLogId,
                    selectedDocumentName: documentName,
                });
            }

            // Update workflow context if needed
            if (activeFileId !== chatLogId) {
                setActiveFileId(chatLogId);
            }
        }

        // Set next enabled
        setNextEnabled(true);

        // Navigate to chapters step
        goToStep(WorkflowStepEnum.CHAPTER);
    }, [chatLogId, documentName, goToStep, setNextEnabled, workflowData.selectedDocumentId,
        updateWorkflowData, activeFileId, setActiveFileId]);

    // Handle edit round button click
    const handleEditRound = useCallback((round: Round) => {
        setEditingRound({
            id: round.id,
            roundNumber: round.roundNumber,
            content: round.content
        });
        setIsEditModalOpen(true);
    }, []);

    // Handle save edited round
    const handleSaveRound = useCallback(() => {
        if (!editingRound || !editingRound.id) return;

        updateRoundMutation.mutate({
            id: editingRound.id,
            roundNumber: editingRound.roundNumber,
            content: editingRound.content
        });
    }, [editingRound, updateRoundMutation]);

    // Handle cancel edit
    const handleCancelEdit = useCallback(() => {
        setIsEditModalOpen(false);
        setEditingRound(null);
    }, []);

    // Check if we need to automatically parse rounds
    useEffect(() => {
        if (chatLogId && !isLoadingRounds && (!rounds || rounds.length === 0) && !isParsing) {
            handleParseRounds();
        }
    }, [chatLogId, handleParseRounds, isLoadingRounds, isParsing, rounds]);

    // Enable/disable next button based on rounds availability
    useEffect(() => {
        if (rounds && rounds.length > 0) {
            setNextEnabled(true);
        } else {
            setNextEnabled(false);
        }
    }, [rounds, setNextEnabled]);

    // If no file is selected, show a message
    if (!chatLogId) {
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
                        disabled={isParsing || parseRoundsMutation.isPending}
                    >
                        {isParsing || parseRoundsMutation.isPending ? (
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
                                            <CardHeader className="py-2 flex flex-row items-center justify-between">
                                                <CardTitle className="text-base">
                                                    Round {round.roundNumber}
                                                </CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditRound(round)}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
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
                                    disabled={isParsing || parseRoundsMutation.isPending}
                                >
                                    {isParsing || parseRoundsMutation.isPending ? (
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

                {/* Edit Round Dialog */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Edit Round</DialogTitle>
                            <DialogDescription>
                                Make changes to the round content and number, then save.
                            </DialogDescription>
                        </DialogHeader>

                        {editingRound && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="roundNumber">Round Number</Label>
                                    <Input
                                        id="roundNumber"
                                        type="number"
                                        value={editingRound.roundNumber}
                                        onChange={(e) => setEditingRound({
                                            ...editingRound,
                                            roundNumber: parseInt(e.target.value, 10) || 1
                                        })}
                                        min="1"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="content">Content</Label>
                                    <Textarea
                                        id="content"
                                        value={editingRound.content}
                                        onChange={(e) => setEditingRound({
                                            ...editingRound,
                                            content: e.target.value
                                        })}
                                        rows={15}
                                        className="resize-y"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={handleCancelEdit}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveRound}
                                disabled={updateRoundMutation.isPending}
                            >
                                {updateRoundMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
} 
} 