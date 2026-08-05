-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "suggestions" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "themeName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
