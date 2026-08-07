-- AlterTable
ALTER TABLE "AppVersion" ADD COLUMN     "compiledHtml" TEXT,
ADD COLUMN     "files" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "template" TEXT NOT NULL DEFAULT 'html';
