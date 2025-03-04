import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// Schema for chat logs
export const chatLogSchema = z.object({
    id: z.string(),
    content: z.string(),
    filename: z.string(),
    hash: z.string(),
    contentType: z.string(),
    size: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
    lastStepNumber: z.number().default(1),
    cleanedContent: z.string().optional(),
});

// Schema for cleaned chat logs
export const cleanedChatLogSchema = z.object({
    id: z.string(),
    content: z.string(),
    filename: z.string(),
});

// Schema for rounds
export const roundSchema = z.object({
    id: z.string(),
    content: z.string(),
    chatLogId: z.string(),
    roundNumber: z.number(),
});

// Schema for chapters
export const chapterSchema = z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    roundId: z.string(),
    chapterNumber: z.number(),
});

export type ChatLog = z.infer<typeof chatLogSchema>;
export type CleanedChatLog = z.infer<typeof cleanedChatLogSchema>;
export type Round = z.infer<typeof roundSchema>;
export type Chapter = z.infer<typeof chapterSchema>;

export const workflowRouter = createTRPCRouter({
    // Get all chat logs
    getAllChatLogs: publicProcedure
        .query(async ({ ctx }) => {
            try {
                const chatLogs = await ctx.db.chatLog.findMany({
                    orderBy: { updatedAt: "desc" },
                });

                return chatLogs;
            } catch (error) {
                console.error("Error fetching chat logs:", error instanceof Error ? error.message : String(error));
                throw new Error("Failed to fetch chat logs. Please try again.");
            }
        }),

    // Get a specific chat log by ID
    getChatLogById: publicProcedure
        .input(z.object({
            id: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            try {
                return await ctx.db.chatLog.findUnique({
                    where: { id: input.id },
                });
            } catch (error) {
                console.error("Error fetching chat log:", error instanceof Error ? error.message : String(error));
                throw new Error(`Failed to fetch chat log with ID ${input.id}`);
            }
        }),

    // Upload a new chat log
    uploadChatLog: publicProcedure
        .input(z.object({
            filename: z.string(),
            content: z.string(),
            hash: z.string(),
            contentType: z.string().default("text/plain"),
            size: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if a file with the same hash already exists
            const existingLog = await ctx.db.chatLog.findFirst({
                where: { hash: input.hash },
            });

            if (existingLog) {
                return existingLog;
            }

            // Create a new chat log record
            return await ctx.db.chatLog.create({
                data: {
                    filename: input.filename,
                    content: input.content,
                    hash: input.hash,
                    contentType: input.contentType,
                    size: input.size,
                },
            });
        }),

    // Delete a chat log
    deleteChatLog: publicProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Delete all associated rounds and chapters first
            const rounds = await ctx.db.round.findMany({
                where: { chatLogId: input.id },
            });

            for (const round of rounds) {
                await ctx.db.chapter.deleteMany({
                    where: { roundId: round.id },
                });
            }

            await ctx.db.round.deleteMany({
                where: { chatLogId: input.id },
            });

            // Then delete the chat log
            return await ctx.db.chatLog.delete({
                where: { id: input.id },
            });
        }),

    // Save cleaned chat log
    saveCleanedChatLog: publicProcedure
        .input(z.object({
            id: z.string(),
            content: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check if the chat log exists
            const chatLog = await ctx.db.chatLog.findUnique({
                where: { id: input.id },
            });

            if (!chatLog) {
                throw new Error("Chat log not found");
            }

            // Update the chat log with cleaned content
            return await ctx.db.chatLog.update({
                where: { id: input.id },
                data: {
                    cleanedContent: input.content,
                    lastStepNumber: 2, // Set step to cleaned content
                },
            });
        }),

    // Update workflow step
    updateWorkflowStep: publicProcedure
        .input(z.object({
            chatLogId: z.string(),
            stepNumber: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.chatLog.update({
                where: { id: input.chatLogId },
                data: {
                    lastStepNumber: input.stepNumber,
                },
            });
        }),

    // Parse rounds from cleaned chat log
    parseRounds: publicProcedure
        .input(z.object({
            chatLogId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                // Get the chat log with cleaned content
                const chatLog = await ctx.db.chatLog.findUnique({
                    where: { id: input.chatLogId },
                });

                if (!chatLog) {
                    throw new Error("Chat log not found");
                }

                if (!chatLog.cleanedContent) {
                    throw new Error("Chat log does not have cleaned content");
                }

                // Delete any existing rounds for this chat log
                await ctx.db.round.deleteMany({
                    where: { chatLogId: input.chatLogId },
                });

                // Get the cleaned content
                const cleanedContent = chatLog.cleanedContent as string;

                // Try multiple patterns to detect rounds
                let roundChunks: { content: string; roundNumber: number }[] = [];
                let bestChunks: string[] = [];

                // Try standard "Round X:" format
                const standardPattern = cleanedContent.split(/(?=Round \d+:)/i);

                // Try "Round X" without colon
                const withoutColonPattern = cleanedContent.split(/(?=Round \d+\b(?!:))/i);

                // Try "#X" or "# X" format
                const hashPattern = cleanedContent.split(/(?=#\s*\d+\b)/i);

                // Question/Answer pattern
                const qaPattern = cleanedContent.split(/(?=Q:)/i);

                // Human/Assistant pattern
                const humanAssistantPattern = cleanedContent.split(/(?=Human:)|(?=Assistant:)/i);

                // Choose the pattern that gives us the most non-empty chunks
                const patterns = [
                    standardPattern,
                    withoutColonPattern,
                    hashPattern,
                    qaPattern,
                    humanAssistantPattern
                ];

                for (const pattern of patterns) {
                    // Filter out empty chunks
                    const nonEmptyChunks = pattern.filter(chunk => chunk.trim().length > 0);
                    if (nonEmptyChunks.length > bestChunks.length) {
                        bestChunks = nonEmptyChunks;
                    }
                }

                // If we found reasonable chunks, convert them to rounds
                if (bestChunks.length > 1) {
                    // Process each chunk into a round
                    roundChunks = bestChunks.map((chunk, index) => {
                        // Try to extract round number from text
                        let roundNumber = index + 1;

                        // Look for round number in text
                        const roundMatch = chunk.match(/Round (\d+)|#\s*(\d+)/i);
                        if (roundMatch) {
                            // Use the first captured group that isn't undefined
                            const capturedGroup = roundMatch[1] !== undefined ? roundMatch[1] :
                                (roundMatch[2] !== undefined ? roundMatch[2] : null);

                            if (capturedGroup !== null) {
                                const parsed = parseInt(capturedGroup, 10);
                                if (!isNaN(parsed)) {
                                    roundNumber = parsed;
                                }
                            }
                        }

                        return {
                            content: chunk.trim(),
                            roundNumber
                        };
                    });
                } else if (cleanedContent.trim().length > 0) {
                    // If we couldn't split by rounds but have content,
                    // try to split by paragraph breaks or just create one round
                    const paragraphs = cleanedContent.split(/\n\n+/).filter(p => p.trim().length > 0);

                    if (paragraphs.length > 1) {
                        // Use paragraphs as rounds
                        roundChunks = paragraphs.map((para, index) => ({
                            content: para.trim(),
                            roundNumber: index + 1
                        }));
                    } else {
                        // Just one round with all content
                        roundChunks = [{
                            content: cleanedContent.trim(),
                            roundNumber: 1
                        }];
                    }
                }

                // Create round records
                const rounds = [];
                for (let i = 0; i < roundChunks.length; i++) {
                    const round = await ctx.db.round.create({
                        data: {
                            content: roundChunks[i].content,
                            roundNumber: roundChunks[i].roundNumber,
                            chatLogId: input.chatLogId,
                        },
                    });
                    rounds.push(round);
                }

                // Update the chat log to mark this step as complete
                await ctx.db.chatLog.update({
                    where: { id: input.chatLogId },
                    data: {
                        lastStepNumber: 3, // Set step to parsed rounds
                    },
                });

                return {
                    success: true,
                    roundCount: rounds.length,
                    rounds,
                };
            } catch (error) {
                console.error("Error parsing rounds:", error instanceof Error ? error.message : String(error));
                throw new Error(`Failed to parse rounds: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),

    // Get rounds for a chat log
    getRounds: publicProcedure
        .input(z.object({
            chatLogId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            try {
                const rounds = await ctx.db.round.findMany({
                    where: { chatLogId: input.chatLogId },
                    orderBy: { roundNumber: "asc" },
                });

                return rounds;
            } catch (error) {
                console.error("Error fetching rounds:", error instanceof Error ? error.message : String(error));
                throw new Error("Failed to fetch rounds. Please try again.");
            }
        }),

    // Update a round
    updateRound: publicProcedure
        .input(z.object({
            id: z.string(),
            roundNumber: z.number(),
            content: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                // Get the existing round
                const existingRound = await ctx.db.round.findUnique({
                    where: { id: input.id },
                });

                if (!existingRound) {
                    throw new Error("Round not found");
                }

                // Update the round
                const updatedRound = await ctx.db.round.update({
                    where: { id: input.id },
                    data: {
                        roundNumber: input.roundNumber,
                        content: input.content
                    }
                });

                return updatedRound;
            } catch (error) {
                console.error("Error updating round:", error instanceof Error ? error.message : String(error));
                throw new Error(`Failed to update round: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
}); 