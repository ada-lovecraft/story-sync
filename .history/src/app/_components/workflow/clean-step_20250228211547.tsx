"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { ScrollArea } from "@/app/_components/ui/scroll-area";
import { Skeleton } from "@/app/_components/ui/skeleton";
import { Badge } from "@/app/_components/ui/badge";
import { useWorkflow } from "@/app/_components/workflow/workflow-provider";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { createLogger } from "@/lib/logger";

const { log } = createLogger("clean-step");

interface CleanStepProps {
    onComplete?: () => void;
    onBack?: () => void;
}

export function CleanStep({ onComplete, onBack }: CleanStepProps) {
    const { activeFileId, completeStepAndContinue } = useWorkflow();
    const [originalContent, setOriginalContent] = useState<string>("");
    const [cleanedContent, setCleanedContent] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState("side-by-side");

    // Stats
    const [stats, setStats] = useState({
        originalLines: 0,
        cleanedLines: 0,
        originalSize: 0,
        cleanedSize: 0,
        reductionPercent: 0,
    });

    // Get the chat log data
    const { data: chatLog, isLoading } = api.workflow.getChatLog.useQuery(
        { id: activeFileId || "" },
        {
            enabled: !!activeFileId,
            refetchOnWindowFocus: false,
        }
    );

    // Save cleaned content mutation
    const saveCleanedContent = api.workflow.saveCleanedChatLog.useMutation({
        onSuccess: () => {
            toast.success("Cleaned content saved successfully");
            if (onComplete) {
                onComplete();
            } else {
                void completeStepAndContinue("CLEAN");
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
    }, [chatLog]);

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
        if (!activeFileId) {
            toast.error("No file selected");
            return;
        }

        saveCleanedContent.mutate({
            id: activeFileId,
            content: cleanedContent,
        });
    };

    // Handle back button
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            // Use the workflow navigation
            // This would typically go back to the upload step
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
    if (!activeFileId) {
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
                    <Badge variant={stats.reductionPercent > 0 ? "success" : "secondary"}>
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
                    disabled={isProcessing || saveCleanedContent.isLoading}
                >
                    {saveCleanedContent.isLoading ? "Saving..." : "Save & Continue"}
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