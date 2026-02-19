# Data Validation Implementation

## Overview

This document describes the comprehensive validation middleware implementation for the Score Ocean platform. The validation system ensures data integrity across all API endpoints by validating required fields, email formats, dates, file uploads, and more.

## Features

The validation middleware provides:

1. **Required Field Validation** - Ensures all required fields are present and non-empty
2. **Email Format Validation** - Validates email addresses using RFC 5322 simplified regex
3. **Date Validation** - Validates dates in ISO 8601 format (YYYY-MM-DD or full datetime)
4. **File Upload Validation** - Validates file size, type, and count
5. **Type Validation** - Validates data types (string, number, boolean, array, object)
6. **Min/Max Validation** - Validates minimum and maximum values for numbers, strings, and arrays
7. **Enum Validation** - Validates values against allowed enums
8. **Pattern Validation** - Validates strings against custom regex patterns
9. **Custom Validation** - Supports custom validation functions
10. **Specific Error Messages** - Returns detailed error messages for each validation failure

## Architecture

### Files

- `src/middleware/validation.ts` - Core validation middleware and utilities
- `src/middleware/validationSchemas.ts` - Predefined validation schemas for all endpoints
- `src/middleware/__tests__/validation.test.ts` - Comprehensive test suite

### Validation Flow

```
Request → Validation Middleware → Route Handler
                ↓ (if validation fails)
         Error Handler → Response
```

## Usage

### Basic Usage

```typescript
import { validate } from '../middleware/validation';
import { authSchemas } from '../middleware/validationSchemas';

// Apply validation to a route
router.post('/register', validate(authSchemas.register), async (req, res, next) => {
  // Request body is already validated
  const { email, password, role } = req.body;
  // ... handle request
});
```

### Custom Validation Schema

```typescript
import { ValidationSchema } from '../middleware/validation';

const customSchema: ValidationSchema = {
  body: {
    email: {
      type: 'email',
      required: true,
      message: 'Valid email address is required',
    },
    password: {
      type: 'string',
      required: true,
      min: 8,
      message: 'Password must be at least 8 characters',
    },
    age: {
      type: 'number',
      required: false,
      min: 18,
      max: 120,
      message: 'Age must be between 18 and 120',
    },
  },
  query: {
    page: {
      type: 'number',
      required: false,
      min: 1,
    },
  },
  params: {
    id: {
      type: 'string',
      required: true,
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      message: 'Valid UUID is required',
    },
  },
  files: {
    required: true,
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png'],
    maxCount: 1,
  },
};

router.post('/upload', validate(customSchema), async (req, res, next) => {
  // ... handle request
});
```

## Validation Rules

### Field Rule Interface

```typescript
interface FieldRule {
  required?: boolean;              // Field is required
  type?: 'string' | 'number' | 'boolean' | 'email' | 'date' | 'array' | 'object';
  min?: number;                    // Minimum value/length
  max?: number;                    // Maximum value/length
  enum?: any[];                    // Allowed values
  pattern?: RegExp;                // Regex pattern
  custom?: (value: any) => boolean | string;  // Custom validation function
  message?: string;                // Custom error message
}
```

### Type Validation

- **string**: Validates that value is a string
- **number**: Validates that value is a number (auto-converts string numbers)
- **boolean**: Validates that value is a boolean
- **email**: Validates email format using regex
- **date**: Validates ISO 8601 date format
- **array**: Validates that value is an array
- **object**: Validates that value is an object (not array or null)

### Min/Max Validation

- For **numbers**: Validates numeric value range
- For **strings**: Validates character length
- For **arrays**: Validates item count

### File Upload Validation

```typescript
files: {
  required?: boolean;              // File upload is required
  maxSize?: number;                // Max file size in bytes (default: 5MB)
  allowedTypes?: string[];         // Allowed MIME types
  maxCount?: number;               // Maximum number of files
}
```

## Predefined Schemas

The `validationSchemas.ts` file contains predefined schemas for all major endpoints:

### Authentication
- `authSchemas.register` - User registration
- `authSchemas.login` - User login
- `authSchemas.refresh` - Token refresh

### User Profile
- `userSchemas.createProfile` - Create user profile
- `userSchemas.updateProfile` - Update user profile
- `userSchemas.addSportProfile` - Add sport profile
- `userSchemas.getPerformanceStats` - Get performance statistics
- `userSchemas.uploadAvatar` - Upload profile avatar

### Team
- `teamSchemas.createTeam` - Create team
- `teamSchemas.updateTeam` - Update team
- `teamSchemas.invitePlayer` - Invite player to team
- `teamSchemas.removePlayer` - Remove player from team

