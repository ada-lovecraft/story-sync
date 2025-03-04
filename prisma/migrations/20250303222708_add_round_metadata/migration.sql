/*
  Warnings:

  - You are about to drop the column `content` on the `Round` table. All the data in the column will be lost.
  - Added the required column `characterCount` to the `Round` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endLine` to the `Round` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lineCount` to the `Round` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startLine` to the `Round` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundNumber" INTEGER NOT NULL,
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "characterCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatLogId" TEXT NOT NULL,
    "cleanedChatLogId" INTEGER,
    CONSTRAINT "Round_cleanedChatLogId_fkey" FOREIGN KEY ("cleanedChatLogId") REFERENCES "CleanedChatLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Round_chatLogId_fkey" FOREIGN KEY ("chatLogId") REFERENCES "ChatLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Round" ("chatLogId", "cleanedChatLogId", "createdAt", "id", "roundNumber") SELECT "chatLogId", "cleanedChatLogId", "createdAt", "id", "roundNumber" FROM "Round";
DROP TABLE "Round";
ALTER TABLE "new_Round" RENAME TO "Round";
CREATE INDEX "Round_chatLogId_idx" ON "Round"("chatLogId");
CREATE UNIQUE INDEX "Round_chatLogId_roundNumber_key" ON "Round"("chatLogId", "roundNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
