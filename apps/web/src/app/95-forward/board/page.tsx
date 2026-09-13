import { PagePlaceholder } from "@/components/shell";

export const dynamic = "force-dynamic";

// The 95 Forward landing route. `/95-forward` redirects here.
//
// A PLACEHOLDER on purpose: I25 fills it. Mocking up a plausible board would be worse than an empty
// one — a fake queue is indistinguishable from the real one in a screenshot, and the first person to
// screenshot it would be circulating a number nobody computed.
export default function BoardPage() {
  return (
    <PagePlaceholder
      eyebrow="95 Forward · the war room"
      title="The Board"
      subtitle="95 Forward"
      empty="Your day's work, ranked — what to fix first, then the moves that change the number. Being built in I25; the ranking engine behind it is already live."
    />
  );
}
