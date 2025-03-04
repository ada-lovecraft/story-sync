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

                // Enhanced parsing algorithm to detect rounds
                // Try multiple patterns to find the best match
                let roundTexts: string[] = [];

                // Pattern 1: Standard "Round X:" format
                const roundPattern = /(?=Round\s+\d+\s*:)/i;
                const standardRounds = cleanedContent.split(roundPattern).filter(Boolean);

                // Pattern 2: Look for "Round X" without colon
                const roundPatternNoColon = /(?=Round\s+\d+\s*(?!\:))/i;
                const noColonRounds = cleanedContent.split(roundPatternNoColon).filter(Boolean);

                // Pattern 3: Look for "#X" or "# X" format (common in some chat logs)
                const hashPattern = /(?=#\s*\d+\s*)/;
                const hashRounds = cleanedContent.split(hashPattern).filter(Boolean);

                // Pattern 4: Look for "Q:" and "A:" patterns (Question/Answer pairs)
                const qaPattern = /(?=(^|\n)Q:\s*)/;
                const qaRounds = cleanedContent.split(qaPattern).filter(Boolean);

                // Pattern 5: Look for "Human:" and "Assistant:" patterns
                const humanAssistantPattern = /(?=(^|\n)Human:\s*)/;
                const humanAssistantRounds = cleanedContent.split(humanAssistantPattern).filter(Boolean);

                // Choose the best parsing result based on number of rounds and consistency
                // Prioritize the pattern that produces a reasonable number of non-empty chunks
                if (standardRounds.length > 1) {
                    roundTexts = standardRounds;
                } else if (noColonRounds.length > 1) {
                    roundTexts = noColonRounds;
                } else if (hashRounds.length > 1) {
                    roundTexts = hashRounds;
                } else if (qaRounds.length > 1) {
                    roundTexts = qaRounds;
                } else if (humanAssistantRounds.length > 1) {
                    roundTexts = humanAssistantRounds;
                } else {
                    // If no pattern matches well, fallback to creating a single round
                    // or splitting by large paragraph breaks
                    const paragraphBreaks = cleanedContent.split(/\n\s*\n\s*\n+/);

                    if (paragraphBreaks.length > 1 && paragraphBreaks.length < 20) {
                        // If we have a reasonable number of paragraphs, use them as rounds
                        roundTexts = paragraphBreaks;
                    } else {
                        // Default: just create a single round with all content
                        roundTexts = [cleanedContent];
                    }
                }

                // Create round records
                const rounds = [];
                for (let i = 0; i < roundTexts.length; i++) {
                    const roundText = roundTexts[i].trim();
                    if (roundText) {
                        // Try to extract a round number from the text if it exists
                        let roundNumber = i + 1;
                        const extractedNumber = roundText.match(/^Round\s+(\d+)/i);
                        if (extractedNumber && extractedNumber[1]) {
                            const parsed = parseInt(extractedNumber[1], 10);
                            if (!isNaN(parsed)) {
                                roundNumber = parsed;
                            }
                        }

                        const round = await ctx.db.round.create({
                            data: {
                                content: roundText,
                                roundNumber: roundNumber,
                                chatLogId: input.chatLogId,
                            },
                        });
                        rounds.push(round);
                    }
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