// User validation schemas
export {
	UsernameSchema,
	PasswordSchema,
	NameSchema,
	EmailSchema,
	PasswordAndConfirmPasswordSchema,
	USERNAME_MIN_LENGTH,
	USERNAME_MAX_LENGTH,
} from './src/user-validation.ts'

// Authentication validation schemas
export {
	LoginFormSchema,
	SignupSchema,
	MobileLoginFormSchema,
	MobileSignupSchema,
	OAuthCallbackSchema,
	SocialAuthSchema,
} from './src/auth-validation.ts'

// SSO validation schemas
export {
	SSOConfigurationSchema,
	SSOConfigurationUpdateSchema,
	SSOConnectionTestSchema,
	SSOAuthRequestSchema,
	SSOCallbackSchema,
	OIDCUserInfoSchema,
	type SSOConfigurationInput,
	type SSOConfigurationUpdate,
	type SSOConnectionTest,
	type SSOAuthRequest,
	type SSOCallback,
	type OIDCUserInfo,
} from './src/sso-validation.ts'
export * from './src/url-validation.ts'
