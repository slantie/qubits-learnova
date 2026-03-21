-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('TIER', 'COURSE_MILESTONE', 'QUIZ_EXCELLENCE', 'SPEED', 'CERTIFICATION', 'DEDICATION');

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "scorePercent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeKey_key" ON "UserBadge"("userId", "badgeKey");

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
