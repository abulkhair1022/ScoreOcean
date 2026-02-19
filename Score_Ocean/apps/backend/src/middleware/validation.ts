import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Validation middleware for comprehensive data validation
 * Validates required fields, email format, dates, and file uploads
 */

// Email regex pattern (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Date regex pattern (ISO 8601 format: YYYY-MM-DD or full ISO datetime)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;

// Allowed file types for uploads
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validation schema interface
 */
export interface ValidationSchema {
  body?: FieldValidation;
  query?: FieldValidation;
  params?: FieldValidation;
  files?: FileValidation;
}

export interface FieldValidation {
  [key: string]: FieldRule;
}

export interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'date' | 'array' | 'object';
  min?: number;
  max?: number;
  enum?: any[];
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface FileValidation {
  required?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
  maxCount?: number;
}

/**
 * Validation error details
 */
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validate a single field against its rules
 */
function validateField(
  fieldName: string,
  value: any,
  rules: FieldRule
): ValidationError | null {
  // Check required
  if (rules.required && (value === undefined || value === null || value === '')) {
    return {
      field: fieldName,
      message: rules.message || `${fieldName} is required`,
    };
  }

  // If not required and value is empty, skip other validations
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  if (rules.type) {
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be a string`,
            value,
          };
        }
        break;

      case 'number':
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be a valid number`,
            value,
          };
        }
        // Update value to parsed number for min/max checks
        value = num;
        break;

      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be a boolean`,
            value,
          };
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be a valid email address`,
            value,
          };
        }
        break;

      case 'date':
        // Check if it's a valid date string or Date object
        const dateValue = value instanceof Date ? value : new Date(value);
        if (isNaN(dateValue.getTime())) {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be a valid date`,
            value,
          };
        }
        // Additional check for ISO format if it's a string
        if (typeof value === 'string' && !DATE_REGEX.test(value)) {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)`,
            value,
          };
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be an array`,
            value,
          };
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return {
            field: fieldName,
            message: rules.message || `${fieldName} must be an object`,
            value,
          };
        }
        break;
    }
  }

  // Min/Max validation
  if (rules.min !== undefined) {
    if (typeof value === 'number' && value < rules.min) {
      return {
        field: fieldName,
        message: rules.message || `${fieldName} must be at least ${rules.min}`,
        value,
      };
    }
    if (typeof value === 'string' && value.length < rules.min) {
      return {
        field: fieldName,
        message: rules.message || `${fieldName} must be at least ${rules.min} characters`,
        value,
      };
    }
    if (Array.isArray(value) && value.length < rules.min) {
      return {
        field: fieldName,
        message: rules.message || `${fieldName} must have at least ${rules.min} items`,
        value,
      };
    }
  }

  if (rules.max !== undefined) {
    if (typeof value === 'number' && value > rules.max) {
      return {
        field: fieldName,
        message: rules.message || `${fieldName} must be at most ${rules.max}`,
        value,
      };
    }
    if (typeof value === 'string' && value.length > rules.max) {
      return {
        field: fieldName,
        message: rules.message || `${fieldName} must be at most ${rules.max} characters`,
        value,
      };
    }
    if (Array.isArray(value) && value.length > rules.max) {
      return {
        field: fieldName,
        message: rules.message || `${fieldName} must have at most ${rules.max} items`,
        value,
      };
    }
  }

  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    return {
      field: fieldName,
      message: rules.message || `${fieldName} must be one of: ${rules.enum.join(', ')}`,
      value,
    };
  }

  // Pattern validation
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return {
      field: fieldName,
      message: rules.message || `${fieldName} format is invalid`,
      value,
    };
  }

  // Custom validation
  if (rules.custom) {
    const result = rules.custom(value);
    if (result !== true) {
      return {
        field: fieldName,
        message: typeof result === 'string' ? result : rules.message || `${fieldName} validation failed`,
        value,
      };
    }
  }

  return null;
}

/**
 * Validate file uploads
 */
function validateFiles(
  files: any,
  rules: FileValidation
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if files are required
  if (rules.required && (!files || Object.keys(files).length === 0)) {
    errors.push({
      field: 'files',
      message: 'File upload is required',
    });
    return errors;
  }

  if (!files || Object.keys(files).length === 0) {
    return errors;
  }

  // Convert files to array for consistent handling
  const fileArray = Array.isArray(files) ? files : Object.values(files).flat();

  // Check max count
  if (rules.maxCount && fileArray.length > rules.maxCount) {
    errors.push({
      field: 'files',
      message: `Maximum ${rules.maxCount} file(s) allowed`,
    });
  }

  // Validate each file
  fileArray.forEach((file: any, index: number) => {
    const maxSize = rules.maxSize || MAX_FILE_SIZE;
    const allowedTypes = rules.allowedTypes || ALLOWED_FILE_TYPES;

    // Check file size
    if (file.size > maxSize) {
      errors.push({
        field: `files[${index}]`,
        message: `File size must not exceed ${maxSize / (1024 * 1024)}MB`,
        value: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`,
      });
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push({
        field: `files[${index}]`,
        message: `File type must be one of: ${allowedTypes.join(', ')}`,
        value: `${file.name} (${file.mimetype})`,
      });
    }
  });

  return errors;
}

/**
 * Main validation middleware factory
 */
export function validate(schema: ValidationSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];

    // Validate body
    if (schema.body) {
      for (const [fieldName, rules] of Object.entries(schema.body)) {
        const error = validateField(fieldName, req.body?.[fieldName], rules);
        if (error) {
          errors.push(error);
        }
      }
    }

    // Validate query parameters
    if (schema.query) {
      for (const [fieldName, rules] of Object.entries(schema.query)) {
        const error = validateField(fieldName, req.query?.[fieldName], rules);
        if (error) {
          errors.push(error);
        }
      }
    }

    // Validate URL parameters
    if (schema.params) {
      for (const [fieldName, rules] of Object.entries(schema.params)) {
        const error = validateField(fieldName, req.params?.[fieldName], rules);
        if (error) {
          errors.push(error);
        }
      }
    }

    // Validate files (if the property exists on the request)
    if (schema.files) {
      const files = (req as any).files;
      const fileErrors = validateFiles(files, schema.files);
      errors.push(...fileErrors);
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      return next(
        new AppError(
          `Validation failed: ${errors.map(e => e.message).join('; ')}`,
          400,
          'VALIDATION_ERROR'
        )
      );
    }

    // Validation passed
    next();
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonValidations = {
  email: {
    type: 'email' as const,
    required: true,
    message: 'Valid email address is required',
  },
  password: {
    type: 'string' as const,
    required: true,
    min: 8,
    message: 'Password must be at least 8 characters',
  },
  id: {
    type: 'string' as const,
    required: true,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    message: 'Valid UUID is required',
  },
  date: {
    type: 'date' as const,
    required: true,
    message: 'Valid date in ISO 8601 format is required',
  },
  positiveNumber: {
    type: 'number' as const,
    min: 0,
    message: 'Must be a positive number',
  },
};
