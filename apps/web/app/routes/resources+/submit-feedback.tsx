import { json } from "@remix-run/node";
import { prisma } from "~/db.server";
import { requireUserId, requireUser } from "~/utils/auth.server";
import { userHasOrgAccess } from "~/utils/org";
import { z } from "zod";
import type { ActionFunctionArgs } from "@remix-run/node";

const FeedbackSchema = z.object({
  message: z.string().min(1),
  rating: z.enum(["negative", "neutral", "positive"]),
  orgSlug: z.string().optional(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") return json({ error: "Method Not Allowed" }, { status: 405 });

  const userId = await requireUserId(request);
  let data: z.infer<typeof FeedbackSchema>;
  try {
    data = FeedbackSchema.parse(await request.json());
  } catch (e) {
    return json({ error: "Invalid data" }, { status: 400 });
  }

  let organizationId: string | undefined = undefined;
  if (data.orgSlug) {
    const org = await prisma.organization.findUnique({ where: { slug: data.orgSlug } });
    if (!org) return json({ error: "Organization not found" }, { status: 404 });
    const user = await requireUser(request);
    if (!(await userHasOrgAccess({ user, org }))) {
      return json({ error: "No access to organization" }, { status: 403 });
    }
    organizationId = org.id;
  }

  await prisma.feedback.create({
    data: {
      message: data.message,
      rating: data.rating,
      userId,
      organizationId,
    },
  });

  return json({ status: "success" });
};