/*
  Warnings:

  - You are about to drop the column `role` on the `OrganizationInvitation` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `OrganizationInviteLink` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `UserOrganization` table. All the data in the column will be lost.
  - Added the required column `organizationRoleId` to the `OrganizationInvitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationRoleId` to the `OrganizationInviteLink` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationRoleId` to the `UserOrganization` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "OrganizationRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_OrganizationPermissionToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OrganizationPermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "OrganizationRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OrganizationPermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrganizationInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "organizationRoleId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    "inviterId" TEXT,
    CONSTRAINT "OrganizationInvitation_organizationRoleId_fkey" FOREIGN KEY ("organizationRoleId") REFERENCES "OrganizationRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrganizationInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Migrate existing invitation data with role mapping
INSERT INTO "new_OrganizationInvitation" ("id", "email", "organizationRoleId", "token", "expiresAt", "createdAt", "updatedAt", "organizationId", "inviterId")
SELECT 
    "id",
    "email",
    CASE 
        WHEN "role" = 'admin' THEN 'org_role_admin'
        WHEN "role" = 'member' THEN 'org_role_member' 
        WHEN "role" = 'viewer' THEN 'org_role_viewer'
        WHEN "role" = 'guest' THEN 'org_role_guest'
        ELSE 'org_role_member' -- Default fallback
    END as "organizationRoleId",
    "token",
    "expiresAt", 
    "createdAt",
    "updatedAt",
    "organizationId",
    "inviterId"
FROM "OrganizationInvitation";
DROP TABLE "OrganizationInvitation";
ALTER TABLE "new_OrganizationInvitation" RENAME TO "OrganizationInvitation";
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "OrganizationInvitation"("organizationId");
CREATE INDEX "OrganizationInvitation_organizationRoleId_idx" ON "OrganizationInvitation"("organizationRoleId");
CREATE UNIQUE INDEX "OrganizationInvitation_email_organizationId_key" ON "OrganizationInvitation"("email", "organizationId");
CREATE TABLE "new_OrganizationInviteLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "organizationRoleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "OrganizationInviteLink_organizationRoleId_fkey" FOREIGN KEY ("organizationRoleId") REFERENCES "OrganizationRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrganizationInviteLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrganizationInviteLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Migrate existing invite link data with role mapping
INSERT INTO "new_OrganizationInviteLink" ("id", "token", "organizationRoleId", "isActive", "createdAt", "updatedAt", "organizationId", "createdById")
SELECT 
    "id",
    "token",
    CASE 
        WHEN "role" = 'admin' THEN 'org_role_admin'
        WHEN "role" = 'member' THEN 'org_role_member' 
        WHEN "role" = 'viewer' THEN 'org_role_viewer'
        WHEN "role" = 'guest' THEN 'org_role_guest'
        ELSE 'org_role_member' -- Default fallback
    END as "organizationRoleId",
    "isActive",
    "createdAt",
    "updatedAt", 
    "organizationId",
    "createdById"
FROM "OrganizationInviteLink";
DROP TABLE "OrganizationInviteLink";
ALTER TABLE "new_OrganizationInviteLink" RENAME TO "OrganizationInviteLink";
CREATE UNIQUE INDEX "OrganizationInviteLink_token_key" ON "OrganizationInviteLink"("token");
CREATE INDEX "OrganizationInviteLink_organizationId_idx" ON "OrganizationInviteLink"("organizationId");
CREATE INDEX "OrganizationInviteLink_createdById_idx" ON "OrganizationInviteLink"("createdById");
CREATE INDEX "OrganizationInviteLink_organizationRoleId_idx" ON "OrganizationInviteLink"("organizationRoleId");
CREATE UNIQUE INDEX "OrganizationInviteLink_organizationId_createdById_key" ON "OrganizationInviteLink"("organizationId", "createdById");
CREATE TABLE "new_Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "access" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'system',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Permission" ("access", "action", "createdAt", "description", "entity", "id", "updatedAt") SELECT "access", "action", "createdAt", "description", "entity", "id", "updatedAt" FROM "Permission";
DROP TABLE "Permission";
ALTER TABLE "new_Permission" RENAME TO "Permission";
CREATE UNIQUE INDEX "Permission_action_entity_access_context_key" ON "Permission"("action", "entity", "access", "context");
CREATE TABLE "new_UserOrganization" (
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationRoleId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "department" TEXT,

    PRIMARY KEY ("userId", "organizationId"),
    CONSTRAINT "UserOrganization_organizationRoleId_fkey" FOREIGN KEY ("organizationRoleId") REFERENCES "OrganizationRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Step 1: Insert default OrganizationRole records
INSERT INTO "OrganizationRole" ("id", "name", "description", "level", "createdAt", "updatedAt")
VALUES 
    ('org_role_admin', 'admin', 'Full access to organization settings and members', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_role_member', 'member', 'Standard organization member with note access', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_role_viewer', 'viewer', 'Read-only access to organization notes', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_role_guest', 'guest', 'Limited access for temporary collaborators', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 2: Insert organization-specific permissions
INSERT INTO "Permission" ("id", "action", "entity", "access", "context", "description", "createdAt", "updatedAt")
VALUES 
    -- Note permissions (organization context)
    ('org_perm_create_note_own', 'create', 'note', 'own', 'organization', 'Create notes within organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_read_note_own', 'read', 'note', 'own', 'organization', 'Read own notes within organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_read_note_org', 'read', 'note', 'org', 'organization', 'Read organization notes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_update_note_own', 'update', 'note', 'own', 'organization', 'Update own notes within organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_update_note_org', 'update', 'note', 'org', 'organization', 'Update organization notes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_delete_note_own', 'delete', 'note', 'own', 'organization', 'Delete own notes within organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_delete_note_org', 'delete', 'note', 'org', 'organization', 'Delete organization notes', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Member permissions (organization context)  
    ('org_perm_read_member_any', 'read', 'member', 'any', 'organization', 'View organization members', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_create_member_any', 'create', 'member', 'any', 'organization', 'Invite new organization members', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_update_member_any', 'update', 'member', 'any', 'organization', 'Update organization member roles', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_delete_member_any', 'delete', 'member', 'any', 'organization', 'Remove organization members', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Organization settings permissions
    ('org_perm_update_settings_any', 'update', 'settings', 'any', 'organization', 'Update organization settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_read_settings_any', 'read', 'settings', 'any', 'organization', 'View organization settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 3: Assign permissions to roles
INSERT INTO "_OrganizationPermissionToRole" ("A", "B")
VALUES 
    -- Admin gets all permissions
    ('org_role_admin', 'org_perm_create_note_own'),
    ('org_role_admin', 'org_perm_read_note_own'),
    ('org_role_admin', 'org_perm_read_note_org'),
    ('org_role_admin', 'org_perm_update_note_own'),
    ('org_role_admin', 'org_perm_update_note_org'),
    ('org_role_admin', 'org_perm_delete_note_own'),
    ('org_role_admin', 'org_perm_delete_note_org'),
    ('org_role_admin', 'org_perm_read_member_any'),
    ('org_role_admin', 'org_perm_create_member_any'),
    ('org_role_admin', 'org_perm_update_member_any'),
    ('org_role_admin', 'org_perm_delete_member_any'),
    ('org_role_admin', 'org_perm_update_settings_any'),
    ('org_role_admin', 'org_perm_read_settings_any'),
    
    -- Member gets standard permissions
    ('org_role_member', 'org_perm_create_note_own'),
    ('org_role_member', 'org_perm_read_note_own'),
    ('org_role_member', 'org_perm_read_note_org'),
    ('org_role_member', 'org_perm_update_note_own'),
    ('org_role_member', 'org_perm_delete_note_own'),
    ('org_role_member', 'org_perm_read_member_any'),
    
    -- Viewer gets read-only permissions
    ('org_role_viewer', 'org_perm_read_note_own'),
    ('org_role_viewer', 'org_perm_read_note_org'),
    ('org_role_viewer', 'org_perm_read_member_any'),
    
    -- Guest gets minimal permissions
    ('org_role_guest', 'org_perm_read_note_own');

-- Step 4: Migrate existing UserOrganization data with role mapping
INSERT INTO "new_UserOrganization" ("userId", "organizationId", "organizationRoleId", "active", "isDefault", "createdAt", "updatedAt", "department")
SELECT 
    "userId",
    "organizationId",
    CASE 
        WHEN "role" = 'admin' THEN 'org_role_admin'
        WHEN "role" = 'member' THEN 'org_role_member'
        WHEN "role" = 'viewer' THEN 'org_role_viewer'
        WHEN "role" = 'guest' THEN 'org_role_guest'
        ELSE 'org_role_member' -- Default fallback
    END as "organizationRoleId",
    "active",
    "isDefault", 
    "createdAt",
    "updatedAt",
    "department"
FROM "UserOrganization";

DROP TABLE "UserOrganization";
ALTER TABLE "new_UserOrganization" RENAME TO "UserOrganization";
CREATE INDEX "UserOrganization_userId_idx" ON "UserOrganization"("userId");
CREATE INDEX "UserOrganization_organizationId_idx" ON "UserOrganization"("organizationId");
CREATE INDEX "UserOrganization_organizationRoleId_idx" ON "UserOrganization"("organizationRoleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRole_name_key" ON "OrganizationRole"("name");

-- CreateIndex
CREATE INDEX "OrganizationRole_level_idx" ON "OrganizationRole"("level");

-- CreateIndex
CREATE UNIQUE INDEX "_OrganizationPermissionToRole_AB_unique" ON "_OrganizationPermissionToRole"("A", "B");

-- CreateIndex
CREATE INDEX "_OrganizationPermissionToRole_B_index" ON "_OrganizationPermissionToRole"("B");
