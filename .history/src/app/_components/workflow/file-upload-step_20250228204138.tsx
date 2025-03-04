/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { FileDropZone } from "@/app/_components/ui/file-drop-zone";
import { type Document, DocumentsTable } from "@/app/_components/ui/documents-table";
import { Button } from "@/app/_components/ui/button";
import { api } from "@/trpc/react";
import { useWorkflowData } from "@/hooks/use-workflow-data";
import { computeFileHash, readFile } from "@/lib/file-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { createLogger } from "@/lib/logger";
import { type RouterOutputs } from "@/trpc/react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/_components/ui/alert";

// Define types for chat logs from API
type ChatLog = RouterOutputs["workflow"]["getAllChatLogs"][number];

const logger = createLogger("file-upload-step");
// Type-safe logger functions
const log: (message: string, data?: Record<string, unknown>) => void = logger.log.bind(logger);
const err: (message: string, data?: Record<string, unknown>) => void = logger.err.bind(logger);

// Maximum file size limit in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Allowed file types
const ALLOWED_FILE_TYPES = [".txt", "text/plain", "application/json", "text/markdown"];

export function FileUploadStep() {
    const [isUploading, setIsUploading] = useState(false);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [activeTab, setActiveTab] = useState<"upload" | "select">("upload");
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const MAX_RETRIES = 3;

    const { setNextEnabled, updateWorkflowData } = useWorkflowData();

    // TRPC queries and mutations
    const utils = api.useUtils();

    // Handle document selection
    const handleSelectDocument = useCallback((doc: Document) => {
        log("Document selected", { id: doc.id, name: doc.name });
        setSelectedDocument(doc);

        // Update workflow data with the selected document
        updateWorkflowData({
            selectedDocumentId: doc.id,
            selectedDocumentName: doc.name,
        });

        // Enable the next button in the workflow
        setNextEnabled(true);

        // Switch to select tab to show selection
        setActiveTab("select");
    }, [setNextEnabled, updateWorkflowData, setActiveTab, setSelectedDocument]);

    // Get documents from the server with retry support
    const { data: chatLogsData, isLoading: isLoadingDocuments, error: chatLogsError, refetch } = api.workflow.getAllChatLogs.useQuery(undefined, {
        enabled: true,
        retry: MAX_RETRIES,
        retryDelay: (attempt) => Math.min(attempt * 1000, 5000), // Exponential backoff with 5s max
    });

    // Handle retry logic in useEffect
    useEffect(() => {
        if (chatLogsError && retryCount < MAX_RETRIES) {
            log("Retrying document load", { retryCount: retryCount + 1 });
            setRetryCount(prev => prev + 1);
            // Built-in retry will handle the actual retry
        }
    }, [chatLogsError, retryCount]);

    // Process chat logs data and update documents state
    useEffect(() => {
        if (chatLogsData && Array.isArray(chatLogsData)) {
            log("Documents loaded", { count: chatLogsData.length });
            setRetryCount(0); // Reset retry count on success

            try {
                const mappedDocuments: Document[] = chatLogsData.map((logItem: ChatLog) => ({
                    id: logItem.id,
                    hash: logItem.hash,
                    name: logItem.filename,
                    size: logItem.size,
                    uploadDate: new Date(String(logItem.updatedAt)),
                    type: logItem.contentType,
                    status: "ready" as const
                }));

                setDocuments(mappedDocuments);
                setValidationError(null);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                err("Error mapping documents", { error: errorMessage });
                toast.error("Failed to process document data. Please try again.");
            }
        }
    }, [chatLogsData]);

    // Handle error showing for chat logs loading
    useEffect(() => {
        if (chatLogsData === undefined && !isLoadingDocuments && !chatLogsError) {
            err("Error loading documents");
            toast.error("Failed to load documents. Please try again.");
        } else if (chatLogsError) {
            const errorMessage = chatLogsError instanceof Error
                ? chatLogsError.message
                : typeof chatLogsError === 'object' && chatLogsError !== null
                    ? JSON.stringify(chatLogsError)
                    : String(chatLogsError);

            err("TRPC error loading documents", { error: errorMessage });

            // Only show toast error if we've exceeded retry attempts
            if (retryCount >= MAX_RETRIES) {
                toast.error("Failed to load documents after multiple attempts", {
                    description: "Check your network connection and try again later.",
                    action: {
                        label: "Retry",
                        onClick: () => {
                            setRetryCount(0);
                            refetch();
                        }
                    }
                });
            }
        }
    }, [chatLogsData, isLoadingDocuments, chatLogsError, retryCount, refetch]);

    // Upload Mutation 
    const uploadMutation = api.workflow.uploadChatLog.useMutation({
        onSuccess: async (data) => {
            log("Upload successful", { id: data.id });
            toast.success("File uploaded successfully!", {
                description: `${data.filename} has been uploaded.`
            });
            setIsUploading(false);

            // Invalidate the query to refetch the documents
            await utils.workflow.getAllChatLogs.invalidate();

            // Select the newly created document
            const newDoc: Document = {
                id: data.id,
                hash: data.hash,
                name: data.filename,
                size: data.size,
                uploadDate: new Date(String(data.updatedAt)),
                type: data.contentType,
                status: "ready" as const
            };
            handleSelectDocument(newDoc);
        },
        onError: (error) => {
            err("Upload error", { error: error.message });
            toast.error("Upload failed", {
                description: error.message,
                action: {
                    label: "Try Again",
                    onClick: () => setActiveTab("upload")
                }
            });
            setIsUploading(false);
        }
    });

    // Delete Mutation
    const deleteMutation = api.workflow.deleteChatLog.useMutation({
        onSuccess: async (data) => {
            log("Document deleted", { id: data.id });
            toast.success("Document deleted!");

            // If the deleted document was selected, deselect it
            if (selectedDocument?.id === data.id) {
                setSelectedDocument(null);
                setNextEnabled(false);
            }

            // Refetch the documents
            await utils.workflow.getAllChatLogs.invalidate();
        },
        onError: (error) => {
            err("Delete error", { error: error.message });
            toast.error("Delete failed", { description: error.message });
        }
    });

    // Handle file upload
    const handleFileDrop = useCallback(async (file: File) => {
        setIsUploading(true);
        setValidationError(null);

        try {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                setValidationError(`File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
                setIsUploading(false);
                return;
            }

            // Validate file type if specified
            if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
                setValidationError(`File type ${file.type} is not supported. Please upload a text, JSON, or Markdown file.`);
                setIsUploading(false);
                return;
            }

            const content = await readFile(file);

            // Validate file content (basic check that it's not empty)
            if (!content || content.trim().length === 0) {
                setValidationError("File appears to be empty. Please upload a file with content.");
                setIsUploading(false);
                return;
            }

            // Compute a hash for the file
            const hash = await computeFileHash(file);

            log("Processing file upload", {
                name: file.name,
                size: file.size,
                hash
            });

            // Check if a file with the same hash already exists
            const existingDoc = documents.find(doc => doc.hash === hash);
            if (existingDoc) {
                toast("File already exists", {
                    description: "A file with the same content has already been uploaded."
                });
                setIsUploading(false);

                // Select the existing document
                handleSelectDocument(existingDoc);
                return;
            }

            // Upload the file to the server
            uploadMutation.mutate({
                filename: file.name,
                content,
                contentType: file.type || "text/plain",
                hash,
                size: file.size,
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            err("Error processing file upload", { error: errorMessage });
            toast.error("There was an error processing your file.", {
                description: errorMessage,
                action: {
                    label: "Try Again",
                    onClick: () => setActiveTab("upload")
                }
            });
            setIsUploading(false);
        }
    }, [documents, uploadMutation, handleSelectDocument]);

    // Handle document deletion
    const handleDeleteDocument = useCallback((doc: Document) => {
        log("Deleting document", { id: doc.id });
        deleteMutation.mutate({ id: doc.id });
    }, [deleteMutation]);

    // Handle retry button click
    const handleRetry = useCallback(() => {
        setRetryCount(0);
        refetch();
        toast("Retrying...", { description: "Attempting to reconnect to server" });
    }, [refetch]);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Upload or Select a Chat Log</CardTitle>
                    <CardDescription>
                        Upload a new file or select a previously uploaded file to process
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Show validation errors if any */}
                    {validationError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>{validationError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Show retry button if retries exhausted */}
                    {retryCount >= MAX_RETRIES && chatLogsError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertTitle>Connection Error</AlertTitle>
                            <AlertDescription className="flex items-center justify-between">
                                <span>Failed to connect to server after multiple attempts.</span>
                                <Button variant="outline" size="sm" onClick={handleRetry}>
                                    Retry Connection
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    <Tabs defaultValue="upload" value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "select")}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="upload">Upload New File</TabsTrigger>
                            <TabsTrigger value="select">
                                Select Existing File
                                {isLoadingDocuments && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload">
                            <FileDropZone
                                onFileDrop={handleFileDrop}
                                isLoading={isUploading}
                                maxSize={MAX_FILE_SIZE}
                                accept={ALLOWED_FILE_TYPES.join(",")}
                                title="Drop your chat log file here"
                                description="or click to browse files"
                            />
                        </TabsContent>
                        <TabsContent value="select">
                            {isLoadingDocuments ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="ml-2 text-sm text-muted-foreground">
                                        Loading documents...
                                    </span>
                                </div>
                            ) : documents.length > 0 ? (
                                <DocumentsTable
                                    documents={documents}
                                    onSelectDocument={handleSelectDocument}
                                    onDeleteDocument={handleDeleteDocument}
                                    isLoading={isLoadingDocuments}
                                />
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No documents found.</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => setActiveTab("upload")}
                                        className="mt-4"
                                    >
                                        Upload a file
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
} 