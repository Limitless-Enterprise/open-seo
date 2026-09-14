import { customerHasPaidPlan } from "@/server/billing/subscription";
import { AppError } from "@/server/lib/errors";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";

/**
 * AI Visibility (Brand Lookup, Prompt Explorer) is gated on the paid plan in
 * hosted mode because each call fans out to several paid DataForSEO requests.
 * Self-hosted deployments pay DataForSEO directly and are not gated.
 */
export async function assertAiVisibilityPaidPlan(organizationId: string) {
  if (!(await isHostedServerAuthMode())) return;
  if (await customerHasPaidPlan(organizationId)) return;
  throw new AppError(
    "PAYMENT_REQUIRED",
    "Upgrade to the paid plan to use AI Visibility",
  );
}
