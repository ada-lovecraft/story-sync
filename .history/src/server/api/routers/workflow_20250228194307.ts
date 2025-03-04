import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

// Schema for chat logs
const chatLogSchema = z.object({
    id: z.string(),
    name: z.string(),
    content: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// Schema for cleaned chat logs
const cleanedChatLogSchema = z.object({
    id: z.string(),
    originalId: z.string(),
    content: z.string(),
    metadata: z.record(z.string(), z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// Schema for a single chat round
const roundSchema = z.object({
    id: z.string().optional(),
    index: z.number(),
    speaker: z.string(),
    content: z.string(),
    highlighted: z.boolean().default(false),
});

// Schema for a chapter consisting of multiple rounds
const chapterSchema = z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    rounds: z.array(roundSchema),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const workflowRouter = createTRPCRouter({
    // Get all chat logs
    getAllChatLogs: publicProcedure.query(async ({ ctx }) => {
        const chatLogs = await ctx.db.chatLog.findMany({
            orderBy: { createdAt: "desc" },
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
                originalId: z.string(),
                content: z.string(),
                metadata: z.record(z.string(), z.any()).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { originalId, content, metadata } = input;

            // Check if a cleaned version already exists
            const existing = await ctx.db.cleanedChatLog.findFirst({
                where: { originalId },
            });

            if (existing) {
                // Update existing
                return await ctx.db.cleanedChatLog.update({
                    where: { id: existing.id },
                    data: { content, metadata },
                });
            } else {
                // Create new
                return await ctx.db.cleanedChatLog.create({
                    data: { originalId, content, metadata },
                });
            }
        }),

    // Get cleaned chat log by original ID
    getCleanedChatLog: publicProcedure
        .input(z.object({ originalId: z.string() }))
        .query(async ({ ctx, input }) => {
            const cleanedLog = await ctx.db.cleanedChatLog.findFirst({
                where: { originalId: input.originalId },
            });
            return cleanedLog;
        }),

    // Save parsed rounds
    saveRounds: publicProcedure
        .input(
            z.object({
                cleanedChatLogId: z.string(),
                rounds: z.array(roundSchema),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { cleanedChatLogId, rounds } = input;

            // In a real implementation, we would save these to the database
            // For now, we'll just return them as if they were saved
            return {
                id: cleanedChatLogId,
                rounds,
                savedAt: new Date(),
            };
        }),

    // Save chapters
    saveChapters: publicProcedure
        .input(
            z.object({
                cleanedChatLogId: z.string(),
                chapters: z.array(chapterSchema),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { cleanedChatLogId, chapters } = input;

            // In a real implementation, we would save these to the database
            // For now, we'll just return them as if they were saved
            return {
                id: cleanedChatLogId,
                chapters,
                savedAt: new Date(),
            };
        }),
}); 