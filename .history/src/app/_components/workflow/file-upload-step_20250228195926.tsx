"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/app/_components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { FileDropZone } from "@/app/_components/ui/file-drop-zone";
import { DocumentsTable, Document } from "@/app/_components/ui/documents-table";
import { Button } from "@/app/_components/ui/button";
import { api } from "@/trpc/react";
import { useWorkflowData } from "@/hooks/use-workflow-data";
import { computeFileHash, readFile } from "@/lib/file-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { createLogger } from "@/lib/logger";

const { log, err } = createLogger("file-upload-step");

export function FileUploadStep() {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [activeTab, setActiveTab] = useState<"upload" | "select">("upload");
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

    const { setNextEnabled, updateWorkflowData } = useWorkflowData();

    // TRPC queries and mutations
    const utils = api.useUtils();

    const { data: chatLogs, isLoading: isLoadingLogs } = api.workflow.getAllChatLogs.useQuery(
        undefined,
        {
            onSuccess: (data) => {
                log("Retrieved chat logs", { count: data.length });

                // Convert the chat logs from the API to our Document interface
                const docs: Document[] = data.map((log) => ({
                    id: log.id,
                    hash: log.hash,
                    name: log.filename,
                    size: log.size,
                    uploadDate: new Date(log.createdAt),
                    type: log.contentType,
                    status: "ready" as const
                }));

                setDocuments(docs);
            },
            onError: (error) => {
                err("Failed to load chat logs", { error });
                toast({
                    title: "Error loading documents",
                    description: "Could not load your previously uploaded documents.",
                    variant: "destructive",
                });
            }
        }
    );

    const uploadMutation = api.workflow.uploadChatLog.useMutation({
        onSuccess: (data) => {
            log("Successfully uploaded chat log", { id: data.id });
            setIsUploading(false);
            toast({
                title: "File uploaded",
                description: "Your file has been successfully uploaded.",
            });
            void utils.workflow.getAllChatLogs.invalidate();
        },
        onError: (error) => {
            err("Failed to upload chat log", { error });
            setIsUploading(false);
            toast({
                title: "Upload failed",
                description: error.message || "There was an error uploading your file.",
                variant: "destructive",
            });
        }
    });

    const deleteMutation = api.workflow.deleteChatLog.useMutation({
        onSuccess: () => {
            toast({
                title: "File deleted",
                description: "The file has been successfully deleted.",
            });
            void utils.workflow.getAllChatLogs.invalidate();

            // If the deleted document was the selected one, clear the selection
            if (selectedDocument && documents.find(d => d.id === selectedDocument.id) === undefined) {
                setSelectedDocument(null);
                setNextEnabled(false);
            }
        },
        onError: (error) => {
            err("Failed to delete chat log", { error });
            toast({
                title: "Error deleting file",
                description: error.message || "There was a problem deleting the file.",
                variant: "destructive",
            });
        }
    });

    // Handle file drop/upload
    const handleFileDrop = useCallback(async (file: File) => {
        try {
            setIsUploading(true);

            // Read the file content
            const content = await readFile(file);

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
                toast({
                    title: "File already exists",
                    description: "A file with the same content has already been uploaded.",
                    variant: "default",
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
            err("Error processing file upload", { error });
            toast({
                title: "Upload failed",
                description: "There was an error processing your file.",
                variant: "destructive",
            });
            setIsUploading(false);
        }
    }, [documents, toast, uploadMutation]);

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

    // Handle document deletion
    const handleDeleteDocument = useCallback((doc: Document) => {
        log("Deleting document", { id: doc.id });
        deleteMutation.mutate({ id: doc.id });
    }, [deleteMutation]);

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Upload or Select a Chat Log</CardTitle>
                    <CardDescription>
                        Upload a new chat log file or select a previously uploaded one to process
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upload" | "select")}>
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="upload">Upload New File</TabsTrigger>
                            <TabsTrigger value="select">
                                Select Existing File
                                {documents.length > 0 && ` (${documents.length})`}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upload" className="mt-4">
                            <FileDropZone
                                title="Drop your chat log file here"
                                description="or click to browse (.txt files up to 5MB)"
                                onFileDrop={handleFileDrop}
                                isLoading={isUploading}
                                maxSize={5 * 1024 * 1024} // 5MB
                                accept=".txt, text/plain"
                                maxHeight="250px"
                            />
                        </TabsContent>

                        <TabsContent value="select">
                            <DocumentsTable
                                documents={documents || []}
                                onSelectDocument={handleSelectDocument}
                                onDeleteDocument={handleDeleteDocument}
                                isLoading={isLoadingLogs}
                            />

                            {selectedDocument && (
                                <div className="mt-6 p-4 bg-muted rounded-md">
                                    <h3 className="font-medium">Selected File</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedDocument.name}
                                    </p>
                                    <div className="flex justify-end mt-4">
                                        <Button
                                            onClick={() => {
                                                setSelectedDocument(null);
                                                setNextEnabled(false);
                                                updateWorkflowData({
                                                    selectedDocumentId: undefined,
                                                    selectedDocumentName: undefined,
                                                });
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Clear Selection
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
} 