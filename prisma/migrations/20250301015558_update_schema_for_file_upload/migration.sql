/*
  Warnings:

  - The primary key for the `Chapter` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `actualLines` on the `Chapter` table. All the data in the column will be lost.
  - You are about to drop the column `targetLines` on the `Chapter` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `ChatLog` table. All the data in the column will be lost.
  - You are about to drop the column `lastModified` on the `ChatLog` table. All the data in the column will be lost.
  - You are about to drop the column `uploadDate` on the `ChatLog` table. All the data in the column will be lost.
  - The primary key for the `ContextDownConfig` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `NarrativeSummary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Round` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `chapterId` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `endLine` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `isOmitted` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `startLine` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `totalChars` on the `Round` table. All the data in the column will be lost.
  - You are about to drop the column `totalLines` on the `Round` table. All the data in the column will be lost.
  - Added the required column `content` to the `Chapter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roundId` to the `Chapter` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `Chapter` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `hash` to the `ChatLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `ChatLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ChatLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chatLogId` to the `Round` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `Round` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chapterNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roundId" TEXT NOT NULL,
    CONSTRAINT "Chapter_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("chapterNumber", "createdAt", "id", "title", "updatedAt") SELECT "chapterNumber", "createdAt", "id", "title", "updatedAt" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
CREATE INDEX "Chapter_roundId_idx" ON "Chapter"("roundId");
CREATE INDEX "Chapter_chapterNumber_idx" ON "Chapter"("chapterNumber");
CREATE TABLE "new_ChatLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "cleanedContent" TEXT,
    "hash" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text/plain',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastStepNumber" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_ChatLog" ("content", "filename", "id", "lastStepNumber") SELECT "content", "filename", "id", "lastStepNumber" FROM "ChatLog";
DROP TABLE "ChatLog";
ALTER TABLE "new_ChatLog" RENAME TO "ChatLog";
CREATE UNIQUE INDEX "ChatLog_hash_key" ON "ChatLog"("hash");
CREATE INDEX "ChatLog_filename_idx" ON "ChatLog"("filename");
CREATE INDEX "ChatLog_hash_idx" ON "ChatLog"("hash");
CREATE TABLE "new_ContextDownConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromRoundId" TEXT NOT NULL,
    "toRoundId" TEXT NOT NULL,
    "targetChapterId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ContextDownConfig" ("createdAt", "fromRoundId", "id", "targetChapterId", "toRoundId") SELECT "createdAt", "fromRoundId", "id", "targetChapterId", "toRoundId" FROM "ContextDownConfig";
DROP TABLE "ContextDownConfig";
ALTER TABLE "new_ContextDownConfig" RENAME TO "ContextDownConfig";
CREATE UNIQUE INDEX "ContextDownConfig_fromRoundId_toRoundId_targetChapterId_key" ON "ContextDownConfig"("fromRoundId", "toRoundId", "targetChapterId");
CREATE TABLE "new_NarrativeSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roundId" TEXT NOT NULL
);
INSERT INTO "new_NarrativeSummary" ("createdAt", "id", "roundId", "status", "summary", "updatedAt") SELECT "createdAt", "id", "roundId", "status", "summary", "updatedAt" FROM "NarrativeSummary";
DROP TABLE "NarrativeSummary";
ALTER TABLE "new_NarrativeSummary" RENAME TO "NarrativeSummary";
CREATE UNIQUE INDEX "NarrativeSummary_roundId_key" ON "NarrativeSummary"("roundId");
CREATE TABLE "new_Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatLogId" TEXT NOT NULL,
    "cleanedChatLogId" INTEGER,
    CONSTRAINT "Round_chatLogId_fkey" FOREIGN KEY ("chatLogId") REFERENCES "ChatLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_cleanedChatLogId_fkey" FOREIGN KEY ("cleanedChatLogId") REFERENCES "CleanedChatLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Round" ("cleanedChatLogId", "createdAt", "id", "roundNumber") SELECT "cleanedChatLogId", "createdAt", "id", "roundNumber" FROM "Round";
DROP TABLE "Round";
ALTER TABLE "new_Round" RENAME TO "Round";
CREATE INDEX "Round_chatLogId_idx" ON "Round"("chatLogId");
CREATE UNIQUE INDEX "Round_chatLogId_roundNumber_key" ON "Round"("chatLogId", "roundNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
