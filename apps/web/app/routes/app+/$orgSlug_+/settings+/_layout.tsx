import { Outlet, useLocation, useRouteLoaderData } from "react-router";
import { Link } from "react-router";
import { cn } from "#app/utils/misc";
import { type loader as rootLoader } from "#app/root.tsx";

export default function SettingsLayout() {
  const rootData = useRouteLoaderData<typeof rootLoader>('root');
  const location = useLocation();
  const orgSlug = rootData?.userOrganizations?.currentOrganization?.organization.slug;


  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization settings and preferences.
        </p>
      </div>
      
      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}