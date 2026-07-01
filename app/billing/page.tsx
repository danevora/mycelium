import { PricingTable } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

/**
 * Upgrade page. Plans are configured in the Clerk dashboard (Billing); the `pro`
 * plan slug must match CLERK_PRO_PLAN_SLUG. Subscription state lives in Clerk and
 * is read back via `isProUser()` (lib/billing.ts).
 */
export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Upgrade to Pro</h1>
        <p className="mt-1 text-muted">
          Pro unlocks up to 5 wikis and higher daily AI limits.
        </p>
      </div>
      <PricingTable />
    </div>
  );
}
