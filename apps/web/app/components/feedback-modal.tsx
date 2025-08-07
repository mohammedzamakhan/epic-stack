"use client";
import * as React from "react";
import { Dialog, DialogOverlay, DialogContent } from "./ui/dialog";
import { Icon } from "./icon";
import { toast } from "./ui/use-toast"; // adjust import path as needed

const SENTIMENTS = [
  { id: "negative", icon: "face-frown", label: "Negative" },
  { id: "neutral", icon: "face-meh", label: "Neutral" },
  { id: "positive", icon: "face-smile", label: "Positive" },
] as const;

type Sentiment = typeof SENTIMENTS[number]["id"];

interface FeedbackModalProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  orgSlug?: string;
}

export function FeedbackModal({ open, setOpen, orgSlug }: FeedbackModalProps) {
  const [selected, setSelected] = React.useState<Sentiment | null>(null);
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/resources/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, rating: selected, orgSlug }),
      });
      if (res.ok) {
        toast({ title: "Thank you!", description: "Your feedback was submitted." });
        setMessage("");
        setSelected(null);
        setOpen(false);
      } else {
        toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogOverlay />
      <DialogContent className="max-w-md w-full">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold mb-2">Send Feedback</h2>
          <div className="flex justify-center gap-6 mb-2">
            {SENTIMENTS.map((s) => (
              <button
                type="button"
                key={s.id}
                aria-label={s.label}
                className={`p-2 rounded-full border-2 ${selected === s.id
                  ? "border-primary bg-muted"
                  : "border-transparent"
                } transition`}
                onClick={() => setSelected(s.id)}
                tabIndex={0}
              >
                <Icon name={s.icon} className={`w-8 h-8 ${selected === s.id ? "text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded border px-2 py-1"
            placeholder="Your feedback..."
            required
            minLength={1}
            disabled={loading}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selected || !message.trim() || loading}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}