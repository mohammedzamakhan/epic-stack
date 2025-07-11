import { useState } from 'react';
import { type LoaderFunctionArgs, Link, useLoaderData } from 'react-router';
import { Search, ChevronRight, FolderOpen } from 'lucide-react';
import { Button } from '#app/components/ui/button';
import { Input } from '#app/components/ui/input';
import { requireUserId } from '#app/utils/auth.server';
import { type UserOrganizationWithRole, getUserOrganizations } from '#app/utils/organizations.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const organizations = await getUserOrganizations(userId);

  return { organizations };
}

export default function OrganizationsPage() {
  const { organizations } = useLoaderData<typeof loader>();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrganizations = organizations.filter((org: UserOrganizationWithRole) =>
    org.organization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.organization.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Organizations</h1>
        <p className="text-muted-foreground mb-6">Jump into an existing organization or add a new one.</p>
        
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
          <Button asChild>
            <Link to="/organizations/create">
              <span className="mr-1">+</span>
              Add organization
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {filteredOrganizations.map((org: UserOrganizationWithRole) => (
          <Link
            key={org.organization.id}
            to={`/app/${org.organization.slug}`}
            className="block"
          >
            <div className="flex items-center justify-between p-4 bg-background hover:bg-muted/50 rounded-lg border transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-medium text-sm">
                  {org.organization.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{org.organization.name}</div>
                  <div className="text-sm text-muted-foreground">/app/{org.organization.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">1</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}

        {(filteredOrganizations.length === 0 && searchQuery) || organizations.length === 0 ? (
          <div className="border border-border rounded-lg p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-lg font-medium mb-2">No organization found</div>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'Adjust your search query to show more.' : 'You haven\'t joined any organizations yet.'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
