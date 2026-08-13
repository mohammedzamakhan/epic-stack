-- AlterTable
ALTER TABLE "WebsitePage" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "WebsitePage" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "WebsitePage" ADD COLUMN "seoImageUrl" TEXT;
ALTER TABLE "WebsitePage" ADD COLUMN "seoNoIndex" BOOLEAN NOT NULL DEFAULT false;
