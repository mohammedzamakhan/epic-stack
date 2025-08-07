import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { prisma } from "~/db.server";
import { requireUserWithRole } from "~/utils/auth.server";
import { Icon } from "~/app/components/icon";

export const loader = async ({ request }) => {
  await requireUserWithRole(request, "admin");
  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
      organization: { select: { id: true, name: true } },
    },
  });
  return json({ feedbacks });
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

const ratingIcon = {
  negative: "face-frown",
  neutral: "face-meh",
  positive: "face-smile",
};

export default function AdminFeedbacksPage() {
  const { feedbacks } = useLoaderData<typeof loader>();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">User Feedback</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-muted">
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">User</th>
              <th className="py-2 px-4 border-b">Organization</th>
              <th className="py-2 px-4 border-b">Rating</th>
              <th className="py-2 px-4 border-b">Message</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map(fb => (
              <tr key={fb.id}>
                <td className="py-2 px-4 border-b text-sm">{formatDate(fb.createdAt)}</td>
                <td className="py-2 px-4 border-b">
                  {fb.user?.name || fb.user?.email || "Unknown"}
                </td>
                <td className="py-2 px-4 border-b">{fb.organization?.name || <i>—</i>}</td>
                <td className="py-2 px-4 border-b text-center">
                  <Icon name={ratingIcon[fb.rating] || "face-meh"} className={
                    fb.rating === "positive" ? "text-green-500"
                    : fb.rating === "negative" ? "text-red-500"
                    : "text-yellow-500"
                  } />
                </td>
                <td className="py-2 px-4 border-b whitespace-pre-wrap">{fb.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}