-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" DATETIME NOT NULL,
    "lastStepNumber" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "CleanedChatLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "cleanedSize" INTEGER NOT NULL,
    "originalLines" INTEGER NOT NULL,
    "cleanedLines" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatLogId" TEXT NOT NULL,
    CONSTRAINT "CleanedChatLog_chatLogId_fkey" FOREIGN KEY ("chatLogId") REFERENCES "ChatLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roundNumber" INTEGER NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "totalLines" INTEGER NOT NULL,
    "totalChars" INTEGER NOT NULL,
    "isOmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cleanedChatLogId" INTEGER NOT NULL,
    "chapterId" INTEGER,
    CONSTRAINT "Round_cleanedChatLogId_fkey" FOREIGN KEY ("cleanedChatLogId") REFERENCES "CleanedChatLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Round_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "chapterNumber" INTEGER NOT NULL,
    "title" TEXT,
    "targetLines" INTEGER NOT NULL,
    "actualLines" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NarrativeSummary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "roundId" INTEGER NOT NULL,
    CONSTRAINT "NarrativeSummary_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContextDownConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromRoundId" INTEGER NOT NULL,
    "toRoundId" INTEGER NOT NULL,
    "targetChapterId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ChatLog_filename_idx" ON "ChatLog"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "CleanedChatLog_chatLogId_key" ON "CleanedChatLog"("chatLogId");

-- CreateIndex
CREATE INDEX "Round_cleanedChatLogId_idx" ON "Round"("cleanedChatLogId");

-- CreateIndex
CREATE INDEX "Round_chapterId_idx" ON "Round"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_cleanedChatLogId_roundNumber_key" ON "Round"("cleanedChatLogId", "roundNumber");

-- CreateIndex
CREATE INDEX "Chapter_chapterNumber_idx" ON "Chapter"("chapterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeSummary_roundId_key" ON "NarrativeSummary"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "ContextDownConfig_fromRoundId_toRoundId_targetChapterId_key" ON "ContextDownConfig"("fromRoundId", "toRoundId", "targetChapterId");
