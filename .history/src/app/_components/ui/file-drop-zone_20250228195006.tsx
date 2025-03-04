"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Upload, File as FileIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileDropZoneProps {
    title?: string;
    description?: string;
    maxSize?: number; // max file size in bytes
    accept?: string;
    onFileDrop: (file: File) => void;
    isLoading?: boolean;
    className?: string;
    maxHeight?: string;
}

export function FileDropZone({
    title = "Drop your file here",
    description = "or click to browse",
    maxSize = 5 * 1024 * 1024, // 5MB default
    accept = ".txt, text/plain",
    onFileDrop,
    isLoading = false,
    className,
    maxHeight = "200px",
}: FileDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper function to format bytes
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const processFile = useCallback((file: File) => {
        // Check file size
        if (file.size > maxSize) {
            setError(`File is too large. Maximum size is ${formatBytes(maxSize)}.`);
            return;
        }

        // Check file type (basic check)
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (fileExt !== 'txt' && file.type !== 'text/plain') {
            setError("Only text files are accepted.");
            return;
        }

        // Pass the file to the parent component
        onFileDrop(file);
    }, [maxSize, onFileDrop, formatBytes]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setError(null);

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        if (file) {
            processFile(file);
        }
    }, [processFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        setError(null);

        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (file) {
            processFile(file);
        }

        // Reset the input so onChange will trigger even if selecting the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [processFile]);

    const handleClick = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    return (
        <Card className={cn(
            "w-full border-2 border-dashed",
            isDragging ? "border-primary bg-muted/20" : "border-muted",
            className
        )}>
            <CardContent className="p-0">
                <div
                    className={cn(
                        "flex flex-col items-center justify-center p-6 space-y-4 text-center",
                        `max-h-[${maxHeight}]`
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    style={{ cursor: 'pointer' }}
                >
                    {error ? (
                        <>
                            <AlertCircle className="w-10 h-10 text-destructive" />
                            <div>
                                <p className="font-medium text-destructive">{error}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Please try again with a valid file.
                                </p>
                            </div>
                        </>
                    ) : isLoading ? (
                        <>
                            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <div>
                                <p className="font-medium">Processing file...</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This may take a moment.
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-muted-foreground" />
                            <div>
                                <p className="font-medium">{title}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {description}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2">
                                <FileIcon className="w-4 h-4 mr-2" />
                                Select File
                            </Button>
                        </>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={handleFileInput}
                        disabled={isLoading}
                    />
                </div>
            </CardContent>
        </Card>
    );
} 