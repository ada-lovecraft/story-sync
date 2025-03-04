"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "../_components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../_components/ui/card";
import { Button } from "../_components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../_components/ui/alert";
import { Badge } from "../_components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../_components/ui/table";

// Inline simplified loading spinner to avoid import issues
function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
    };

    return (
        <Loader2
            className={`animate-spin text-muted-foreground ${sizeClasses[size]} ${className}`}
        />
    );
}

export default function RoundsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatLogId = searchParams?.get("chatLogId") ?? "";
    const [isParsingLoading, setIsParsingLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch chat log details
    const chatLogQuery = api.workflow.getChatLogById.useQuery({
        id: chatLogId,
    });

    // Fetch rounds
    const roundsQuery = api.workflow.getRounds.useQuery({
        chatLogId,
    });

    // Mutation for parsing rounds
    const parseRoundsMutation = api.workflow.parseRounds.useMutation({
        onSuccess: () => {
            setSuccessMessage("Rounds parsed successfully!");
            setErrorMessage(null);
            setIsParsingLoading(false);
            void roundsQuery.refetch();
        },
        onError: (error) => {
            // Safely handle error message
            const message = error && typeof error === 'object' && 'message' in error
                ? String(error.message)
                : "Failed to parse rounds";
            setErrorMessage(message);
            setSuccessMessage(null);
            setIsParsingLoading(false);
        },
    });

    const handleParseRounds = () => {
        setIsParsingLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        parseRoundsMutation.mutate({
            chatLogId,
        });
    };

    const handleContinue = () => {
        router.push(`/chapters?chatLogId=${chatLogId}`);
    };

    // Calculate statistics
    const rounds = roundsQuery.data ?? [];
    const totalRounds = rounds.length;
    const totalLines = rounds.reduce((sum, round) => {
        // Check if lineCount exists and is a number
        if (round && typeof round.lineCount === 'number') {
            return sum + round.lineCount;
        }
        return sum;
    }, 0);
    const avgLinesPerRound = totalRounds > 0 ? Math.round(totalLines / totalRounds) : 0;

    return (
        <MainLayout>
            <div className="container mx-auto py-6">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Parse Rounds</CardTitle>
                        <CardDescription>
                            Parse a chat log into rounds for further processing
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {chatLogQuery.isLoading ? (
                            <div className="flex justify-center py-4">
                                <LoadingSpinner />
                            </div>
                        ) : chatLogQuery.error ? (
                            <Alert variant="destructive">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {chatLogQuery.error && typeof chatLogQuery.error === 'object' && 'message' in chatLogQuery.error
                                        ? String(chatLogQuery.error.message)
                                        : "Error loading chat log"}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-medium">File Information</h3>
                                    <p>Filename: {chatLogQuery.data?.filename}</p>
                                    <div className="flex items-center gap-2">
                                        <span>Status:</span>
                                        <Badge>{chatLogQuery.data?.cleanedContent ? "Cleaned" : "Not Cleaned"}</Badge>
                                    </div>
                                    {!chatLogQuery.data?.cleanedContent && (
                                        <Alert className="mt-2">
                                            <AlertTitle>Cleaning Required</AlertTitle>
                                            <AlertDescription>
                                                This chat log needs to be cleaned before you can parse rounds.
                                                <Button
                                                    variant="link"
                                                    className="p-0 ml-1"
                                                    onClick={() => router.push(`/clean?chatLogId=${chatLogId}`)}
                                                >
                                                    Go to cleaning page
                                                </Button>
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                <div className="flex space-x-4">
                                    <Button
                                        onClick={handleParseRounds}
                                        disabled={isParsingLoading || !chatLogQuery.data?.cleanedContent}
                                    >
                                        {isParsingLoading ? <LoadingSpinner size="sm" /> : "Parse Rounds"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleContinue}
                                        disabled={totalRounds === 0}
                                    >
                                        Continue to Chapters
                                    </Button>
                                </div>

                                {errorMessage && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{errorMessage}</AlertDescription>
                                    </Alert>
                                )}

                                {successMessage && (
                                    <Alert>
                                        <AlertTitle>Success</AlertTitle>
                                        <AlertDescription>{successMessage}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {roundsQuery.isLoading ? (
                    <div className="flex justify-center py-4">
                        <LoadingSpinner />
                    </div>
                ) : rounds.length > 0 ? (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Round Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="rounded-lg border p-4">
                                        <h3 className="text-sm font-medium text-gray-500">Total Rounds</h3>
                                        <p className="mt-1 text-2xl font-semibold">{totalRounds}</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <h3 className="text-sm font-medium text-gray-500">Total Lines</h3>
                                        <p className="mt-1 text-2xl font-semibold">{totalLines}</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <h3 className="text-sm font-medium text-gray-500">Avg. Lines/Round</h3>
                                        <p className="mt-1 text-2xl font-semibold">{avgLinesPerRound}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Rounds</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Round</TableHead>
                                            <TableHead>Start Line</TableHead>
                                            <TableHead>End Line</TableHead>
                                            <TableHead>Line Count</TableHead>
                                            <TableHead>Character Count</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rounds.map((round, index) => (
                                            <TableRow key={round.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{round.startLine}</TableCell>
                                                <TableCell>{round.endLine}</TableCell>
                                                <TableCell>{round.lineCount}</TableCell>
                                                <TableCell>{round.characterCount}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <Card>
                        <CardContent className="py-6">
                            <p className="text-center text-gray-500">No rounds parsed yet. Click &quot;Parse Rounds&quot; to begin.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
} 