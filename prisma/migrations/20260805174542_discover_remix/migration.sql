-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "remixCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "remixedFromId" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_remixedFromId_fkey" FOREIGN KEY ("remixedFromId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
