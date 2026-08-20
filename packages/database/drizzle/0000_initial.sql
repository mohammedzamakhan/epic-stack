CREATE TABLE `ApiKey` (
	`id` text PRIMARY KEY NOT NULL,
	`keyHash` text NOT NULL,
	`keyPrefix` text NOT NULL,
	`name` text NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`lastUsedAt` integer,
	`expiresAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ApiKey_keyHash_idx` ON `ApiKey` (`keyHash`);--> statement-breakpoint
CREATE INDEX `ApiKey_organizationId_idx` ON `ApiKey` (`organizationId`);--> statement-breakpoint
CREATE INDEX `ApiKey_userId_idx` ON `ApiKey` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `ApiKey_keyHash_key` ON `ApiKey` (`keyHash`);--> statement-breakpoint
CREATE TABLE `AuditLog` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text,
	`userId` text,
	`action` text NOT NULL,
	`details` text NOT NULL,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`resourceType` text,
	`resourceId` text,
	`targetUserId` text,
	`severity` text DEFAULT 'info' NOT NULL,
	`retainUntil` integer,
	`archived` integer DEFAULT false NOT NULL,
	`integrityHash` text,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `AuditLog_targetUserId_idx` ON `AuditLog` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `AuditLog_archived_retainUntil_idx` ON `AuditLog` (`archived`,`retainUntil`);--> statement-breakpoint
CREATE INDEX `AuditLog_organizationId_createdAt_idx` ON `AuditLog` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `AuditLog_resourceType_resourceId_idx` ON `AuditLog` (`resourceType`,`resourceId`);--> statement-breakpoint
CREATE INDEX `AuditLog_severity_idx` ON `AuditLog` (`severity`);--> statement-breakpoint
CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `AuditLog_action_idx` ON `AuditLog` (`action`);--> statement-breakpoint
CREATE INDEX `AuditLog_userId_idx` ON `AuditLog` (`userId`);--> statement-breakpoint
CREATE INDEX `AuditLog_organizationId_idx` ON `AuditLog` (`organizationId`);--> statement-breakpoint
CREATE TABLE `AuditLogRetentionPolicy` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`retentionDays` integer DEFAULT 365 NOT NULL,
	`hotStorageDays` integer DEFAULT 180 NOT NULL,
	`archiveEnabled` integer DEFAULT true NOT NULL,
	`exportEnabled` integer DEFAULT true NOT NULL,
	`complianceType` text,
	`immutable` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `AuditLogRetentionPolicy_organizationId_idx` ON `AuditLogRetentionPolicy` (`organizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `AuditLogRetentionPolicy_organizationId_key` ON `AuditLogRetentionPolicy` (`organizationId`);--> statement-breakpoint
CREATE TABLE `BackupCode` (
	`id` text PRIMARY KEY NOT NULL,
	`codeHash` text NOT NULL,
	`userId` text NOT NULL,
	`usedAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `BackupCode_userId_usedAt_idx` ON `BackupCode` (`userId`,`usedAt`);--> statement-breakpoint
CREATE INDEX `BackupCode_userId_idx` ON `BackupCode` (`userId`);--> statement-breakpoint
CREATE TABLE `ConfigFlag` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`level` text NOT NULL,
	`organizationId` text,
	`userId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ConfigFlag_key_level_organizationId_userId_key` ON `ConfigFlag` (`key`,`level`,`organizationId`,`userId`);--> statement-breakpoint
CREATE INDEX `ConfigFlag_userId_idx` ON `ConfigFlag` (`userId`);--> statement-breakpoint
CREATE INDEX `ConfigFlag_organizationId_idx` ON `ConfigFlag` (`organizationId`);--> statement-breakpoint
CREATE INDEX `ConfigFlag_level_idx` ON `ConfigFlag` (`level`);--> statement-breakpoint
CREATE INDEX `ConfigFlag_key_idx` ON `ConfigFlag` (`key`);--> statement-breakpoint
CREATE TABLE `Connection` (
	`id` text PRIMARY KEY NOT NULL,
	`providerName` text NOT NULL,
	`providerId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Connection_providerName_providerId_key` ON `Connection` (`providerName`,`providerId`);--> statement-breakpoint
CREATE TABLE `DataSubjectRequest` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`requestedAt` integer NOT NULL,
	`processedAt` integer,
	`completedAt` integer,
	`cancelledAt` integer,
	`scheduledFor` integer,
	`executedAt` integer,
	`failureReason` text,
	`metadata` text,
	`ipAddress` text,
	`userAgent` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `DataSubjectRequest_requestedAt_idx` ON `DataSubjectRequest` (`requestedAt`);--> statement-breakpoint
CREATE INDEX `DataSubjectRequest_status_scheduledFor_idx` ON `DataSubjectRequest` (`status`,`scheduledFor`);--> statement-breakpoint
CREATE INDEX `DataSubjectRequest_userId_type_status_idx` ON `DataSubjectRequest` (`userId`,`type`,`status`);--> statement-breakpoint
CREATE TABLE `Feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`message` text NOT NULL,
	`type` text NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Feedback_organizationId_idx` ON `Feedback` (`organizationId`);--> statement-breakpoint
CREATE INDEX `Feedback_userId_idx` ON `Feedback` (`userId`);--> statement-breakpoint
CREATE TABLE `ImpersonationSession` (
	`id` text PRIMARY KEY NOT NULL,
	`adminUserId` text NOT NULL,
	`targetUserId` text NOT NULL,
	`ipHash` text NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`adminUserId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ImpersonationSession_expiresAt_idx` ON `ImpersonationSession` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `ImpersonationSession_targetUserId_idx` ON `ImpersonationSession` (`targetUserId`);--> statement-breakpoint
CREATE INDEX `ImpersonationSession_adminUserId_idx` ON `ImpersonationSession` (`adminUserId`);--> statement-breakpoint
CREATE TABLE `Integration` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`providerName` text NOT NULL,
	`providerType` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` integer,
	`config` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`lastSyncAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Integration_organizationId_providerName_key` ON `Integration` (`organizationId`,`providerName`);--> statement-breakpoint
CREATE INDEX `Integration_organizationId_idx` ON `Integration` (`organizationId`);--> statement-breakpoint
CREATE TABLE `IntegrationLog` (
	`id` text PRIMARY KEY NOT NULL,
	`integrationId` text NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`requestData` text,
	`responseData` text,
	`errorMessage` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `IntegrationLog_createdAt_idx` ON `IntegrationLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `IntegrationLog_integrationId_idx` ON `IntegrationLog` (`integrationId`);--> statement-breakpoint
CREATE TABLE `IpAddress` (
	`id` text PRIMARY KEY NOT NULL,
	`ip` text NOT NULL,
	`country` text,
	`region` text,
	`city` text,
	`isBlacklisted` integer DEFAULT false NOT NULL,
	`blacklistReason` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`blacklistedAt` integer,
	`blacklistedById` text,
	`requestCount` integer DEFAULT 0 NOT NULL,
	`lastRequestAt` integer,
	`lastUserAgent` text,
	`suspiciousScore` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`blacklistedById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `IpAddress_suspiciousScore_idx` ON `IpAddress` (`suspiciousScore`);--> statement-breakpoint
CREATE INDEX `IpAddress_isBlacklisted_idx` ON `IpAddress` (`isBlacklisted`);--> statement-breakpoint
CREATE INDEX `IpAddress_ip_idx` ON `IpAddress` (`ip`);--> statement-breakpoint
CREATE UNIQUE INDEX `IpAddress_ip_key` ON `IpAddress` (`ip`);--> statement-breakpoint
CREATE TABLE `IpAddressUser` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`ipAddressId` text NOT NULL,
	`firstSeenAt` integer NOT NULL,
	`lastSeenAt` integer NOT NULL,
	`requestCount` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`ipAddressId`) REFERENCES `IpAddress`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `IpAddressUser_userId_ipAddressId_key` ON `IpAddressUser` (`userId`,`ipAddressId`);--> statement-breakpoint
CREATE INDEX `IpAddressUser_ipAddressId_idx` ON `IpAddressUser` (`ipAddressId`);--> statement-breakpoint
CREATE INDEX `IpAddressUser_userId_idx` ON `IpAddressUser` (`userId`);--> statement-breakpoint
CREATE TABLE `MCPAccessToken` (
	`id` text PRIMARY KEY NOT NULL,
	`authorizationId` text NOT NULL,
	`tokenHash` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`authorizationId`) REFERENCES `MCPAuthorization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MCPAccessToken_expiresAt_idx` ON `MCPAccessToken` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `MCPAccessToken_tokenHash_idx` ON `MCPAccessToken` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `MCPAccessToken_authorizationId_idx` ON `MCPAccessToken` (`authorizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MCPAccessToken_tokenHash_key` ON `MCPAccessToken` (`tokenHash`);--> statement-breakpoint
CREATE TABLE `MCPAuthorization` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`clientName` text NOT NULL,
	`clientId` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`lastUsedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MCPAuthorization_userId_organizationId_idx` ON `MCPAuthorization` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `MCPAuthorization_clientId_idx` ON `MCPAuthorization` (`clientId`);--> statement-breakpoint
CREATE INDEX `MCPAuthorization_organizationId_idx` ON `MCPAuthorization` (`organizationId`);--> statement-breakpoint
CREATE INDEX `MCPAuthorization_userId_idx` ON `MCPAuthorization` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MCPAuthorization_clientId_key` ON `MCPAuthorization` (`clientId`);--> statement-breakpoint
CREATE TABLE `MCPClient` (
	`id` text PRIMARY KEY NOT NULL,
	`clientId` text NOT NULL,
	`clientName` text NOT NULL,
	`redirectUris` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `MCPClient_clientId_idx` ON `MCPClient` (`clientId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MCPClient_clientId_key` ON `MCPClient` (`clientId`);--> statement-breakpoint
CREATE TABLE `MCPRefreshToken` (
	`id` text PRIMARY KEY NOT NULL,
	`authorizationId` text NOT NULL,
	`tokenHash` text NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	`revokedAt` integer,
	`expiresAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`authorizationId`) REFERENCES `MCPAuthorization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MCPRefreshToken_revoked_idx` ON `MCPRefreshToken` (`revoked`);--> statement-breakpoint
CREATE INDEX `MCPRefreshToken_expiresAt_idx` ON `MCPRefreshToken` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `MCPRefreshToken_tokenHash_idx` ON `MCPRefreshToken` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `MCPRefreshToken_authorizationId_idx` ON `MCPRefreshToken` (`authorizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MCPRefreshToken_tokenHash_key` ON `MCPRefreshToken` (`tokenHash`);--> statement-breakpoint
CREATE TABLE `Note` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ownerId` text NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Note_ownerId_updatedAt_idx` ON `Note` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `Note_ownerId_idx` ON `Note` (`ownerId`);--> statement-breakpoint
CREATE TABLE `NoteAccess` (
	`id` text PRIMARY KEY NOT NULL,
	`noteId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`noteId`) REFERENCES `OrganizationNote`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `NoteAccess_noteId_userId_key` ON `NoteAccess` (`noteId`,`userId`);--> statement-breakpoint
CREATE INDEX `NoteAccess_userId_idx` ON `NoteAccess` (`userId`);--> statement-breakpoint
CREATE INDEX `NoteAccess_noteId_idx` ON `NoteAccess` (`noteId`);--> statement-breakpoint
CREATE TABLE `NoteActivityLog` (
	`id` text PRIMARY KEY NOT NULL,
	`noteId` text NOT NULL,
	`userId` text NOT NULL,
	`action` text NOT NULL,
	`metadata` text,
	`targetUserId` text,
	`integrationId` text,
	`commentId` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`noteId`) REFERENCES `OrganizationNote`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `NoteActivityLog_action_idx` ON `NoteActivityLog` (`action`);--> statement-breakpoint
CREATE INDEX `NoteActivityLog_noteId_createdAt_idx` ON `NoteActivityLog` (`noteId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `NoteActivityLog_userId_idx` ON `NoteActivityLog` (`userId`);--> statement-breakpoint
CREATE INDEX `NoteActivityLog_noteId_idx` ON `NoteActivityLog` (`noteId`);--> statement-breakpoint
CREATE TABLE `NoteComment` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`noteId` text NOT NULL,
	`userId` text NOT NULL,
	`parentId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`noteId`) REFERENCES `OrganizationNote`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`parentId`) REFERENCES `NoteComment`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `NoteComment_noteId_createdAt_idx` ON `NoteComment` (`noteId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `NoteComment_parentId_idx` ON `NoteComment` (`parentId`);--> statement-breakpoint
CREATE INDEX `NoteComment_userId_idx` ON `NoteComment` (`userId`);--> statement-breakpoint
CREATE INDEX `NoteComment_noteId_idx` ON `NoteComment` (`noteId`);--> statement-breakpoint
CREATE TABLE `NoteCommentImage` (
	`id` text PRIMARY KEY NOT NULL,
	`altText` text,
	`objectKey` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`commentId` text NOT NULL,
	FOREIGN KEY (`commentId`) REFERENCES `NoteComment`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `NoteCommentImage_commentId_idx` ON `NoteCommentImage` (`commentId`);--> statement-breakpoint
CREATE TABLE `NoteImage` (
	`id` text PRIMARY KEY NOT NULL,
	`altText` text,
	`objectKey` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`noteId` text NOT NULL,
	FOREIGN KEY (`noteId`) REFERENCES `Note`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `NoteImage_noteId_idx` ON `NoteImage` (`noteId`);--> statement-breakpoint
CREATE TABLE `NoteIntegrationConnection` (
	`id` text PRIMARY KEY NOT NULL,
	`noteId` text NOT NULL,
	`integrationId` text NOT NULL,
	`externalId` text NOT NULL,
	`config` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`lastPostedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`noteId`) REFERENCES `OrganizationNote`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `NoteIntegrationConnection_noteId_integrationId_externalId_key` ON `NoteIntegrationConnection` (`noteId`,`integrationId`,`externalId`);--> statement-breakpoint
CREATE INDEX `NoteIntegrationConnection_integrationId_idx` ON `NoteIntegrationConnection` (`integrationId`);--> statement-breakpoint
CREATE INDEX `NoteIntegrationConnection_noteId_idx` ON `NoteIntegrationConnection` (`noteId`);--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`type` text NOT NULL,
	`entityId` text NOT NULL,
	`payload` text NOT NULL,
	`isRead` integer DEFAULT false NOT NULL,
	`isSeen` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Notification_userId_organizationId_type_entityId_key` ON `Notification` (`userId`,`organizationId`,`type`,`entityId`);--> statement-breakpoint
CREATE INDEX `Notification_userId_createdAt_idx` ON `Notification` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Notification_userId_isRead_idx` ON `Notification` (`userId`,`isRead`);--> statement-breakpoint
CREATE TABLE `NotificationPreference` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`workflow` text NOT NULL,
	`email` integer DEFAULT true NOT NULL,
	`inApp` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `NotificationPreference_userId_organizationId_workflow_key` ON `NotificationPreference` (`userId`,`organizationId`,`workflow`);--> statement-breakpoint
CREATE TABLE `OnboardingProgress` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`totalSteps` integer DEFAULT 0 NOT NULL,
	`completedCount` integer DEFAULT 0 NOT NULL,
	`isCompleted` integer DEFAULT false NOT NULL,
	`completedAt` integer,
	`isVisible` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OnboardingProgress_userId_organizationId_key` ON `OnboardingProgress` (`userId`,`organizationId`);--> statement-breakpoint
CREATE INDEX `OnboardingProgress_organizationId_idx` ON `OnboardingProgress` (`organizationId`);--> statement-breakpoint
CREATE INDEX `OnboardingProgress_userId_idx` ON `OnboardingProgress` (`userId`);--> statement-breakpoint
CREATE TABLE `OnboardingStep` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`icon` text,
	`actionConfig` text,
	`isActive` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`autoDetect` integer DEFAULT false NOT NULL,
	`detectConfig` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `OnboardingStep_isActive_sortOrder_idx` ON `OnboardingStep` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE UNIQUE INDEX `OnboardingStep_key_key` ON `OnboardingStep` (`key`);--> statement-breakpoint
CREATE TABLE `OnboardingStepProgress` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`stepId` text NOT NULL,
	`isCompleted` integer DEFAULT false NOT NULL,
	`completedAt` integer,
	`metadata` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`stepId`) REFERENCES `OnboardingStep`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OnboardingStepProgress_userId_organizationId_stepId_key` ON `OnboardingStepProgress` (`userId`,`organizationId`,`stepId`);--> statement-breakpoint
CREATE INDEX `OnboardingStepProgress_stepId_idx` ON `OnboardingStepProgress` (`stepId`);--> statement-breakpoint
CREATE INDEX `OnboardingStepProgress_userId_organizationId_idx` ON `OnboardingStepProgress` (`userId`,`organizationId`);--> statement-breakpoint
CREATE TABLE `Organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`hasProvisionedDb` integer DEFAULT false NOT NULL,
	`dataRegion` text DEFAULT 'us' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`planName` text,
	`stripeCustomerId` text,
	`stripeProductId` text,
	`stripeSubscriptionId` text,
	`subscriptionStatus` text,
	`size` text,
	`verifiedDomain` text,
	`sitePublished` integer DEFAULT false NOT NULL,
	`customDomain` text,
	`customDomainStatus` text,
	`cloudflareHostnameId` text,
	`siteTheme` text,
	`siteLocales` text,
	`siteDefaultLocale` text DEFAULT 'en',
	`siteIconKey` text,
	`siteHeaderConfig` text,
	`siteFooterConfig` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Organization_customDomain_key` ON `Organization` (`customDomain`);--> statement-breakpoint
CREATE UNIQUE INDEX `Organization_slug_key` ON `Organization` (`slug`);--> statement-breakpoint
CREATE TABLE `OrganizationAnnouncement` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`isEnabled` integer DEFAULT true NOT NULL,
	`linkUrl` text,
	`linkLabel` text,
	`linkNewTab` integer DEFAULT true NOT NULL,
	`position` real,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `OrganizationAnnouncement_organizationId_isEnabled_position_idx` ON `OrganizationAnnouncement` (`organizationId`,`isEnabled`,`position`);--> statement-breakpoint
CREATE INDEX `OrganizationAnnouncement_organizationId_idx` ON `OrganizationAnnouncement` (`organizationId`);--> statement-breakpoint
CREATE TABLE `OrganizationImage` (
	`id` text PRIMARY KEY NOT NULL,
	`altText` text,
	`objectKey` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`organizationId` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationImage_organizationId_key` ON `OrganizationImage` (`organizationId`);--> statement-breakpoint
CREATE TABLE `OrganizationInvitation` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`organizationRoleId` text NOT NULL,
	`token` text NOT NULL,
	`expiresAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`organizationId` text NOT NULL,
	`inviterId` text,
	FOREIGN KEY (`organizationRoleId`) REFERENCES `OrganizationRole`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`inviterId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationInvitation_email_organizationId_key` ON `OrganizationInvitation` (`email`,`organizationId`);--> statement-breakpoint
CREATE INDEX `OrganizationInvitation_organizationRoleId_idx` ON `OrganizationInvitation` (`organizationRoleId`);--> statement-breakpoint
CREATE INDEX `OrganizationInvitation_organizationId_idx` ON `OrganizationInvitation` (`organizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationInvitation_token_key` ON `OrganizationInvitation` (`token`);--> statement-breakpoint
CREATE TABLE `OrganizationInviteLink` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`organizationRoleId` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`organizationId` text NOT NULL,
	`createdById` text NOT NULL,
	FOREIGN KEY (`organizationRoleId`) REFERENCES `OrganizationRole`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationInviteLink_organizationId_createdById_key` ON `OrganizationInviteLink` (`organizationId`,`createdById`);--> statement-breakpoint
CREATE INDEX `OrganizationInviteLink_organizationRoleId_idx` ON `OrganizationInviteLink` (`organizationRoleId`);--> statement-breakpoint
CREATE INDEX `OrganizationInviteLink_createdById_idx` ON `OrganizationInviteLink` (`createdById`);--> statement-breakpoint
CREATE INDEX `OrganizationInviteLink_organizationId_idx` ON `OrganizationInviteLink` (`organizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationInviteLink_token_key` ON `OrganizationInviteLink` (`token`);--> statement-breakpoint
CREATE TABLE `OrganizationNote` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`isPublic` integer DEFAULT true NOT NULL,
	`priority` text,
	`tags` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`organizationId` text NOT NULL,
	`createdById` text NOT NULL,
	`statusId` text,
	`position` real,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`statusId`) REFERENCES `OrganizationNoteStatus`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `OrganizationNote_organizationId_statusId_position_idx` ON `OrganizationNote` (`organizationId`,`statusId`,`position`);--> statement-breakpoint
CREATE INDEX `OrganizationNote_organizationId_updatedAt_idx` ON `OrganizationNote` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `OrganizationNote_createdById_idx` ON `OrganizationNote` (`createdById`);--> statement-breakpoint
CREATE INDEX `OrganizationNote_organizationId_idx` ON `OrganizationNote` (`organizationId`);--> statement-breakpoint
CREATE TABLE `OrganizationNoteFavorite` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`noteId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`noteId`) REFERENCES `OrganizationNote`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationNoteFavorite_userId_noteId_key` ON `OrganizationNoteFavorite` (`userId`,`noteId`);--> statement-breakpoint
CREATE INDEX `OrganizationNoteFavorite_noteId_idx` ON `OrganizationNoteFavorite` (`noteId`);--> statement-breakpoint
CREATE INDEX `OrganizationNoteFavorite_userId_idx` ON `OrganizationNoteFavorite` (`userId`);--> statement-breakpoint
CREATE TABLE `OrganizationNoteStatus` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6b7280',
	`position` real,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationNoteStatus_organizationId_name_key` ON `OrganizationNoteStatus` (`organizationId`,`name`);--> statement-breakpoint
CREATE INDEX `OrganizationNoteStatus_organizationId_position_idx` ON `OrganizationNoteStatus` (`organizationId`,`position`);--> statement-breakpoint
CREATE INDEX `OrganizationNoteStatus_organizationId_idx` ON `OrganizationNoteStatus` (`organizationId`);--> statement-breakpoint
CREATE TABLE `OrganizationNoteUpload` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`altText` text,
	`objectKey` text NOT NULL,
	`thumbnailKey` text,
	`duration` integer,
	`fileSize` integer,
	`mimeType` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`noteId` text NOT NULL,
	FOREIGN KEY (`noteId`) REFERENCES `OrganizationNote`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `OrganizationNoteUpload_noteId_type_idx` ON `OrganizationNoteUpload` (`noteId`,`type`);--> statement-breakpoint
CREATE INDEX `OrganizationNoteUpload_status_idx` ON `OrganizationNoteUpload` (`status`);--> statement-breakpoint
CREATE INDEX `OrganizationNoteUpload_type_idx` ON `OrganizationNoteUpload` (`type`);--> statement-breakpoint
CREATE INDEX `OrganizationNoteUpload_noteId_idx` ON `OrganizationNoteUpload` (`noteId`);--> statement-breakpoint
CREATE TABLE `OrganizationRole` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`level` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `OrganizationRole_level_idx` ON `OrganizationRole` (`level`);--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationRole_name_key` ON `OrganizationRole` (`name`);--> statement-breakpoint
CREATE TABLE `OrganizationS3Config` (
	`id` text PRIMARY KEY NOT NULL,
	`isEnabled` integer DEFAULT false NOT NULL,
	`endpoint` text NOT NULL,
	`bucketName` text NOT NULL,
	`accessKeyId` text NOT NULL,
	`secretAccessKey` text NOT NULL,
	`region` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`organizationId` text NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationS3Config_organizationId_key` ON `OrganizationS3Config` (`organizationId`);--> statement-breakpoint
CREATE TABLE `OrganizationSiteAsset` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`type` text NOT NULL,
	`objectKey` text NOT NULL,
	`width` integer,
	`height` integer,
	`mimeType` text,
	`status` text DEFAULT 'processing' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `OrganizationSiteAsset_organizationId_type_key` ON `OrganizationSiteAsset` (`organizationId`,`type`);--> statement-breakpoint
CREATE INDEX `OrganizationSiteAsset_organizationId_type_idx` ON `OrganizationSiteAsset` (`organizationId`,`type`);--> statement-breakpoint
CREATE INDEX `OrganizationSiteAsset_organizationId_idx` ON `OrganizationSiteAsset` (`organizationId`);--> statement-breakpoint
CREATE TABLE `Passkey` (
	`id` text PRIMARY KEY NOT NULL,
	`aaguid` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`publicKey` blob NOT NULL,
	`userId` text NOT NULL,
	`webauthnUserId` text NOT NULL,
	`counter` integer NOT NULL,
	`deviceType` text NOT NULL,
	`backedUp` integer NOT NULL,
	`transports` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Passkey_userId_idx` ON `Passkey` (`userId`);--> statement-breakpoint
CREATE TABLE `Password` (
	`hash` text NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Password_userId_key` ON `Password` (`userId`);--> statement-breakpoint
CREATE TABLE `Permission` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`access` text NOT NULL,
	`context` text DEFAULT 'system' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Permission_action_entity_access_context_key` ON `Permission` (`action`,`entity`,`access`,`context`);--> statement-breakpoint
CREATE TABLE `RateLimitEntry` (
	`id` text PRIMARY KEY NOT NULL,
	`keyId` text NOT NULL,
	`keyType` text NOT NULL,
	`keyValue` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `RateLimitEntry_createdAt_idx` ON `RateLimitEntry` (`createdAt`);--> statement-breakpoint
CREATE INDEX `RateLimitEntry_keyId_createdAt_idx` ON `RateLimitEntry` (`keyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `RateLimitEntry_keyId_idx` ON `RateLimitEntry` (`keyId`);--> statement-breakpoint
CREATE TABLE `RefreshToken` (
	`id` text PRIMARY KEY NOT NULL,
	`tokenHash` text NOT NULL,
	`userId` text NOT NULL,
	`userAgent` text,
	`ipAddress` text,
	`revoked` integer DEFAULT false NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `RefreshToken_expiresAt_idx` ON `RefreshToken` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `RefreshToken_userId_revoked_idx` ON `RefreshToken` (`userId`,`revoked`);--> statement-breakpoint
CREATE INDEX `RefreshToken_userId_idx` ON `RefreshToken` (`userId`);--> statement-breakpoint
CREATE TABLE `Role` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Role_name_key` ON `Role` (`name`);--> statement-breakpoint
CREATE TABLE `SSOConfiguration` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`providerName` text NOT NULL,
	`issuerUrl` text NOT NULL,
	`clientId` text NOT NULL,
	`clientSecret` text NOT NULL,
	`authorizationUrl` text,
	`tokenUrl` text,
	`userinfoUrl` text,
	`revocationUrl` text,
	`scopes` text DEFAULT 'openid email profile' NOT NULL,
	`autoDiscovery` integer DEFAULT true NOT NULL,
	`pkceEnabled` integer DEFAULT true NOT NULL,
	`autoProvision` integer DEFAULT true NOT NULL,
	`defaultRole` text DEFAULT 'member' NOT NULL,
	`attributeMapping` text,
	`isEnabled` integer DEFAULT false NOT NULL,
	`lastTested` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdById` text,
	`requireVerifiedEmail` integer DEFAULT false NOT NULL,
	`allowedEmailDomains` text,
	`enforceSSOLogin` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `SSOConfiguration_isEnabled_idx` ON `SSOConfiguration` (`isEnabled`);--> statement-breakpoint
CREATE INDEX `SSOConfiguration_organizationId_idx` ON `SSOConfiguration` (`organizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `SSOConfiguration_organizationId_key` ON `SSOConfiguration` (`organizationId`);--> statement-breakpoint
CREATE TABLE `SSOSession` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`ssoConfigId` text NOT NULL,
	`providerUserId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`ssoConfigId`) REFERENCES `SSOConfiguration`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `SSOSession_providerUserId_idx` ON `SSOSession` (`providerUserId`);--> statement-breakpoint
CREATE INDEX `SSOSession_ssoConfigId_idx` ON `SSOSession` (`ssoConfigId`);--> statement-breakpoint
CREATE UNIQUE INDEX `SSOSession_sessionId_key` ON `SSOSession` (`sessionId`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`expirationDate` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`userId` text NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Session_userId_idx` ON `Session` (`userId`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`name` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`isBanned` integer DEFAULT false NOT NULL,
	`banReason` text,
	`banExpiresAt` integer,
	`bannedAt` integer,
	`bannedById` text,
	FOREIGN KEY (`bannedById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_username_key` ON `User` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_key` ON `User` (`email`);--> statement-breakpoint
CREATE TABLE `UserImage` (
	`id` text PRIMARY KEY NOT NULL,
	`altText` text,
	`objectKey` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserImage_userId_key` ON `UserImage` (`userId`);--> statement-breakpoint
CREATE TABLE `UserOrganization` (
	`userId` text NOT NULL,
	`organizationId` text NOT NULL,
	`organizationRoleId` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`department` text,
	PRIMARY KEY(`userId`, `organizationId`),
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`organizationRoleId`) REFERENCES `OrganizationRole`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `UserOrganization_organizationRoleId_idx` ON `UserOrganization` (`organizationRoleId`);--> statement-breakpoint
CREATE INDEX `UserOrganization_organizationId_idx` ON `UserOrganization` (`organizationId`);--> statement-breakpoint
CREATE INDEX `UserOrganization_userId_idx` ON `UserOrganization` (`userId`);--> statement-breakpoint
CREATE TABLE `UtmSource` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text,
	`medium` text,
	`campaign` text,
	`term` text,
	`content` text,
	`referrer` text,
	`createdAt` integer NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UtmSource_userId_key` ON `UtmSource` (`userId`);--> statement-breakpoint
CREATE TABLE `Verification` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`secret` text NOT NULL,
	`algorithm` text NOT NULL,
	`digits` integer NOT NULL,
	`period` integer NOT NULL,
	`charSet` text NOT NULL,
	`expiresAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Verification_target_type_key` ON `Verification` (`target`,`type`);--> statement-breakpoint
CREATE TABLE `WaitlistEntry` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`points` integer DEFAULT 1 NOT NULL,
	`referralCode` text NOT NULL,
	`hasJoinedDiscord` integer DEFAULT false NOT NULL,
	`hasEarlyAccess` integer DEFAULT false NOT NULL,
	`grantedAccessAt` integer,
	`grantedAccessBy` text,
	`referredById` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`grantedAccessBy`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`referredById`) REFERENCES `WaitlistEntry`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `WaitlistEntry_grantedAccessBy_idx` ON `WaitlistEntry` (`grantedAccessBy`);--> statement-breakpoint
CREATE INDEX `WaitlistEntry_hasEarlyAccess_idx` ON `WaitlistEntry` (`hasEarlyAccess`);--> statement-breakpoint
CREATE INDEX `WaitlistEntry_points_createdAt_idx` ON `WaitlistEntry` (`points`,`createdAt`);--> statement-breakpoint
CREATE INDEX `WaitlistEntry_referralCode_idx` ON `WaitlistEntry` (`referralCode`);--> statement-breakpoint
CREATE INDEX `WaitlistEntry_userId_idx` ON `WaitlistEntry` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `WaitlistEntry_referralCode_key` ON `WaitlistEntry` (`referralCode`);--> statement-breakpoint
CREATE UNIQUE INDEX `WaitlistEntry_userId_key` ON `WaitlistEntry` (`userId`);--> statement-breakpoint
CREATE TABLE `WebsitePage` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`template` text DEFAULT 'blank' NOT NULL,
	`isHomePage` integer DEFAULT false NOT NULL,
	`position` real,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`createdById` text NOT NULL,
	`seoTitle` text,
	`seoDescription` text,
	`seoImageUrl` text,
	`seoNoIndex` integer DEFAULT false NOT NULL,
	`publishedData` text,
	FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `WebsitePage_organizationId_slug_key` ON `WebsitePage` (`organizationId`,`slug`);--> statement-breakpoint
CREATE INDEX `WebsitePage_organizationId_status_idx` ON `WebsitePage` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `WebsitePage_organizationId_idx` ON `WebsitePage` (`organizationId`);--> statement-breakpoint
CREATE TABLE `WebsitePageSection` (
	`id` text PRIMARY KEY NOT NULL,
	`pageId` text NOT NULL,
	`type` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`position` real NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`pageId`) REFERENCES `WebsitePage`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `WebsitePageSection_pageId_position_idx` ON `WebsitePageSection` (`pageId`,`position`);--> statement-breakpoint
CREATE INDEX `WebsitePageSection_pageId_idx` ON `WebsitePageSection` (`pageId`);--> statement-breakpoint
CREATE TABLE `_OrganizationPermissionToRole` (
	`A` text NOT NULL,
	`B` text NOT NULL,
	FOREIGN KEY (`A`) REFERENCES `OrganizationRole`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`B`) REFERENCES `Permission`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `_OrganizationPermissionToRole_B_index` ON `_OrganizationPermissionToRole` (`B`);--> statement-breakpoint
CREATE UNIQUE INDEX `_OrganizationPermissionToRole_AB_unique` ON `_OrganizationPermissionToRole` (`A`,`B`);--> statement-breakpoint
CREATE TABLE `_PermissionToRole` (
	`A` text NOT NULL,
	`B` text NOT NULL,
	FOREIGN KEY (`A`) REFERENCES `Permission`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`B`) REFERENCES `Role`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `_PermissionToRole_B_index` ON `_PermissionToRole` (`B`);--> statement-breakpoint
CREATE UNIQUE INDEX `_PermissionToRole_AB_unique` ON `_PermissionToRole` (`A`,`B`);--> statement-breakpoint
CREATE TABLE `_RoleToUser` (
	`A` text NOT NULL,
	`B` text NOT NULL,
	FOREIGN KEY (`A`) REFERENCES `Role`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `_RoleToUser_B_index` ON `_RoleToUser` (`B`);--> statement-breakpoint
CREATE UNIQUE INDEX `_RoleToUser_AB_unique` ON `_RoleToUser` (`A`,`B`);--> statement-breakpoint
INSERT INTO "OrganizationRole" ("id", "name", "description", "level", "createdAt", "updatedAt") VALUES ('org_role_admin', 'admin', 'Full access to organization settings and members', 4, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_role_member', 'member', 'Standard organization member with note access', 3, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_role_viewer', 'viewer', 'Read-only access to organization notes', 2, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_role_guest', 'guest', 'Limited access for temporary collaborators', 1, CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);--> statement-breakpoint
INSERT INTO "Permission" ("id", "action", "entity", "access", "context", "description", "createdAt", "updatedAt") VALUES ('org_perm_create_note_own', 'create', 'note', 'own', 'organization', 'Create notes within organization', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_read_note_own', 'read', 'note', 'own', 'organization', 'Read own notes within organization', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_read_note_org', 'read', 'note', 'org', 'organization', 'Read organization notes', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_update_note_own', 'update', 'note', 'own', 'organization', 'Update own notes within organization', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_update_note_org', 'update', 'note', 'org', 'organization', 'Update organization notes', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_delete_note_own', 'delete', 'note', 'own', 'organization', 'Delete own notes within organization', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_delete_note_org', 'delete', 'note', 'org', 'organization', 'Delete organization notes', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_read_member_any', 'read', 'member', 'any', 'organization', 'View organization members', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_create_member_any', 'create', 'member', 'any', 'organization', 'Invite new organization members', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_update_member_any', 'update', 'member', 'any', 'organization', 'Update organization member roles', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_delete_member_any', 'delete', 'member', 'any', 'organization', 'Remove organization members', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_update_settings_any', 'update', 'settings', 'any', 'organization', 'Update organization settings', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_read_settings_any', 'read', 'settings', 'any', 'organization', 'View organization settings', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_read_website_any', 'read', 'website', 'any', 'organization', 'View website pages and the page builder', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000), ('org_perm_update_website_any', 'update', 'website', 'any', 'organization', 'Edit website pages, announcements, and translations', CAST(strftime('%s','now') AS INTEGER) * 1000, CAST(strftime('%s','now') AS INTEGER) * 1000);--> statement-breakpoint
INSERT INTO "_OrganizationPermissionToRole" ("A", "B") VALUES ('org_role_admin', 'org_perm_create_note_own'), ('org_role_admin', 'org_perm_read_note_own'), ('org_role_admin', 'org_perm_read_note_org'), ('org_role_admin', 'org_perm_update_note_own'), ('org_role_admin', 'org_perm_update_note_org'), ('org_role_admin', 'org_perm_delete_note_own'), ('org_role_admin', 'org_perm_delete_note_org'), ('org_role_admin', 'org_perm_read_member_any'), ('org_role_admin', 'org_perm_create_member_any'), ('org_role_admin', 'org_perm_update_member_any'), ('org_role_admin', 'org_perm_delete_member_any'), ('org_role_admin', 'org_perm_update_settings_any'), ('org_role_admin', 'org_perm_read_settings_any'), ('org_role_admin', 'org_perm_read_website_any'), ('org_role_admin', 'org_perm_update_website_any'), ('org_role_member', 'org_perm_create_note_own'), ('org_role_member', 'org_perm_read_note_own'), ('org_role_member', 'org_perm_read_note_org'), ('org_role_member', 'org_perm_update_note_own'), ('org_role_member', 'org_perm_delete_note_own'), ('org_role_member', 'org_perm_read_member_any'), ('org_role_viewer', 'org_perm_read_note_own'), ('org_role_viewer', 'org_perm_read_note_org'), ('org_role_viewer', 'org_perm_read_member_any');