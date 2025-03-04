"use client";

import { useState } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/_components/ui/table";
import { Button } from "@/app/_components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Trash2,
    Calendar,
    RefreshCw
} from "lucide-react";
import { Badge } from "@/app/_components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/app/_components/ui/tooltip";

// Document type representing the structure of an uploaded file
export interface Document {
    id: string;
    hash: string;
    name: string;
    size: number;
    uploadDate: Date;
    type: string;
    status: "ready" | "processing" | "error";
}

interface DocumentsTableProps {
    documents: Document[];
    onSelectDocument: (document: Document) => void;
    onDeleteDocument?: (document: Document) => void;
    onRefreshDocument?: (document: Document) => void;
    isLoading?: boolean;
}

export function DocumentsTable({
    documents,
    onSelectDocument,
    onDeleteDocument,
    onRefreshDocument,
    isLoading = false,
}: DocumentsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: "uploadDate", desc: true },
    ]);

    // Format file size in a human-readable way
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Format date in a human-readable way
    const formatDate = (date: Date): string => {
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
        }).format(date);
    };

    // Table column definitions
    const columns: ColumnDef<Document>[] = [
        {
            accessorKey: "name",
            header: "Filename",
            cell: ({ row }) => (
                <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{row.original.name}</span>
                </div>
            ),
        },
        {
            accessorKey: "size",
            header: "Size",
            cell: ({ row }) => formatFileSize(row.original.size),
        },
        {
            accessorKey: "uploadDate",
            header: "Upload Date",
            cell: ({ row }) => (
                <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(row.original.uploadDate)}</span>
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;

                return (
                    <Badge
                        variant={
                            status === "ready"
                                ? "default"
                                : status === "processing"
                                    ? "outline"
                                    : "destructive"
                        }
                    >
                        {status === "ready"
                            ? "Ready"
                            : status === "processing"
                                ? "Processing"
                                : "Error"}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const document = row.original;

                return (
                    <div className="flex items-center space-x-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onRefreshDocument) onRefreshDocument(document);
                                        }}
                                        disabled={!onRefreshDocument || document.status === "processing"}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Refresh Status</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onDeleteDocument) onDeleteDocument(document);
                                        }}
                                        disabled={!onDeleteDocument}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Delete Document</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                );
            },
        },
    ];

    // Initialize the table
    const table = useReactTable({
        data: documents,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
        initialState: {
            pagination: {
                pageSize: 5,
            },
        },
    });

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    <div className="flex justify-center items-center">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="ml-2">Loading documents...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    onClick={() => onSelectDocument(row.original)}
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No documents found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {table.getState().pagination.pageSize * table.getState().pagination.pageIndex + 1} to{" "}
                    {Math.min(
                        table.getState().pagination.pageSize * (table.getState().pagination.pageIndex + 1),
                        documents.length
                    )}{" "}
                    of {documents.length} documents
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
} 