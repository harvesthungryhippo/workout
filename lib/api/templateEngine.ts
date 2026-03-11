// Replaces [variable] placeholders in a template with real values.
// Returns null if any required variable is missing.

export type TemplateVars = Record<string, string | number | null | undefined>;

export function renderTemplate(
  template: string,
  vars: TemplateVars
): { rendered: string; missing: string[] } {
  const missing: string[] = [];

  const rendered = template.replace(/\[(\w+)\]/g, (_, key: string) => {
    const val = vars[key];
    if (val === null || val === undefined || val === "") {
      missing.push(key);
      return `[${key}]`;
    }
    return String(val);
  });

  return { rendered, missing };
}

export function buildCustomerVars(
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    loyaltyPoints: number;
    loyaltyTier: string;
    totalSpent: unknown;
  },
  businessName: string,
  extra?: TemplateVars
): TemplateVars {
  return {
    first_name:    customer.firstName,
    last_name:     customer.lastName,
    email:         customer.email,
    loyalty_points: customer.loyaltyPoints,
    loyalty_tier:   customer.loyaltyTier,
    total_spent:    String(customer.totalSpent),
    business_name:  businessName,
    ...extra,
  };
}
