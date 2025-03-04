import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// Schema for chat logs
const chatLogSchema = z.object({
    id: z.string(),
    filename: z.string(),
    fileSize: z.number(),
    content: z.string(),
    uploadDate: z.date(),
    lastModified: z.date(),
    lastStepNumber: z.number(),
});

// Schema for cleaned chat logs
const cleanedChatLogSchema = z.object({
    id: z.number(),
    chatLogId: z.string(),
    content: z.string(),
    originalSize: z.number(),
    cleanedSize: z.number(),
    originalLines: z.number(),
    cleanedLines: z.number(),
    createdAt: z.date(),
});

// Schema for a single chat round
const roundSchema = z.object({
    id: z.number().optional(),
    roundNumber: z.number(),
    startLine: z.number(),
    endLine: z.number(),
    totalLines: z.number(),
    totalChars: z.number(),
    isOmitted: z.boolean().default(false),
    cleanedChatLogId: z.number().optional(),
});

// Schema for a chapter consisting of multiple rounds
const chapterSchema = z.object({
    id: z.number().optional(),
    chapterNumber: z.number(),
    title: z.string().optional(),
    targetLines: z.number(),
    actualLines: z.number(),
    rounds: z.array(z.number()), // Round IDs
});

export const workflowRouter = createTRPCRouter({
    // Get all chat logs
    getAllChatLogs: publicProcedure.query(async ({ ctx }) => {
        const chatLogs = await ctx.db.chatLog.findMany({
            orderBy: { uploadDate: "desc" },
        });
        return chatLogs;
    }),

    // Get a specific chat log by ID
    getChatLog: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const chatLog = await ctx.db.chatLog.findUnique({
                where: { id: input.id },
            });
            return chatLog;
        }),

    // Save a cleaned chat log
    saveCleanedChatLog: publicProcedure
        .input(
            z.object({
                chatLogId: z.string(),
                content: z.string(),
                originalSize: z.number(),
                cleanedSize: z.number(),
                originalLines: z.number(),
                cleanedLines: z.number(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { chatLogId, content, originalSize, cleanedSize, originalLines, cleanedLines } = input;

            // Check if a cleaned version already exists
            const existing = await ctx.db.cleanedChatLog.findFirst({
                where: { chatLogId },
            });

            if (existing) {
                // Update existing
                return await ctx.db.cleanedChatLog.update({
                    where: { id: existing.id },
                    data: {
                        content,
                        originalSize,
                        cleanedSize,
                        originalLines,
                        cleanedLines
                    },
                });
            } else {
                // Create new
                return await ctx.db.cleanedChatLog.create({
                    data: {
                        chatLogId,
                        content,
                        originalSize,
                        cleanedSize,
                        originalLines,
                        cleanedLines
                    },
                });
            }
        }),

    // Get cleaned chat log by original ID
    getCleanedChatLog: publicProcedure
        .input(z.object({ chatLogId: z.string() }))
        .query(async ({ ctx, input }) => {
            const cleanedLog = await ctx.db.cleanedChatLog.findFirst({
                where: { chatLogId: input.chatLogId },
            });
            return cleanedLog;
        }),

    // Save parsed rounds
    saveRounds: publicProcedure
        .input(
            z.object({
                cleanedChatLogId: z.number(),
                rounds: z.array(roundSchema),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { cleanedChatLogId, rounds } = input;

            // Create each round in the database
            const createdRounds = await Promise.all(
                rounds.map(async (round) => {
                    return await ctx.db.round.create({
                        data: {
                            roundNumber: round.roundNumber,
                            startLine: round.startLine,
                            endLine: round.endLine,
                            totalLines: round.totalLines,
                            totalChars: round.totalChars,
                            isOmitted: round.isOmitted,
                            cleanedChatLogId,
                        },
                    });
                }),
            );

            return createdRounds;
        }),

    // Save a chapter
    saveChapter: publicProcedure
        .input(
            z.object({
                chapterNumber: z.number(),
                title: z.string().optional(),
                targetLines: z.number(),
                actualLines: z.number(),
                roundIds: z.array(z.number()),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { chapterNumber, title, targetLines, actualLines, roundIds } = input;

            // Create the chapter
            const chapter = await ctx.db.chapter.create({
                data: {
                    chapterNumber,
                    title,
                    targetLines,
                    actualLines,
                },
            });

            // Update the rounds to belong to this chapter
            await ctx.db.round.updateMany({
                where: {
                    id: {
                        in: roundIds,
                    },
                },
                data: {
                    chapterId: chapter.id,
                },
            });

            return chapter;
        }),

    // Mark workflow step as completed
    updateWorkflowStep: publicProcedure
        .input(
            z.object({
                chatLogId: z.string(),
                stepNumber: z.number(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { chatLogId, stepNumber } = input;

            // Only update if the new step is further along in the workflow
            return await ctx.db.chatLog.update({
                where: { id: chatLogId },
                data: {
                    lastStepNumber: {
                        set: stepNumber,
                    },
                },
            });
        }),
}); 