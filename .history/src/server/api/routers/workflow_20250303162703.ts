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
    chatLogId: z.string(),
    roundNumber: z.number(),
    startLine: z.number(),
    endLine: z.number(),
    lineCount: z.number(),
    characterCount: z.number(),
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

                const cleanedContent = chatLog.cleanedContent;
                const lines = cleanedContent.split('\n');

                const rounds = [];
                let roundNumber = 0;
                let inUserNode = false;
                let inDungeonMasterNode = false;
                let roundStartLine = -1;
                let currentNodeStartLine = -1;

                // Parse the content line by line to identify rounds
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i] || '';

                    // Check for user node start
                    if (line.includes('<user>')) {
                        // If we were already in a user node, this is a new occurrence
                        if (inUserNode) {
                            // Reset state, apparently malformed content
                            inUserNode = false;
                            inDungeonMasterNode = false;
                            roundStartLine = -1;
                        }

                        inUserNode = true;
                        currentNodeStartLine = i;

                        // If this is the start of a round, record the start line
                        if (roundStartLine === -1) {
                            roundStartLine = i;
                        }
                    }
                    // Check for user node end and dungeon master node start
                    else if (line.includes('</user>') && line.includes('<dungeon_master>')) {
                        if (inUserNode) {
                            inUserNode = false;
                            inDungeonMasterNode = true;
                            currentNodeStartLine = i;
                        }
                    }
                    // Check for dungeon master node end
                    else if (line.includes('</dungeon_master>')) {
                        // If we complete a full round (user + dungeon_master)
                        if (inDungeonMasterNode && roundStartLine !== -1) {
                            roundNumber++;

                            // Calculate metadata
                            const roundEndLine = i;
                            const lineCount = roundEndLine - roundStartLine + 1;

                            // Calculate character count for the round
                            let characterCount = 0;
                            for (let j = roundStartLine; j <= roundEndLine; j++) {
                                characterCount += (lines[j] || '').length;
                            }

                            // Create round record with metadata
                            const round = await ctx.db.round.create({
                                data: {
                                    roundNumber,
                                    startLine: roundStartLine,
                                    endLine: roundEndLine,
                                    lineCount,
                                    characterCount,
                                    chatLogId: input.chatLogId,
                                },
                            });

                            rounds.push(round);

                            // Reset state for next round
                            inUserNode = false;
                            inDungeonMasterNode = false;
                            roundStartLine = -1;
                        }
                    }
                }

                // Calculate statistics
                const totalRounds = rounds.length;
                const totalLines = rounds.reduce((sum, round) => sum + (round.lineCount as number), 0);
                const averageLinesPerRound = totalRounds > 0 ? totalLines / totalRounds : 0;

                // Update the chat log to mark this step as complete
                await ctx.db.chatLog.update({
                    where: { id: input.chatLogId },
                    data: {
                        lastStepNumber: 3, // Set step to parsed rounds
                    },
                });

                return {
                    success: true,
                    roundCount: totalRounds,
                    averageLinesPerRound,
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
}); 