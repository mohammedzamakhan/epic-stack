-- Add email policy and security fields to SSOConfiguration
ALTER TABLE "SSOConfiguration" ADD COLUMN "requireVerifiedEmail" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SSOConfiguration" ADD COLUMN "allowedEmailDomains" TEXT;
ALTER TABLE "SSOConfiguration" ADD COLUMN "enforceSSOLogin" BOOLEAN NOT NULL DEFAULT false;
