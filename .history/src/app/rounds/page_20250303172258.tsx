"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "../_components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../_components/ui/card";
import { Button } from "../_components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { LoadingSpinner } from "../_components/ui/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "../_components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../_components/ui/table";
import { ScrollArea } from "../_components/ui/scroll-area";
import { Badge } from "../_components/ui/badge";

export default function RoundsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatLogId = searchParams.get("id");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isParsingLoading, setIsParsingLoading] = useState(false);

    // Query to get chat log details
    const chatLogQuery = api.workflow.getChatLogById.useQuery(
        { id: chatLogId ?? "" },
        { enabled: !!chatLogId }
    );

    // Query to get rounds if they exist
    const roundsQuery = api.workflow.getRounds.useQuery(
        { chatLogId: chatLogId ?? "" },
        { enabled: !!chatLogId }
    );

    // Mutation to parse rounds
    const parseRoundsMutation = api.workflow.parseRounds.useMutation({
        onSuccess: () => {
            setSuccess(true);
            setIsParsingLoading(false);
            // Refetch rounds after parsing
            void roundsQuery.refetch();
        },
        onError: (error) => {
            setError(error.message);
            setIsParsingLoading(false);
        },
    });

    // Handle parse rounds button click
    const handleParseRounds = async () => {
        if (!chatLogId) return;
        setError(null);
        setSuccess(false);
        setIsParsingLoading(true);

        try {
            await parseRoundsMutation.mutateAsync({ chatLogId });
        } catch (err) {
            console.error("Failed to parse rounds:", err);
            setError(err instanceof Error ? err.message : "Unknown error occurred");
            setIsParsingLoading(false);
        }
    };

    // Handle continue to next step
    const handleContinue = () => {
        if (chatLogId) {
            router.push(`/chapters?id=${chatLogId}`);
        }
    };

    // Calculate statistics if rounds are available
    const totalRounds = roundsQuery.data?.length ?? 0;
    const totalLines = roundsQuery.data?.reduce((sum, round) => {
        return sum + (typeof round.lineCount === 'number' ? round.lineCount : 0);
    }, 0) ?? 0;
    const averageLinesPerRound = totalRounds > 0 ? (totalLines / totalRounds).toFixed(2) : "0";

    // Loading state
    const isLoading = chatLogQuery.isLoading || roundsQuery.isLoading || isParsingLoading;

    return (
        <MainLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Parse Rounds</h1>
                    <p className="text-muted-foreground">
                        Parse the cleaned chat log into rounds of conversation.
                    </p>
                </div>

                {isLoading && (
                    <div className="flex justify-center p-8">
                        <LoadingSpinner size="lg" />
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="bg-green-500/10 text-green-500 dark:bg-green-900/20">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>Rounds have been successfully parsed.</AlertDescription>
                    </Alert>
                )}

                {!chatLogId && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>No chat log ID provided. Please go back to the document selection page.</AlertDescription>
                    </Alert>
                )}

                {chatLogId && !isLoading && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>Parse Rounds</CardTitle>
                                <CardDescription>
                                    Extract rounds from the cleaned chat log. A round consists of a user message followed by a dungeon master message.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            File: <span className="font-medium">{chatLogQuery.data?.filename}</span>
                                        </p>
                                    </div>
                                    <div className="space-x-2">
                                        <Button
                                            variant="default"
                                            onClick={handleParseRounds}
                                            disabled={isParsingLoading || !chatLogQuery.data?.cleanedContent}
                                        >
                                            {isParsingLoading ? (
                                                <>
                                                    <LoadingSpinner size="sm" className="mr-2" />
                                                    Parsing...
                                                </>
                                            ) : (
                                                "Parse Rounds"
                                            )}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={handleContinue}
                                            disabled={totalRounds === 0}
                                        >
                                            Continue to Chapters
                                        </Button>
                                    </div>
                                </div>

                                {totalRounds > 0 && (
                                    <Card className="bg-muted/40">
                                        <CardHeader>
                                            <CardTitle>Round Statistics</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground">Total Rounds</p>
                                                    <p className="text-2xl font-bold">{totalRounds}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground">Total Lines</p>
                                                    <p className="text-2xl font-bold">{totalLines}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-muted-foreground">Avg. Lines per Round</p>
                                                    <p className="text-2xl font-bold">{averageLinesPerRound}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {totalRounds > 0 && (
                                    <div>
                                        <h3 className="text-lg font-medium mb-2">Rounds</h3>
                                        <ScrollArea className="h-[400px] rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Round #</TableHead>
                                                        <TableHead>Lines</TableHead>
                                                        <TableHead>Characters</TableHead>
                                                        <TableHead>Line Range</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {roundsQuery.data?.map((round) => (
                                                        <TableRow key={round.id}>
                                                            <TableCell className="font-medium">{round.roundNumber}</TableCell>
                                                            <TableCell>{round.lineCount}</TableCell>
                                                            <TableCell>{round.characterCount}</TableCell>
                                                            <TableCell>{round.startLine + 1}-{round.endLine + 1}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </MainLayout>
    );
} 