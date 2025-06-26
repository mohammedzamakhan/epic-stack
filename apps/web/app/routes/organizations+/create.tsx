import { redirect, type ActionFunctionArgs, Form, Link, useActionData } from 'react-router';
import { z } from 'zod';
import { Button } from '#app/components/ui/button';
import { Input } from '#app/components/ui/input';
import { Label } from '#app/components/ui/label';

import { requireUserId } from '#app/utils/auth.server';
import { createOrganization } from '#app/utils/organizations.server';

const CreateOrganizationSchema = z.object({
  name: z.string().min(2, { message: 'Organization name is required' }),
  slug: z
    .string()
    .min(2, { message: 'Slug is required' })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message:
        'Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen',
    }),
  description: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const result = CreateOrganizationSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 });
  }

  const { name, slug, description } = result.data;

  try {
    const organization = await createOrganization({
      name,
      slug,
      description,
      userId: userId,
    });

    return redirect(`/organizations/${organization.slug}`);
  } catch (error) {
    console.error('Failed to create organization', error);
    return Response.json(
      {
        errors: {
          formErrors: ['Failed to create organization'],
          fieldErrors: {},
        },
      },
      { status: 500 },
    );
  }
}

export default function CreateOrganizationPage() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create a New Organization</h1>
        <p className="text-gray-600">
          Create a new organization to collaborate with your team.
        </p>
      </div>

      <Form method="post" className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Acme Inc."
              className="mt-1"
              required
            />
            {actionData?.errors?.fieldErrors?.name ? (
              <p className="mt-1 text-sm text-red-500">
                {actionData.errors.fieldErrors.name[0]}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              placeholder="acme"
              className="mt-1"
              required
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            />
            <p className="mt-1 text-sm text-gray-500">
              Used in URLs: example.com/organizations/your-slug
            </p>
            {actionData?.errors?.fieldErrors?.slug ? (
              <p className="mt-1 text-sm text-red-500">
                {actionData.errors.fieldErrors.slug[0]}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <textarea
              id="description"
              name="description"
              className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>

        {actionData?.errors?.formErrors?.length ? (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="text-red-700">
                <p>Failed to create organization:</p>
                <ul className="list-disc pl-5">
                  {actionData.errors.formErrors.map((error: string) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link to="/organizations">Cancel</Link>
          </Button>
          <Button type="submit">Create Organization</Button>
        </div>
      </Form>
    </div>
  );
}
