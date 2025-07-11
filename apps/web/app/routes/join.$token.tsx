import { type LoaderFunctionArgs } from "react-router";
import { requireUserId } from "#app/utils/auth.server";
import { validateAndAcceptInvitation } from "#app/utils/organization-invitation.server";
import { redirectWithToast } from "#app/utils/toast.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const token = params.token;

  if (!token) {
    throw new Response("Invalid invitation link", { status: 400 });
  }

  try {
    const { organization, alreadyMember } = await validateAndAcceptInvitation(token, userId);

    if (alreadyMember) {
      return redirectWithToast(`/app/${organization.slug}`, {
        title: "Already a member",
        description: `You're already a member of ${organization.name}.`,
      });
    }

    return redirectWithToast(`/app/${organization.slug}`, {
      title: "Welcome!",
      description: `You've successfully joined ${organization.name}.`,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    
    if (error instanceof Error) {
      return redirectWithToast("/", {
        title: "Invalid invitation",
        description: error.message,
        type: "error",
      });
    }

    return redirectWithToast("/", {
      title: "Error",
      description: "An error occurred while processing your invitation.",
      type: "error",
    });
  }
}

// This component shouldn't render as we always redirect
export default function JoinRoute() {
  return null;
}