### Tournament
- `tournamentSchemas.createTournament` - Create tournament
- `tournamentSchemas.updateTournament` - Update tournament
- `tournamentSchemas.registerTeam` - Register team for tournament

### Match
- `matchSchemas.updateScore` - Update match score
- `matchSchemas.recordPerformance` - Record player performance

### Auction
- `auctionSchemas.createAuction` - Create auction
- `auctionSchemas.registerPlayer` - Register player for auction
- `auctionSchemas.placeBid` - Place bid in auction

### Payment
- `paymentSchemas.initiatePayment` - Initiate payment

### Notification
- `notificationSchemas.updatePreferences` - Update notification preferences

### Search
- `searchSchemas.search` - Search query

### Certificate
- `certificateSchemas.generate` - Generate certificates
- `certificateSchemas.verify` - Verify certificate

## Common Validations

Reusable validation rules are available in `commonValidations`:

```typescript
import { commonValidations } from '../middleware/validation';

// Email validation
email: commonValidations.email

// Password validation (min 8 characters)
password: commonValidations.password

// UUID validation
id: commonValidations.id

// Date validation (ISO 8601)
date: commonValidations.date

// Positive number validation
amount: commonValidations.positiveNumber
```

## Error Response Format

When validation fails, the middleware returns a standardized error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed: email must be a valid email address; password must be at least 8 characters",
    "timestamp": "2024-02-18T10:30:00.000Z",
    "path": "/api/auth/register"
  }
}
```

## Examples

### Example 1: Registration Validation

```typescript
// Schema
const registerSchema = {
  body: {
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, min: 8 },
    role: { type: 'string', required: true, enum: ['PLAYER', 'TEAM', 'ORGANIZATION'] },
    name: { type: 'string', required: true, min: 2, max: 100 },
    age: { type: 'number', required: false, min: 5, max: 120 },
  },
};

// Valid request
{
  "email": "player@example.com",
  "password": "securepass123",
  "role": "PLAYER",
  "name": "John Doe",
  "age": 25
}

// Invalid request (multiple errors)
{
  "email": "invalid-email",
  "password": "short",
  "role": "INVALID",
  "name": "J"
}
// Returns: "Validation failed: email must be a valid email address; password must be at least 8 characters; role must be one of: PLAYER, TEAM, ORGANIZATION; name must be at least 2 characters"
```

### Example 2: Date Validation

```typescript
// Schema
const tournamentSchema = {
  body: {
    startDate: {
      type: 'date',
      required: true,
      custom: (value) => {
        const date = new Date(value);
        const now = new Date();
        return date > now || 'Start date must be in the future';
      },
    },
  },
};

// Valid request
{
  "startDate": "2024-12-31T00:00:00.000Z"
}

// Invalid request
{
  "startDate": "2020-01-01"
}
// Returns: "Validation failed: Start date must be in the future"
```

### Example 3: File Upload Validation

```typescript
// Schema
const uploadSchema = {
  files: {
    required: true,
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png'],
    maxCount: 1,
  },
};

// Valid file upload
{
  name: 'avatar.jpg',
  size: 1024000, // 1MB
  mimetype: 'image/jpeg'
}

// Invalid file upload (too large)
{
  name: 'large.jpg',
  size: 10485760, // 10MB
  mimetype: 'image/jpeg'
}
// Returns: "Validation failed: File size must not exceed 5MB"
```

## Testing

The validation middleware includes comprehensive tests covering:

- Required field validation
- Email format validation
- Date validation
- File upload validation
- Type validation
- Min/max validation
- Enum validation
- Custom validation
- Multiple validation errors
- Query and params validation
- Optional fields

Run tests:
```bash
npm test -- validation.test.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 16.1**: Required field validation
- **Requirement 16.2**: Email format validation
- **Requirement 16.3**: Date validation
- **Requirement 16.5**: File upload validation
- **Requirement 16.6**: Specific error messages for validation failures

## Best Practices

1. **Use predefined schemas** from `validationSchemas.ts` when available
2. **Apply validation early** in the middleware chain (before authentication if possible)
3. **Provide clear error messages** using the `message` field
4. **Validate all inputs** - body, query, params, and files
5. **Use common validations** for consistency across endpoints
6. **Test validation logic** thoroughly with unit tests
7. **Document custom validations** for complex business rules

## Future Enhancements

Potential improvements for future iterations:

1. Add support for nested object validation
2. Add support for array item validation
3. Add internationalization for error messages
4. Add validation result caching for performance
5. Add support for conditional validation rules
6. Add support for cross-field validation
7. Add validation schema versioning
