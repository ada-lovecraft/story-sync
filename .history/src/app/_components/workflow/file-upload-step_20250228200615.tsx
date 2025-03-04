"use client";

import { useState, useCallback, useEffect } from "react";
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

    // Get documents from the server
    const { data: chatLogsData, isLoading: isLoadingDocuments } = api.workflow.getAllChatLogs.useQuery(undefined, {
        enabled: true
    });

    // Process chat logs data and update documents state
    useEffect(() => {
        if (chatLogsData) {
            log("Documents loaded", { count: chatLogsData.length });
            setDocuments(
                chatLogsData.map(log => {
                    return {
                        id: log.id,
                        hash: log.hash,
                        name: log.filename,
                        size: log.size,
                        date: new Date(log.createdAt),
                        uploadDate: new Date(log.createdAt),
                        type: log.contentType,
                        status: "ready"
                    };
                })
            );
        }
    }, [chatLogsData]);

    // Handle error showing for chat logs loading
    useEffect(() => {
        if (chatLogsData === undefined && !isLoadingDocuments) {
            err("Error loading documents");
            toast({
                title: "Error",
                description: "Failed to load documents. Please try again.",
                variant: "destructive",
            });
        }
    }, [chatLogsData, isLoadingDocuments, toast]);

    // Upload file mutation
    const uploadMutation = api.workflow.uploadChatLog.useMutation({
        onSuccess: () => {
            log("File uploaded successfully");
            // Refresh the document list
            void utils.workflow.getAllChatLogs.invalidate();
            setIsUploading(false);
            toast({
                title: "Success",
                description: "Your file has been uploaded successfully.",
                variant: "default",
            });
        },
        onError: (error) => {
            err("Upload error", { error });
            toast({
                title: "Upload failed",
                description: "There was an error uploading your file.",
                variant: "destructive",
            });
            setIsUploading(false);
        }
    });

    // Delete document mutation
    const deleteMutation = api.workflow.deleteChatLog.useMutation({
        onSuccess: () => {
            log("Document deleted successfully");
            // Refresh the document list
            void utils.workflow.getAllChatLogs.invalidate();
            toast({
                title: "Success",
                description: "The document has been deleted.",
                variant: "default",
            });
            // If the deleted document was selected, clear the selection
            if (selectedDocument && selectedDocument.id === selectedDocument.id) {
                setSelectedDocument(null);
                setNextEnabled(false);
                updateWorkflowData({
                    selectedDocumentId: undefined,
                    selectedDocumentName: undefined,
                });
            }
        },
        onError: (error) => {
            err("Delete error", { error });
            toast({
                title: "Error",
                description: "Failed to delete the document.",
                variant: "destructive",
            });
        }
    });

    // Handle file drop
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
    }, [documents, toast, uploadMutation, handleSelectDocument]);

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
                                isLoading={isLoadingDocuments}
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