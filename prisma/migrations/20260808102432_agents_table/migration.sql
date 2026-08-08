-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'builtin',
    "group" TEXT NOT NULL DEFAULT 'life',
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "taglineZh" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "starterPrompts" JSONB,
    "themeHint" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_ownerId_idx" ON "Agent"("ownerId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
