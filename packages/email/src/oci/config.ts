import common from 'oci-common'

export interface OciEmailConfig {
	tenancyOcid: string
	userOcid: string
	fingerprint: string
	privateKey: string
	region: string
	compartmentId: string
	senderEmail: string
	senderName: string
	senderOcid?: string
}

let cachedConfig: OciEmailConfig | null | undefined

export function getOciEmailLogOcid(): string | null {
	return process.env.OCI_EMAIL_LOG_OCID?.trim() || null
}

export function getOciEmailConfig(): OciEmailConfig | null {
	if (cachedConfig !== undefined) return cachedConfig

	const tenancyOcid = process.env.OCI_TENANCY_OCID
	const userOcid = process.env.OCI_USER_OCID
	const fingerprint = process.env.OCI_FINGERPRINT
	const region = process.env.OCI_REGION
	const compartmentId = process.env.OCI_EMAIL_COMPARTMENT_ID
	const senderEmail = process.env.OCI_EMAIL_SENDER_EMAIL
	const senderName = process.env.OCI_EMAIL_SENDER_NAME || 'Epic Startup'
	const senderOcid = process.env.OCI_EMAIL_SENDER_OCID
	const privateKey = process.env.OCI_PRIVATE_KEY?.replace(/\\n/g, '\n')

	if (
		!tenancyOcid ||
		!userOcid ||
		!fingerprint ||
		!privateKey ||
		!region ||
		!compartmentId ||
		!senderEmail
	) {
		cachedConfig = null
		return null
	}

	cachedConfig = {
		tenancyOcid,
		userOcid,
		fingerprint,
		privateKey,
		region,
		compartmentId,
		senderEmail,
		senderName,
		senderOcid: senderOcid || undefined,
	}
	return cachedConfig
}

export function isOciEmailConfigured(): boolean {
	return getOciEmailConfig() !== null
}

export function createOciAuthProvider(config: OciEmailConfig) {
	return new common.SimpleAuthenticationDetailsProvider(
		config.tenancyOcid,
		config.userOcid,
		config.fingerprint,
		config.privateKey,
		null,
		common.Region.fromRegionId(config.region),
	)
}

export function resetOciEmailConfigCache() {
	cachedConfig = undefined
}
