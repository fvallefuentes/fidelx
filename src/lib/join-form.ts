export type JoinFormRequirements = {
  emailRequired: boolean;
  phoneRequired: boolean;
  birthDateRequired: boolean;
};

export const DEFAULT_JOIN_FORM_REQUIREMENTS: JoinFormRequirements = {
  emailRequired: false,
  phoneRequired: false,
  birthDateRequired: false,
};

export function getJoinFormRequirements(
  config: unknown
): JoinFormRequirements {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { ...DEFAULT_JOIN_FORM_REQUIREMENTS };
  }

  const joinForm = (config as Record<string, unknown>).joinForm;
  if (!joinForm || typeof joinForm !== "object" || Array.isArray(joinForm)) {
    return { ...DEFAULT_JOIN_FORM_REQUIREMENTS };
  }

  const value = joinForm as Record<string, unknown>;
  return {
    emailRequired: value.emailRequired === true,
    phoneRequired: value.phoneRequired === true,
    birthDateRequired: value.birthDateRequired === true,
  };
}

export function combineJoinFormRequirements(
  requirements: JoinFormRequirements[]
): JoinFormRequirements {
  return requirements.reduce<JoinFormRequirements>(
    (combined, current) => ({
      emailRequired: combined.emailRequired || current.emailRequired,
      phoneRequired: combined.phoneRequired || current.phoneRequired,
      birthDateRequired:
        combined.birthDateRequired || current.birthDateRequired,
    }),
    { ...DEFAULT_JOIN_FORM_REQUIREMENTS }
  );
}

export type JoinFormValidationReason =
  | "missing_first_name"
  | "missing_email"
  | "missing_phone"
  | "missing_email_phone"
  | "missing_birth_date";

export function validateJoinFormRequirements(
  values: {
    firstName: unknown;
    email: string | null;
    phone: string | null;
    birthDate: Date | null;
  },
  requirements: JoinFormRequirements
): { reason: JoinFormValidationReason; message: string } | null {
  if (typeof values.firstName !== "string" || !values.firstName.trim()) {
    return { reason: "missing_first_name", message: "Le prénom est requis" };
  }
  if (requirements.emailRequired && !values.email) {
    return { reason: "missing_email", message: "L'email est requis" };
  }
  if (requirements.phoneRequired && !values.phone) {
    return { reason: "missing_phone", message: "Le téléphone est requis" };
  }
  if (!values.email && !values.phone) {
    return {
      reason: "missing_email_phone",
      message: "Un email ou téléphone est requis",
    };
  }
  if (requirements.birthDateRequired && !values.birthDate) {
    return {
      reason: "missing_birth_date",
      message: "La date de naissance est requise",
    };
  }
  return null;
}
