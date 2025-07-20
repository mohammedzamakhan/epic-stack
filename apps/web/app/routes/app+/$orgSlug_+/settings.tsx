import { parseWithZod } from "@conform-to/zod";
import { invariant } from "@epic-web/invariant";
import { parseFormData } from "@mjackson/form-data-parser";
import { type ActionFunctionArgs, type LoaderFunctionArgs, useLoaderData, useActionData } from "react-router";
import { z } from "zod";

import { BillingCard } from "#app/components/settings/cards/organization/billing-card";
import { GeneralSettingsCard } from "#app/components/settings/cards/organization/general-settings-card";
import { InvitationsCard } from "#app/components/settings/cards/organization/invitations-card";
import { MembersCard } from "#app/components/settings/cards/organization/members-card";
import { IntegrationsCard, connectIntegrationActionIntent, disconnectIntegrationActionIntent } from "#app/components/settings/cards/organization/integrations-card";
import { uploadOrgPhotoActionIntent, deleteOrgPhotoActionIntent } from "#app/components/settings/cards/organization/organization-photo-card";
import { AnnotatedLayout, AnnotatedSection } from "#app/components/ui/annotated-layout";
import { requireUserId } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import {
  createOrganizationInvitation,
  sendOrganizationInvitationEmail,
  getOrganizationInvitations,
  deleteOrganizationInvitation
} from "#app/utils/organization-invitation.server";
import {
  checkoutAction,
  customerPortalAction,
  getPlansAndPrices,
} from "#app/utils/payments.server";
import { integrationManager } from "#app/utils/integrations/integration-manager";
// Initialize providers
import "#app/utils/integrations/providers";
import { uploadOrganizationImage } from "#app/utils/storage.server.ts";
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
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeProductId: true,
      planName: true,
      subscriptionStatus: true,
      image: {
        select: {
          id: true,
          objectKey: true,
          altText: true,
        },
      },
      _count: {
        select: {
          users: {
            where: {
              active: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    throw new Response("Not Found", { status: 404 });
  }

  const isClosedBeta = process.env.LAUNCH_STATUS === 'CLOSED_BETA';

  const [pendingInvitations, members, integrations] = await Promise.all([
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
    // isClosedBeta ? Promise.resolve(null) : getPlansAndPrices(),
    integrationManager.getOrganizationIntegrations(organization.id),
  ]);

  // Get available providers
  const { getAvailableProviders } = await import('#app/utils/integrations/providers');
  const availableProviders = getAvailableProviders();

  return {
    organization,
    pendingInvitations,
    members,
    currentUserId: userId,
    // plansAndPrices,
    isClosedBeta,
    integrations,
    availableProviders,
  };
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

    if (intent === uploadOrgPhotoActionIntent) {
      const photoFile = formData.get('photoFile') as File;
      if (!photoFile || !(photoFile instanceof File) || !photoFile.size) {
        return Response.json(
          { error: 'A valid image file is required.' },
          { status: 400 }
        );
      }

      try {
        // Upload the image and get the object key
        const objectKey = await uploadOrganizationImage(userId, photoFile);

        // Create or update organization image
        await prisma.$transaction(async $prisma => {
          await $prisma.organizationImage.deleteMany({ where: { organizationId: organization.id } })
          await $prisma.organization.update({
            where: { id: organization.id },
            data: { image: { create: { objectKey } } }
          })
        })

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

  // Billing actions
  if (intent === 'upgrade') {
    const organizationWithBilling = await prisma.organization.findUnique({
      where: { id: organization.id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        slug: true,
        description: true,
        active: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeProductId: true,
        planName: true,
        subscriptionStatus: true,
      },
    });

    if (!organizationWithBilling) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    return checkoutAction(request, organizationWithBilling);
  }

  if (intent === 'customer-portal') {
    const organizationWithBilling = await prisma.organization.findUnique({
      where: { id: organization.id },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        name: true,
        slug: true,
        description: true,
        active: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeProductId: true,
        planName: true,
        subscriptionStatus: true,
      },
    });

    if (!organizationWithBilling) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    return customerPortalAction(request, organizationWithBilling);
  }

  // Integration actions
  if (intent === connectIntegrationActionIntent) {
    const providerName = formData.get("providerName") as string;

    if (!providerName) {
      return Response.json({ error: 'Provider name is required' }, { status: 400 });
    }

    try {
      // Generate OAuth URL and redirect
const url = new URL(request.url);
      const protocol = url.protocol === 'https:' ? 'https:' : 'https:';
      const redirectUri = `${protocol}//${url.host}/api/integrations/oauth/callback?provider=${providerName}`;
      console.log('Redirect URI:', redirectUri);
      console.log('Organization ID:', organization.id);

      const { authUrl } = await integrationManager.initiateOAuth(
        organization.id,
        providerName,
        redirectUri
      );

      console.log('Generated OAuth URL:', authUrl);
      return Response.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      return redirectWithToast(`/app/${organization.slug}/settings`, {
        title: 'Integration failed',
        description: `Failed to initiate OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
      });
    }
  }

  if (intent === disconnectIntegrationActionIntent) {
    const integrationId = formData.get("integrationId") as string;

    if (!integrationId) {
      return Response.json({ error: 'Integration ID is required' }, { status: 400 });
    }

    try {
      await integrationManager.disconnectIntegration(integrationId);
      return Response.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      return Response.json({
        error: 'Failed to disconnect integration'
      }, { status: 500 });
    }
  }

  // No valid intent found
  return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 });
}

export default function OrganizationSettings() {
  const { organization, pendingInvitations, members, currentUserId, plansAndPrices, isClosedBeta, integrations, availableProviders } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="p-8">
      <AnnotatedLayout>
        <AnnotatedSection
          title="General Settings"
          description="Manage your organization's name, slug, and profile image."
        >
          <GeneralSettingsCard organization={organization} />
        </AnnotatedSection>

        <AnnotatedSection
          title="Members"
          description="Manage the members of your organization."
        >
          <MembersCard
            members={members}
            currentUserId={currentUserId}
          />
        </AnnotatedSection>

        <AnnotatedSection
          title="Invitations"
          description="Invite new members to your organization."
        >
          <InvitationsCard
            pendingInvitations={pendingInvitations}
            actionData={actionData}
          />
        </AnnotatedSection>

        <AnnotatedSection
          title="Integrations"
          description="Connect your organization to third-party services like Slack, Teams, and more."
        >
          <IntegrationsCard
            integrations={integrations}
            availableProviders={availableProviders}
          />
        </AnnotatedSection>

        {/* <AnnotatedSection
        title="Billing & Subscription"
        description="Manage your organization's subscription and billing settings."
      >
        <BillingCard 
          organization={organization}
          plansAndPrices={plansAndPrices}
          isClosedBeta={isClosedBeta}
        />
      </AnnotatedSection> */}
      </AnnotatedLayout>
    </div>
  );
}
