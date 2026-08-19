-- Website editor permissions, separate from organization settings.
-- Granted to the admin org role by default so a future "website editor"
-- role can receive these without full admin access.

INSERT INTO "Permission" ("id", "action", "entity", "access", "context", "description", "createdAt", "updatedAt")
VALUES
    ('org_perm_read_website_any', 'read', 'website', 'any', 'organization', 'View website pages and the page builder', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('org_perm_update_website_any', 'update', 'website', 'any', 'organization', 'Edit website pages, announcements, and translations', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "_OrganizationPermissionToRole" ("A", "B")
VALUES
    ('org_role_admin', 'org_perm_read_website_any'),
    ('org_role_admin', 'org_perm_update_website_any');
