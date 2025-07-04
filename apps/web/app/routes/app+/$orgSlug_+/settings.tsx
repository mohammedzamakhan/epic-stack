import { parseWithZod } from "@conform-to/zod";
import { invariant } from "@epic-web/invariant";
import { parseFormData } from "@mjackson/form-data-parser";
import { type ActionFunctionArgs, type LoaderFunctionArgs, useLoaderData, useActionData } from "react-router";
import { z } from "zod";

import { GeneralSettingsCard } from "#app/components/settings/cards/organization/general-settings-card";
import { InvitationsCard } from "#app/components/settings/cards/organization/invitations-card";
import { MembersCard } from "#app/components/settings/cards/organization/members-card";
import { uploadOrgPhotoActionIntent, deleteOrgPhotoActionIntent, OrgPhotoFormSchema } from "#app/components/settings/cards/organization/organization-photo-card";
import { requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { 
  createOrganizationInvitation, 
  sendOrganizationInvitationEmail,
  getOrganizationInvitations,
  deleteOrganizationInvitation 
} from "#app/utils/organization-invitation.server";
import { redirectWithToast } from "#app/utils/toast.server";
import { uploadOrganizationImage } from "#app/utils/storage.server.ts";

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
      image: {
        select: {
          id: true,
          objectKey: true,
          altText: true,
        },
      },
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
    select: { id: true, name: true, slug: true },
  });

  if (!organization) {
    throw new Response("Not Found", { status: 404 });
  }

  // Handle file uploads for organization logo
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('multipart/form-data')) {
    // Use parseFormData for multipart requests (file uploads)
    const formData = await parseFormData(request, { maxFileSize: 1024 * 1024 * 3 });
    const intent = formData.get('intent');

    const submission = await parseWithZod(formData, {
        schema: OrgPhotoFormSchema.transform(async data => {
          if (data.intent === 'delete-org-photo') return { intent: 'delete-org-photo' }
          if (data.photoFile.size <= 0) return z.NEVER
          return {
            intent: data.intent,
            image: { objectKey: await uploadOrganizationImage(userId, data.photoFile) },
          }
        }),
        async: true,
      })

    if (intent === uploadOrgPhotoActionIntent) {
      const photoFile = formData.get('photoFile') as File;
      if (!photoFile || !(photoFile instanceof File) || !photoFile.size) {
        return Response.json(
          { error: 'A valid image file is required.' },
          { status: 400 }
        );
      }

      try {
        if (submission.status !== 'success') {
          return Response.json(
            { result: submission.reply() },
            { status: submission.status === 'error' ? 400 : 200 },
          )
        }
        const { image, intent } = submission.value as { intent: string; image?: { objectKey: string } }

        // Create or update organization image
        await prisma.$transaction(async $prisma => {
          await $prisma.organizationImage.deleteMany({ where: { organizationId: organization.id } })
          await $prisma.organization.update({ 
            where: { id: organization.id }, 
            data: { image: { create: image! } } 
          })
        })

        // In a real app, you'd store the image in a storage service
        // For now, we're just simulating this part

        return Response.json({ status: 'success' });
      } catch (error) {
        console.error('Error uploading organization logo:', error);
        return Response.json(
          { error: 'Failed to upload organization logo' },
          { status: 500 }
        );
      }
    }

    if (intent === deleteOrgPhotoActionIntent) {
      try {
        await prisma.organizationImage.delete({
          where: { organizationId: organization.id },
        });

        return Response.json({ status: 'success' });
      } catch (error) {
        console.error('Error deleting organization logo:', error);
        return Response.json(
          { error: 'Failed to delete organization logo' },
          { status: 500 }
        );
      }
    }
  }

  // For non-multipart requests
  const formData = await request.formData();
  const intent = formData.get("intent");

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

  return (
    <div className="flex flex-col gap-12 p-8 scroll-auto h-[calc(100vh-64px)] overflow-y-auto">
      <div>
        <h3 className="text-lg font-medium">Organization Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your organization's settings and team members.
        </p>
      </div>

      {/* Organization Photo removed from here - will be moved inside GeneralSettingsCard */}
      
      {/* Organization General Settings */}
      <GeneralSettingsCard organization={organization} />
      
      {/* Organization Members */}
      <MembersCard 
        members={members}
        currentUserId={currentUserId}
      />
      
      {/* Organization Invitations */}
      <InvitationsCard 
        pendingInvitations={pendingInvitations}
        actionData={actionData}
      />
    </div>
  );
}
