import { Link } from 'react-router'
import { SignOutOfSessions, DeleteData } from '#app/components/settings/account-management.tsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

export const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
export const deleteDataActionIntent = 'delete-data'

interface AdvancedSettingsCardProps {
  user: {
    id: string
    _count: {
      sessions: number
    }
  }
}

export function AdvancedSettingsCard({ user }: AdvancedSettingsCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="border-b border-muted">
        <CardTitle className="text-xl">Advanced Settings</CardTitle>
        <CardDescription>Manage your data and account sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex items-center">
            <Icon name="download" className="mr-2" />
            <Link
              reloadDocument
              download="my-epic-notes-data.json"
              to="/resources/download-user-data"
              className="hover:underline"
            >
              Download your data
            </Link>
          </div>
          <SignOutOfSessions data={{ user }} />
          <DeleteData />
        </div>
      </CardContent>
    </Card>
  )
}
