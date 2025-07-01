import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { invariant } from "@epic-web/invariant";
import { type ActionFunctionArgs, type LoaderFunctionArgs, Form, useLoaderData, useActionData, useFetcher } from "react-router";
import { z } from "zod";

import { requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { redirectWithToast } from "#app/utils/toast.server";
import { OrganizationInvitations } from "#app/components/organization-invitations";
import { OrganizationInvitationsSimple } from "#app/components/organization-invitations-simple";
import { OrganizationMembers } from "#app/components/organization-members";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "#app/components/ui/card";
import { Button } from "#app/components/ui/button";
import { StatusButton } from "#app/components/ui/status-button";
import { Field, ErrorList } from "#app/components/forms";
import { 
  createOrganizationInvitation, 
  sendOrganizationInvitationEmail,
  getOrganizationInvitations,
  deleteOrganizationInvitation 
} from "#app/utils/organization-invitation.server";

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

  const [pendingInvitations, members] = await Promise.all([
    getOrganizationInvitations(organization.id),
    prisma.userOrganization.findMany({
      where: {
        organizationId: organization.id,
        active: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: {
              select: {
                id: true,
                altText: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    }),
  ]);

  return { organization, pendingInvitations, members, currentUserId: userId };
}

const SettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

const InviteSchema = z.object({
  invites: z
    .array(
      z.object({
        email: z.string().email('Invalid email address'),
        role: z.enum(['admin', 'member']),
      }),
    )
    .min(1, 'At least one invite is required'),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  invariant(params.orgSlug, "orgSlug is required");
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Get the organization first
  const organization = await prisma.organization.findFirst({
    where: {
      slug: params.orgSlug,
      users: {
        some: {
          userId,
        },
      },
    },
    select: { id: true, name: true },
  });

  if (!organization) {
    throw new Response("Not Found", { status: 404 });
  }

  if (intent === "invite") {
    const submission = parseWithZod(formData, { schema: InviteSchema });

    if (submission.status !== 'success') {
      return Response.json({ result: submission.reply() }, { status: 400 });
    }

    const { invites } = submission.value;

    try {
      // Get current user for inviter name
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });

      await Promise.all(
        invites.map(async (invite) => {
          const { invitation } = await createOrganizationInvitation({
            organizationId: organization.id,
            email: invite.email,
            role: invite.role,
            inviterId: userId,
          });

          await sendOrganizationInvitationEmail({
            invitation,
            organizationName: organization.name,
            inviterName: currentUser?.name || currentUser?.email || 'Someone',
          });
        })
      );

      return Response.json({ result: submission.reply({ resetForm: true }) });
    } catch (error) {
      console.error('Error sending invitations:', error);
      return Response.json(
        {
          result: submission.reply({
            formErrors: ['An error occurred while sending the invitations.'],
          }),
        },
        { status: 500 }
      );
    }
  }

  if (intent === "remove-invitation") {
    const invitationId = formData.get("invitationId") as string;
    
    try {
      await deleteOrganizationInvitation(invitationId);
      return Response.json({ success: true });
    } catch (error) {
      console.error('Error removing invitation:', error);
      return Response.json({ error: 'Failed to remove invitation' }, { status: 500 });
    }
  }

  if (intent === "remove-member") {
    const memberUserId = formData.get("userId") as string;
    
    // Prevent removing yourself
    if (memberUserId === userId) {
      return Response.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }
    
    try {
      await prisma.userOrganization.update({
        where: {
          userId_organizationId: {
            userId: memberUserId,
            organizationId: organization.id,
          },
        },
        data: {
          active: false,
        },
      });
      return Response.json({ success: true });
    } catch (error) {
      console.error('Error removing member:', error);
      return Response.json({ error: 'Failed to remove member' }, { status: 500 });
    }
  }

  // Organization settings update
  if (intent === "update-settings") {
    // Log all form data entries for debugging
    console.log("Form data received:", Object.fromEntries([...formData.entries()]));
    
    const submission = parseWithZod(formData, { 
      schema: SettingsSchema 
    });

    if (submission.status !== 'success') {
      return Response.json({ result: submission.reply() });
    }

    const { name, slug } = submission.value;
    
    try {
      await prisma.organization.update({
        where: { id: organization.id },
        data: { name, slug },
      });
      
      return redirectWithToast(`/app/${slug}/settings`, {
        title: "Organization updated",
        description: "Your organization's settings have been updated.",
        type: "success",
      });
    } catch (error) {
      console.error("Error updating organization:", error);
      return Response.json({ 
        result: submission.reply({
          formErrors: ["Failed to update organization settings. Please try again."]
        })
      });
    }
  }
  
  // No valid intent found
  return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 });
}

export default function OrganizationSettings() {
  const { organization, pendingInvitations, members, currentUserId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const fetcher = useFetcher();
  
  const [form, fields] = useForm({
    id: "organization-settings-form",
    constraint: getZodConstraint(SettingsSchema),
    lastResult: fetcher.data?.result || actionData?.result,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SettingsSchema });
    },
    defaultValue: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  return (
    <div className="flex flex-col gap-6 p-8 scroll-auto h-[calc(100vh-64px)] overflow-y-auto">
      <div>
        <h3 className="text-lg font-medium">Organization Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your organization's settings and team members.
        </p>
      </div>

      {/* Organization Settings Form */}
      <Card className="w-full">
        <CardHeader className="border-b border-muted">
          <CardTitle className="text-xl">General Settings</CardTitle>
          <CardDescription>Update your organization details</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <fetcher.Form method="POST" {...getFormProps(form)}>
            <input type="hidden" name="intent" value="update-settings" />
            <div className="grid grid-cols-6 gap-x-10">
              <Field
                className="col-span-3"
                labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
                inputProps={getInputProps(fields.name, {type: 'text'})}
                errors={fields.name.errors}
              />
              <Field
                className="col-span-3"
                labelProps={{ htmlFor: fields.slug.id, children: 'Slug' }}
                inputProps={getInputProps(fields.slug, {type: 'text'})}
                errors={fields.slug.errors}
              />
            </div>
            <ErrorList id={form.errorId} errors={form.errors} />
          </fetcher.Form>
        </CardContent>
        <CardFooter className="justify-end border-t border-muted pt-4">
          <StatusButton
            form={form.id}
            type="submit"
            variant="outline"
            name="intent" 
            value="update-settings"
            status={fetcher.state !== 'idle' ? 'pending' : form.status ?? 'idle'}
          >
            Save changes
          </StatusButton>
        </CardFooter>
      </Card>
      
      {/* Organization Members */}
      <OrganizationMembers 
        members={members}
        currentUserId={currentUserId}
      />
      
      {/* Organization Invitations */}
      <OrganizationInvitations 
        pendingInvitations={pendingInvitations}
        actionData={actionData}
      />
    </div>
  );
}
