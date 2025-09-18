// Organization types
export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  planName?: string
  size?: string
  createdAt: string
  active: boolean
}

export interface OrganizationRole {
  id: string
  name: string
  description: string
  level: number
}

export interface UserOrganization {
  id: string
  name: string
  slug: string
  description?: string
  planName?: string
  size?: string
  createdAt: string
  role: OrganizationRole
  isDefault: boolean
  department?: string
  joinedAt: string
}

export interface OrganizationsApiResponse {
  success: true
  data: {
    organizations: UserOrganization[]
  }
  status: number
}

export interface OrganizationsApiError {
  success: false
  error: string
  message: string
  status: number
}