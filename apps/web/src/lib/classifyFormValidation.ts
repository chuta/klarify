export const CLASSIFY_LIMITS = {
  minDescription: 50,
  maxDescription: 4000,
  maxFeatureLen: 120,
  maxFeatures: 20,
  maxBusinessModel: 500,
  maxTargetUsers: 500,
} as const;

export interface ClassifyFormValues {
  description: string;
  features: string[];
  businessModel: string;
  targetUsers: string;
  featureDraft: string;
}

export interface ClassifyFieldErrors {
  description?: string;
  features?: string;
  businessModel?: string;
  targetUsers?: string;
  featureDraft?: string;
}

export interface ClassifyPayload {
  description: string;
  features: string[];
  businessModel: string;
  targetUsers: string;
}

export function validateClassifyForm(values: ClassifyFormValues): ClassifyFieldErrors {
  const errors: ClassifyFieldErrors = {};
  const { minDescription, maxDescription, maxBusinessModel, maxTargetUsers } =
    CLASSIFY_LIMITS;
  const descLen = values.description.trim().length;

  if (descLen < minDescription) {
    errors.description = `Add at least ${minDescription} characters (${descLen}/${minDescription} so far).`;
  } else if (descLen > maxDescription) {
    errors.description = `Shorten to ${maxDescription} characters or fewer (${descLen}/${maxDescription}).`;
  }

  if (values.features.length === 0) {
    errors.features = 'Add at least one key feature (press Enter after each).';
  }

  const model = values.businessModel.trim();
  if (!model) {
    errors.businessModel = 'Describe how your business earns revenue.';
  } else if (model.length > maxBusinessModel) {
    errors.businessModel = `Keep this under ${maxBusinessModel} characters.`;
  }

  const users = values.targetUsers.trim();
  if (!users) {
    errors.targetUsers = 'Describe who uses your product.';
  } else if (users.length > maxTargetUsers) {
    errors.targetUsers = `Keep this under ${maxTargetUsers} characters.`;
  }

  const draft = values.featureDraft.trim();
  if (draft) {
    errors.featureDraft =
      'Press Enter to add this feature, or clear the field before submitting.';
  }

  return errors;
}

/** Build API payload — never includes empty strings for optional API fields. */
export function buildClassifyPayload(values: ClassifyFormValues): ClassifyPayload {
  return {
    description: values.description.trim(),
    features: values.features.map((f) => f.trim()).filter(Boolean),
    businessModel: values.businessModel.trim(),
    targetUsers: values.targetUsers.trim(),
  };
}

export function isClassifyFormValid(values: ClassifyFormValues): boolean {
  return Object.keys(validateClassifyForm(values)).length === 0;
}

export function descriptionCounterTone(
  length: number,
  min = CLASSIFY_LIMITS.minDescription,
  max = CLASSIFY_LIMITS.maxDescription,
): 'under' | 'valid' | 'over' {
  if (length > max) return 'over';
  if (length < min) return 'under';
  return 'valid';
}
