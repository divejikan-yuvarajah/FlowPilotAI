import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function FailurePage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const { invoiceId } = params;

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <Card className="p-8 w-full max-w-md text-center bg-bg-surface border-border">
        <XCircle className="h-20 w-20 text-signal-danger mx-auto mb-6" />
        <h1 className="text-2xl font-display font-semibold text-ink-primary mb-2">
          Payment cancelled
        </h1>
        <p className="text-ink-secondary mb-6">
          Your payment was not completed. You can try again at any time.
        </p>
        <Button asChild className="w-full bg-pilot-500 hover:bg-pilot-600 text-white">
          <Link href={`/pay/${invoiceId}`}>Try again</Link>
        </Button>
      </Card>
    </div>
  );
}
