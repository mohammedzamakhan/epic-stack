import { type LoaderFunctionArgs, Link, useLoaderData } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '#app/components/ui/avatar';
import { Button } from '#app/components/ui/button';
import { requireUserId } from '#app/utils/auth.server';
import { type UserOrganizationWithRole, getUserOrganizations } from '#app/utils/organizations.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const organizations = await getUserOrganizations(userId);

  return { organizations };
}

export default function OrganizationsPage() {
  const { organizations } = useLoaderData<typeof loader>();

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-gray-600">Manage your organizations</p>
        </div>
        <Button asChild>
          <Link to="/organizations/create">Create Organization</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 p-4 font-medium">
          <div>Organization</div>
          <div className="text-center">Role</div>
          <div className="text-center">Actions</div>
        </div>

        <div className="divide-y">
          {organizations.map((org: UserOrganizationWithRole) => (
            <div
              key={org.organization.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {org.organization.image?.id ? (
                    <AvatarImage
                      src={`/resources/organizations/${org.organization.id}/logo`}
                      alt={
                        org.organization.image.altText ||
                        `${org.organization.name} logo`
                      }
                    />
                  ) : null}
                  <AvatarFallback>
                    {org.organization.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{org.organization.name}</div>
                  <div className="text-sm text-gray-500">
                    {org.organization.slug}
                  </div>
                </div>
              </div>
              <div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {org.role}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <Link to={`/organizations/${org.organization.slug}`}>
                      View
                    </Link>
                  </Button>
                  {org.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link to={`/organizations/${org.organization.slug}/settings`}>
                        Settings
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {organizations.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="text-lg font-medium">No organizations found</div>
              <p className="text-gray-600">
                Create your first organization to get started.
              </p>
              <Button asChild className="mt-4">
                <Link to="/organizations/create">Create Organization</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
