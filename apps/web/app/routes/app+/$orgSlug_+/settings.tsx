import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { invariant } from "@epic-web/invariant";
import { type ActionFunctionArgs, type LoaderFunctionArgs, Form, useLoaderData } from "react-router";
import { z } from "zod";

import { requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { redirectWithToast } from "#app/utils/toast.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  invariant(params.orgSlug, "orgSlug is required");
  const organization = await prisma.organization.findFirst({
    where: {
      slug: params.orgSlug,
      users: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!organization) {
    throw new Response("Not Found", { status: 404 });
  }

  return { organization };
}

const SettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  invariant(params.orgSlug, "orgSlug is required");
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: SettingsSchema });

  if (!submission.status || submission.status !== 'success') {
    return Response.json(submission);
  }

  const { name, slug } = submission.value;

  const organization = await prisma.organization.findFirst({
    where: {
      slug: params.orgSlug,
      users: {
        some: {
          userId,
        },
      },
    },
    select: { id: true },
  });

  if (!organization) {
    throw new Response("Not Found", { status: 404 });
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: { name, slug },
  });

  return redirectWithToast(`/app/${slug}/settings`, {
    title: "Organization updated",
    description: "Your organization's settings have been updated.",
  });
}

export default function OrganizationSettings() {
  const { organization } = useLoaderData<typeof loader>();
  const [form, fields] = useForm({
    id: "organization-settings-form",
    constraint: getZodConstraint(SettingsSchema),
    lastResult: null,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SettingsSchema });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Organization Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your organization's settings.
        </p>
      </div>
      <Form method="post" {...getFormProps(form)}>
        <div className="space-y-4">
          <div>
            <label htmlFor={fields.name.id}>Name</label>
            <input {...getInputProps(fields.name, {type: 'text'})} defaultValue={organization.name} />
            <div>{fields.name.errors}</div>
          </div>
          <div>
            <label htmlFor={fields.slug.id}>Slug</label>
            <input {...getInputProps(fields.slug, {type: 'text'})} defaultValue={organization.slug} />
            <div>{fields.slug.errors}</div>
          </div>
        </div>
        <button type="submit">Save</button>
      </Form>
    </div>
  );
}
