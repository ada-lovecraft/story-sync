"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { ScrollArea } from "@/app/_components/ui/scroll-area";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { Badge } from "@/app/_components/ui/badge";
import { useWorkflow } from "@/app/_components/workflow/workflow-provider";
import { useWorkflowData } from "@/hooks/use-workflow-data";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { createLogger } from "@/lib/logger";

// Create logger but don't use the log variable to avoid linter warning
createLogger("clean-step");

interface CleanStepProps {
    onComplete?: () => void;
    onBack?: () => void;
}

// Define a type for the chat log to help with type safety
interface ChatLog {
    id: string;
    content: string;
    filename: string;
    hash: string;
    contentType: string;
    size: number;
    createdAt: Date;
    updatedAt: Date;
    lastStepNumber: number;
    cleanedContent: string | null;
}

export function CleanStep({ onComplete, onBack }: CleanStepProps) {
    const { activeFileId, goToStep, markStepComplete, setActiveFileId } = useWorkflow();
    const { workflowData, updateWorkflowData } = useWorkflowData();
    const [originalContent, setOriginalContent] = useState<string>("");
    const [cleanedContent, setCleanedContent] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState("side-by-side");

    // Get the selected document ID from either source, preferring workflowData
    const selectedDocumentId = workflowData.selectedDocumentId ?? activeFileId;

    // Ensure both state systems are synchronized
    useEffect(() => {
        if (selectedDocumentId) {
            // If we have a document ID in workflowData but not in workflow context, update the context
            if (workflowData.selectedDocumentId && !activeFileId) {
                // Update the workflow context
                // This is a side effect, but necessary for synchronization
                const { setActiveFileId } = useWorkflow();
                setActiveFileId(workflowData.selectedDocumentId);
            }
            // If we have a document ID in workflow context but not in workflowData, update workflowData
            else if (activeFileId && !workflowData.selectedDocumentId) {
                updateWorkflowData({
                    selectedDocumentId: activeFileId,
                });
            }
        }
    }, [workflowData.selectedDocumentId, activeFileId, updateWorkflowData]);

    // Add hook to check URL for chatLogId
    useEffect(() => {
        // Check if we have a URL parameter for chatLogId
        const params = new URLSearchParams(window.location.search);
        const urlChatLogId = params.get('chatLogId') || params.get('id');

        if (urlChatLogId && !selectedDocumentId) {
            // Update both state systems
            if (updateWorkflowData) {
                updateWorkflowData({
                    selectedDocumentId: urlChatLogId,
                });
            }

            if (setActiveFileId) {
                setActiveFileId(urlChatLogId);
            }
        }
    }, [selectedDocumentId, updateWorkflowData, setActiveFileId]);

    // Stats
    const [stats, setStats] = useState({
        originalLines: 0,
        cleanedLines: 0,
        originalSize: 0,
        cleanedSize: 0,
        reductionPercent: 0,
    });

    // Get the chat log data
    const chatLogQuery = api.workflow.getChatLogById.useQuery(
        { id: selectedDocumentId ?? "" },
        {
            enabled: !!selectedDocumentId,
            refetchOnWindowFocus: false,
        }
    );

    // Safely access the data with type assertion
    const chatLog = chatLogQuery.data as ChatLog | undefined;
    const isLoading = chatLogQuery.isLoading;

    // Save cleaned content mutation
    const saveCleanedContent = api.workflow.saveCleanedChatLog.useMutation({
        onSuccess: () => {
            toast.success("Cleaned content saved successfully");
            markStepComplete("CLEAN", true);
            if (onComplete) {
                onComplete();
            } else {
                goToStep("ROUNDS");
            }
        },
        onError: (error) => {
            toast.error(`Error saving cleaned content: ${error.message}`);
        },
    });

    // Process the content when it's loaded
    useEffect(() => {
        if (chatLog?.content && !isProcessing) {
            setOriginalContent(chatLog.content);
            processContent(chatLog.content);
        }
    }, [chatLog, isProcessing]);

    // Calculate stats when content changes
    useEffect(() => {
        if (originalContent && cleanedContent) {
            const originalLines = originalContent.split("\n").length;
            const cleanedLines = cleanedContent.split("\n").length;
            const originalSize = new Blob([originalContent]).size;
            const cleanedSize = new Blob([cleanedContent]).size;
            const reductionPercent = Math.round(
                ((originalSize - cleanedSize) / originalSize) * 100
            );

            setStats({
                originalLines,
                cleanedLines,
                originalSize,
                cleanedSize,
                reductionPercent,
            });
        }
    }, [originalContent, cleanedContent]);

    // Process the content to clean and format it
    const processContent = (content: string) => {
        setIsProcessing(true);

        try {
            // Implement the cleaning logic
            let processed = content;

            // Replace "You said:" with "<user>"
            processed = processed.replace(/^You said:/gm, "<user>");

            // Replace "ChatGPT said:" with "</user>\n<dungeon_master>"
            processed = processed.replace(/^ChatGPT said:/gm, "</user>\n<dungeon_master>");

            // Ensure the document starts with <user> if it doesn't already
            if (!processed.trim().startsWith("<user>")) {
                processed = "<user>\n" + processed;
            }

            // Ensure the document ends with </dungeon_master> if it doesn't already
            if (!processed.trim().endsWith("</dungeon_master>")) {
                processed = processed + "\n</dungeon_master>";
            }

            // Remove any lines that match specific patterns (if needed)
            // processed = processed.replace(/^Some pattern to remove$/gm, "");

            // Normalize multiple newlines to a maximum of two
            processed = processed.replace(/\n{3,}/g, "\n\n");

            setCleanedContent(processed);
        } catch (error) {
            console.error("Error processing content:", error);
            toast.error("Error processing content. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle save and continue
    const handleSaveAndContinue = () => {
        if (!selectedDocumentId) {
            toast.error("No file selected");
            return;
        }

        saveCleanedContent.mutate({
            id: selectedDocumentId,
            content: cleanedContent,
        });
    };

    // Handle back button
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            goToStep("UPLOAD");
        }
    };

    // Render loading state
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Clean & Format</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Render error state if no file is selected
    if (!selectedDocumentId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Clean & Format</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>No file selected. Please go back and select a file first.</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleBack} variant="outline">
                        Back
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Clean & Format</CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">
                        Original: {stats.originalLines} lines ({formatBytes(stats.originalSize)})
                    </Badge>
                    <Badge variant="outline">
                        Cleaned: {stats.cleanedLines} lines ({formatBytes(stats.cleanedSize)})
                    </Badge>
                    <Badge variant="secondary">
                        {stats.reductionPercent > 0
                            ? `${stats.reductionPercent}% reduction`
                            : "No reduction"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                        <TabsTrigger value="original">Original</TabsTrigger>
                        <TabsTrigger value="cleaned">Cleaned</TabsTrigger>
                    </TabsList>

                    <TabsContent value="side-by-side" className="w-full">
                        <div className="grid grid-cols-2 gap-4 h-[500px]">
                            <div className="border rounded-md">
                                <div className="p-2 bg-muted font-medium border-b">Original</div>
                                <ScrollArea className="h-[450px] p-4">
                                    <pre className="whitespace-pre-wrap font-mono text-sm">
                                        {originalContent}
                                    </pre>
                                </ScrollArea>
                            </div>
                            <div className="border rounded-md">
                                <div className="p-2 bg-muted font-medium border-b">Cleaned</div>
                                <ScrollArea className="h-[450px] p-4">
                                    <pre className="whitespace-pre-wrap font-mono text-sm">
                                        {cleanedContent}
                                    </pre>
                                </ScrollArea>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="original">
                        <div className="border rounded-md h-[500px]">
                            <div className="p-2 bg-muted font-medium border-b">Original</div>
                            <ScrollArea className="h-[450px] p-4">
                                <pre className="whitespace-pre-wrap font-mono text-sm">
                                    {originalContent}
                                </pre>
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    <TabsContent value="cleaned">
                        <div className="border rounded-md h-[500px]">
                            <div className="p-2 bg-muted font-medium border-b">Cleaned</div>
                            <ScrollArea className="h-[450px] p-4">
                                <pre className="whitespace-pre-wrap font-mono text-sm">
                                    {cleanedContent}
                                </pre>
                            </ScrollArea>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={handleBack} variant="outline">
                    Back
                </Button>
                <Button
                    onClick={handleSaveAndContinue}
                    disabled={isProcessing || saveCleanedContent.isPending}
                >
                    {saveCleanedContent.isPending ? "Saving..." : "Save & Continue"}
                </Button>
            </CardFooter>
        </Card>
    );
}

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
} 