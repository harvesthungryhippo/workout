import { prisma } from "@/lib/db/prisma";
import { AutomationTrigger, Customer } from "@prisma/client";
import { renderTemplate, buildCustomerVars } from "@/lib/api/templateEngine";

// Call this whenever a trigger event occurs in the platform.
// It finds active automations for the event and queues sends.

export async function dispatchAutomation(
  trigger: AutomationTrigger,
  customer: Customer,
  extra?: Record<string, string>
) {
  const business = await prisma.business.findUnique({
    where: { id: customer.businessId },
    select: { name: true },
  });

  const automations = await prisma.automation.findMany({
    where: {
      businessId: customer.businessId,
      trigger,
      active: true,
    },
  });

  for (const automation of automations) {
    // Check unsubscribe status
    if (automation.channel === "EMAIL" && customer.emailUnsubscribed) continue;
    if (automation.channel === "SMS"   && customer.smsUnsubscribed)   continue;

    const vars = buildCustomerVars(customer, business?.name ?? "", extra);
    const { rendered, missing } = renderTemplate(automation.body, vars);

    if (missing.length > 0) {
      console.warn(
        `[Automation] Skipped ${trigger} for ${customer.email} — missing vars: ${missing.join(", ")}`
      );
      continue;
    }

    if (automation.delayMinutes > 0) {
      // TODO: enqueue a delayed job (e.g. via a job queue like BullMQ)
      console.log(
        `[Automation] Queuing ${trigger} to ${customer.email} in ${automation.delayMinutes}min`
      );
    } else {
      // TODO: send immediately via email/SMS provider
      console.log(`[Automation] Sending ${trigger} to ${customer.email}: ${rendered.slice(0, 80)}...`);
    }
  }
}

// ─── Convenience callers — import these wherever events happen ───────────────

export const triggerFirstVisit   = (c: Customer) => dispatchAutomation(AutomationTrigger.FIRST_VISIT,     c);
export const triggerOrderConfirm = (c: Customer) => dispatchAutomation(AutomationTrigger.ORDER_CONFIRMED, c);
export const triggerLoyaltyTierUp = (c: Customer) => dispatchAutomation(AutomationTrigger.LOYALTY_TIER_UP, c);

export const triggerAppointment48h = (c: Customer) =>
  dispatchAutomation(AutomationTrigger.APPOINTMENT_48H, c, {
    appointment_date: c.nextAppointmentDate?.toLocaleDateString() ?? "",
    appointment_time: c.nextAppointmentDate?.toLocaleTimeString() ?? "",
  });
