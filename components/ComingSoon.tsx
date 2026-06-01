import { PageHeader } from "@/components/ui";

// Temporary placeholder for pages built in later steps (7–10). Keeps the
// bottom-nav navigable while we land the trading slice first.
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="px-4 py-16 text-center text-sm text-text-muted">{note}</div>
    </>
  );
}
