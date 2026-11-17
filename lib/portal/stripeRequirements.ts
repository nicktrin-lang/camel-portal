// Stripe requirement codes (account.requirements.currently_due etc.) → a short key.
// Shared by the admin "Payouts (Stripe)" panel (English labels) and the partner pages
// (translated via `stripe.req.<key>`). Order matters: the first match wins.

export type StripeRequirementKey =
  | "bank" | "tos" | "businessType" | "website" | "mcc" | "supportPhone"
  | "taxId" | "companyName" | "companyAddress" | "companyPhone" | "owners"
  | "companyDocument" | "repId" | "repDetails" | "ownerId" | "ownerDetails"
  | "idDocument" | "personal" | "other";

const RULES: [RegExp, StripeRequirementKey][] = [
  [/^external_account$/, "bank"],
  [/^tos_acceptance/, "tos"],
  [/^business_type$/, "businessType"],
  [/^business_profile\.(url|product_description)$/, "website"],
  [/^business_profile\.mcc$/, "mcc"],
  [/^business_profile\.support_phone$/, "supportPhone"],
  [/^company\.tax_id$/, "taxId"],
  [/^company\.(name|structure)$/, "companyName"],
  [/^company\.address/, "companyAddress"],
  [/^company\.phone$/, "companyPhone"],
  [/^company\.(owners|directors|executives)_provided$/, "owners"],
  [/^company\.verification\.document/, "companyDocument"],
  [/^representative\.verification\.(document|additional_document)/, "repId"],
  [/^representative\./, "repDetails"],
  [/^(person_[^.]+|owners|directors)\.verification/, "ownerId"],
  [/^(person_[^.]+|owners|directors)\./, "ownerDetails"],
  [/^individual\.verification/, "idDocument"],
  [/^individual\./, "personal"],
];

export function requirementKey(code: unknown): StripeRequirementKey {
  if (typeof code !== "string") return "other";
  return RULES.find(([re]) => re.test(code))?.[1] ?? "other";
}

/** Unique keys for a list of codes, in first-seen order. */
export function requirementKeys(codes: unknown[] | null | undefined): StripeRequirementKey[] {
  return [...new Set((codes ?? []).map(requirementKey))];
}
