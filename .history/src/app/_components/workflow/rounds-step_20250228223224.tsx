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
import { useWorkflow } from "./workflow-provider";
import { useWorkflowData } from "./use-workflow-data";

// Define types for props and rounds
interface RoundsStepProps {
    className?: string;
}

interface Round {
    id: string;
    content: string;
    roundNumber: number;
    chatLogId: string;
    createdAt: Date;
}

export function RoundsStep({ className }: RoundsStepProps) {
    const { activeFileId, goToStep } = useWorkflow();
    const workflowData = useWorkflowData();
    const selectedDocumentId = workflowData.selectedDocumentId;
    const selectedDocumentName = workflowData.selectedDocumentName;

    const [isParsingRounds, setIsParsingRounds] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("parsed");

    // Get the fileId from either the workflow context or Zustand store
    const fileId = activeFileId || selectedDocumentId;

    // Get rounds using tRPC
    const {
        data: rounds,
        isLoading: isLoadingRounds,
        refetch: refetchRounds
    } = api.workflow.getRounds.useQuery(
        { chatLogId: fileId as string },
        { enabled: !!fileId, staleTime: 0 }
    );

    // Parse rounds mutation
    const parseRoundsMutation = api.workflow.parseRounds.useMutation({
        onSuccess: () => {
            toast("Rounds parsed successfully", {
                description: "Your chat log has been parsed into rounds.",
            });
            setIsParsingRounds(false);
            refetchRounds();
        },
        onError: (error) => {
            toast.error("Error parsing rounds", {
                description: error.message,
            });
            setIsParsingRounds(false);
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

        setIsParsingRounds(true);
        parseRoundsMutation.mutate({ chatLogId: fileId });
    }, [fileId, parseRoundsMutation]);

    // Handle continue to chapters
    const handleContinueToChapters = useCallback(() => {
        if (!fileId) {
            toast.error("No document selected", {
                description: "Please select a document to continue.",
            });
            return;
        }

        if (!rounds || rounds.length === 0) {
            toast.error("No rounds available", {
                description: "Please parse the document into rounds first.",
            });
            return;
        }

        // Navigate to chapters step
        goToStep("CHAPTERS");
    }, [fileId, goToStep, rounds]);

    // Check if we need to automatically parse rounds
    useEffect(() => {
        if (fileId && !isLoadingRounds && (!rounds || rounds.length === 0) && !isParsingRounds) {
            handleParseRounds();
        }
    }, [fileId, handleParseRounds, isLoadingRounds, isParsingRounds, rounds]);

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
                        onClick={() => goToStep("UPLOAD")}
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
                        {selectedDocumentName || "Selected document"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleParseRounds}
                        disabled={isParsingRounds}
                    >
                        {isParsingRounds ? (
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
                                    disabled={isParsingRounds}
                                >
                                    {isParsingRounds ? (
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