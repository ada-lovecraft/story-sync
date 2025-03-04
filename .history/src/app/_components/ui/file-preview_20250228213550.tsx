"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { Button } from "@/app/_components/ui/button";
import { Eye, Check, X, ChevronRight, ChevronLeft } from "lucide-react";
import { createLogger } from "@/lib/logger";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/app/_components/ui/scroll-area";

const { log, err } = createLogger("file-preview");

// Default number of lines to show in preview mode
const DEFAULT_PREVIEW_LINES = 50;

interface FilePreviewProps {
    file: File;
    content: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function FilePreview({ file, content, onConfirm, onCancel }: FilePreviewProps) {
    const [previewContent, setPreviewContent] = useState<string>("");
    const [isFullPreview, setIsFullPreview] = useState(false);
    const [previewType, setPreviewType] = useState<"raw" | "formatted">("raw");
    const [parsedJsonContent, setParsedJsonContent] = useState<string>("");
    const [jsonParseError, setJsonParseError] = useState<string | null>(null);

    // Calculate file type from file object
    const fileType = getFileType(file);

    // Prepare preview content based on file size/type
    useEffect(() => {
        if (!content) return;

        try {
            // If JSON, try to parse and format it
            if (fileType === "json") {
                try {
                    const parsedJson = JSON.parse(content);
                    setParsedJsonContent(JSON.stringify(parsedJson, null, 2));
                    setJsonParseError(null);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    setJsonParseError(`Invalid JSON: ${errorMessage}`);
                    err("JSON parse error", { error: errorMessage });
                }
            }

            // For initial preview, only show a subset of lines
            if (!isFullPreview) {
                const lines = content.split("\n");
                const previewLines = lines.slice(0, DEFAULT_PREVIEW_LINES).join("\n");
                setPreviewContent(
                    lines.length > DEFAULT_PREVIEW_LINES
                        ? `${previewLines}\n\n... (${lines.length - DEFAULT_PREVIEW_LINES} more lines)`
                        : content
                );
            } else {
                setPreviewContent(content);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            err("Error preparing preview content", { error: errorMessage });
            setPreviewContent("Error preparing preview content");
        }
    }, [content, isFullPreview, fileType]);

    // Toggle between truncated and full preview
    const toggleFullPreview = () => {
        setIsFullPreview(!isFullPreview);
        log("Toggled full preview", { isFullPreview: !isFullPreview });
    };

    return (
        <Card className="w-full border border-border">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-medium">Preview: {file.name}</h3>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB · {getFileTypeDisplayName(fileType)}
                    </div>
                </div>

                {/* Tabs for different preview modes */}
                {fileType !== "plain" && (
                    <Tabs defaultValue="raw" value={previewType} onValueChange={(v) => setPreviewType(v as "raw" | "formatted")}>
                        <TabsList className="w-full grid grid-cols-2 h-9">
                            <TabsTrigger value="raw">Raw</TabsTrigger>
                            <TabsTrigger value="formatted">
                                {fileType === "json" ? "JSON" : "Markdown"}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="raw" className="mt-2">
                            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                                    {previewContent}
                                </pre>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="formatted" className="mt-2">
                            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                                {fileType === "json" ? (
                                    jsonParseError ? (
                                        <div className="text-sm text-destructive">{jsonParseError}</div>
                                    ) : (
                                        <pre className="text-sm font-mono whitespace-pre-wrap break-words language-json">
                                            {parsedJsonContent}
                                        </pre>
                                    )
                                ) : fileType === "markdown" ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{previewContent}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <pre className="text-sm font-mono">{previewContent}</pre>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                )}

                {/* Plain text preview (no tabs) */}
                {fileType === "plain" && (
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                            {previewContent}
                        </pre>
                    </ScrollArea>
                )}

                {/* Show more/less toggle button */}
                <div className="flex justify-center">
                    <Button variant="ghost" size="sm" onClick={toggleFullPreview}>
                        {isFullPreview ? (
                            <>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Show less
                            </>
                        ) : (
                            <>
                                Show more <ChevronRight className="h-4 w-4 ml-1" />
                            </>
                        )}
                    </Button>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end space-x-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={onConfirm}>
                        <Check className="h-4 w-4 mr-1" /> Upload File
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// Helper function to determine file type
function getFileType(file: File): "plain" | "json" | "markdown" {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (extension === "json" || mimeType === "application/json") {
        return "json";
    } else if (
        extension === "md" ||
        extension === "markdown" ||
        mimeType === "text/markdown"
    ) {
        return "markdown";
    }

    return "plain";
}

// Get display name for file type
function getFileTypeDisplayName(type: "plain" | "json" | "markdown"): string {
    switch (type) {
        case "json":
            return "JSON";
        case "markdown":
            return "Markdown";
        default:
            return "Plain Text";
    }
} 