/**
 * Form validation utilities
 * Provides common validation functions and error message generation
 */

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export type FieldErrors = Record<string, string>;

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: true }; // Empty is valid (use required separately)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  return { valid: true };
}

// Phone validation (flexible format)
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { valid: true };
  }

  // Allow digits, spaces, dashes, parentheses, and plus sign
  const phoneRegex = /^[\d\s\-()+ ]{7,20}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: "Please enter a valid phone number" };
  }

  return { valid: true };
}

// Required field validation
export function validateRequired(
  value: string | number | null | undefined,
  fieldName: string = "This field"
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true };
}

// Minimum length validation
export function validateMinLength(
  value: string,
  min: number,
  fieldName: string = "This field"
): ValidationResult {
  if (!value) {
    return { valid: true };
  }

  if (value.length < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min} characters`,
    };
  }

  return { valid: true };
}

// Maximum length validation
export function validateMaxLength(
  value: string,
  max: number,
  fieldName: string = "This field"
): ValidationResult {
  if (!value) {
    return { valid: true };
  }

  if (value.length > max) {
    return {
      valid: false,
      error: `${fieldName} must be no more than ${max} characters`,
    };
  }

  return { valid: true };
}

// Number range validation
export function validateNumberRange(
  value: number | string,
  min?: number,
  max?: number,
  fieldName: string = "This field"
): ValidationResult {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must be no more than ${max}` };
  }

  return { valid: true };
}

// URL validation
export function validateUrl(url: string): ValidationResult {
  if (!url) {
    return { valid: true };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: "Please enter a valid URL" };
  }
}

// Date validation (must be in the future)
export function validateFutureDate(
  date: string | Date,
  fieldName: string = "Date"
): ValidationResult {
  if (!date) {
    return { valid: true };
  }

  const dateValue = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateValue.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date` };
  }

  if (dateValue <= new Date()) {
    return { valid: false, error: `${fieldName} must be in the future` };
  }

  return { valid: true };
}

// Date validation (just checks if valid date, no future/past restriction)
// Use this for historical tender entry
export function validateDate(
  date: string | Date,
  fieldName: string = "Date"
): ValidationResult {
  if (!date) {
    return { valid: true };
  }

  const dateValue = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateValue.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date` };
  }

  return { valid: true };
}

// Date validation (must be in the past)
export function validatePastDate(
  date: string | Date,
  fieldName: string = "Date"
): ValidationResult {
  if (!date) {
    return { valid: true };
  }

  const dateValue = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateValue.getTime())) {
    return { valid: false, error: `${fieldName} must be a valid date` };
  }

  if (dateValue >= new Date()) {
    return { valid: false, error: `${fieldName} must be in the past` };
  }

  return { valid: true };
}

// Composite validation - run multiple validators
export function validate(
  value: unknown,
  ...validators: ((v: unknown) => ValidationResult)[]
): ValidationResult {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

// Form validation helper - validates all fields and returns errors object
export function validateForm<T extends Record<string, unknown>>(
  data: T,
  rules: Partial<Record<keyof T, ((value: unknown) => ValidationResult)[]>>
): { valid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  let valid = true;

  for (const [field, validators] of Object.entries(rules)) {
    if (validators) {
      for (const validator of validators as ((value: unknown) => ValidationResult)[]) {
        const result = validator(data[field as keyof T]);
        if (!result.valid) {
          errors[field as keyof T] = result.error;
          valid = false;
          break; // Only show first error per field
        }
      }
    }
  }

  return { valid, errors };
}

// Hook-friendly validation state manager
export interface UseFormValidationOptions<T> {
  initialData: T;
  rules: Partial<Record<keyof T, ((value: unknown) => ValidationResult)[]>>;
}

export function createFormValidator<T extends Record<string, unknown>>(
  rules: Partial<Record<keyof T, ((value: unknown) => ValidationResult)[]>>
) {
  return (data: T) => validateForm(data, rules);
}

// Debounced validation for real-time feedback
export function createDebouncedValidator(
  validator: (value: unknown) => ValidationResult,
  delay: number = 300
) {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (
    value: unknown,
    callback: (result: ValidationResult) => void
  ): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(validator(value));
    }, delay);
  };
}
