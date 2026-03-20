import { Request, Response, NextFunction } from 'express';
import { validate, ValidationSchema, commonValidations } from '../validation';
import { AppError } from '../errorHandler';

// Extend Request type to include files property
interface RequestWithFiles extends Request {
  files?: any;
}

describe('Validation Middleware', () => {
  let mockReq: Partial<RequestWithFiles>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      files: undefined,
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('Required Field Validation', () => {
    it('should pass when all required fields are present', () => {
      const schema: ValidationSchema = {
        body: {
          email: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
      };

      mockReq.body = {
        email: 'test@example.com',
        name: 'John Doe',
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should fail when required field is missing', () => {
      const schema: ValidationSchema = {
        body: {
          email: { type: 'string', required: true },
          name: { type: 'string', required: true },
        },
      };

      mockReq.body = {
        email: 'test@example.com',
        // name is missing
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toContain('name is required');
    });

    it('should fail when required field is empty string', () => {
      const schema: ValidationSchema = {
        body: {
          name: { type: 'string', required: true },
        },
      };

      mockReq.body = {
        name: '',
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should fail when required field is null', () => {
      const schema: ValidationSchema = {
        body: {
          name: { type: 'string', required: true },
        },
      };

      mockReq.body = {
        name: null,
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('Email Format Validation', () => {
    it('should pass with valid email format', () => {
      const schema: ValidationSchema = {
        body: {
          email: { type: 'email', required: true },
        },
      };

      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
        'user_123@test-domain.com',
      ];

      validEmails.forEach((email) => {
        mockReq.body = { email };
        mockNext = jest.fn();

        const middleware = validate(schema);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
      });
    });

    it('should fail with invalid email format', () => {
      const schema: ValidationSchema = {
        body: {
          email: { type: 'email', required: true },
        },
      };

      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      invalidEmails.forEach((email) => {
        mockReq.body = { email };
        mockNext = jest.fn();

        const middleware = validate(schema);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.message).toContain('email');
      });
    });
  });

  describe('Date Validation', () => {
    it('should pass with valid ISO date format', () => {
      const schema: ValidationSchema = {
        body: {
          startDate: { type: 'date', required: true },
        },
      };

      const validDates = [
        '2024-12-31',
        '2024-01-01T00:00:00.000Z',
        '2024-06-15T14:30:00Z',
      ];

      validDates.forEach((date) => {
        mockReq.body = { startDate: date };
        mockNext = jest.fn();

        const middleware = validate(schema);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
      });
    });

    it('should fail with invalid date format', () => {
      const schema: ValidationSchema = {
        body: {
          startDate: { type: 'date', required: true },
        },
      };

      const invalidDates = [
        'not-a-date',
        '31/12/2024',
        '12-31-2024',
        '2024/12/31',
        'invalid',
      ];

      invalidDates.forEach((date) => {
        mockReq.body = { startDate: date };
        mockNext = jest.fn();

        const middleware = validate(schema);
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
        expect(error.message).toContain('startDate');
      });
    });
  });

  describe('File Upload Validation', () => {
    it('should pass with valid file upload', () => {
      const schema: ValidationSchema = {
        files: {
          required: true,
          maxSize: 5 * 1024 * 1024,
          allowedTypes: ['image/jpeg', 'image/png'],
          maxCount: 1,
        },
      };

      mockReq.files = {
        avatar: {
          name: 'profile.jpg',
          size: 1024 * 1024, // 1MB
          mimetype: 'image/jpeg',
        },
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should fail when file size exceeds limit', () => {
      const schema: ValidationSchema = {
        files: {
          required: true,
          maxSize: 1 * 1024 * 1024, // 1MB
          allowedTypes: ['image/jpeg'],
        },
      };

      mockReq.files = {
        avatar: {
          name: 'large.jpg',
          size: 10 * 1024 * 1024, // 10MB
          mimetype: 'image/jpeg',
        },
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('size must not exceed');
    });

    it('should fail when file type is not allowed', () => {
      const schema: ValidationSchema = {
        files: {
          required: true,
          allowedTypes: ['image/jpeg', 'image/png'],
        },
      };

      mockReq.files = {
        document: {
          name: 'file.pdf',
          size: 1024,
          mimetype: 'application/pdf',
        },
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('File type must be one of');
    });

    it('should fail when required file is missing', () => {
      const schema: ValidationSchema = {
        files: {
          required: true,
        },
      };

      mockReq.files = undefined;

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('File upload is required');
    });
  });

  describe('Type Validation', () => {
    it('should validate string type', () => {
      const schema: ValidationSchema = {
        body: {
          name: { type: 'string', required: true },
        },
      };

      mockReq.body = { name: 123 };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('must be a string');
    });

    it('should validate number type', () => {
      const schema: ValidationSchema = {
        body: {
          age: { type: 'number', required: true },
        },
      };

      mockReq.body = { age: 'not-a-number' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('must be a valid number');
    });

    it('should validate array type', () => {
      const schema: ValidationSchema = {
        body: {
          tags: { type: 'array', required: true },
        },
      };

      mockReq.body = { tags: 'not-an-array' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('must be an array');
    });

    it('should validate object type', () => {
      const schema: ValidationSchema = {
        body: {
          metadata: { type: 'object', required: true },
        },
      };

      mockReq.body = { metadata: 'not-an-object' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('must be an object');
    });
  });

  describe('Min/Max Validation', () => {
    it('should validate minimum string length', () => {
      const schema: ValidationSchema = {
        body: {
          password: { type: 'string', required: true, min: 8 },
        },
      };

      mockReq.body = { password: 'short' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('at least 8 characters');
    });

    it('should validate maximum string length', () => {
      const schema: ValidationSchema = {
        body: {
          name: { type: 'string', required: true, max: 10 },
        },
      };

      mockReq.body = { name: 'This is a very long name' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('at most 10 characters');
    });

    it('should validate minimum number value', () => {
      const schema: ValidationSchema = {
        body: {
          age: { type: 'number', required: true, min: 18 },
        },
      };

      mockReq.body = { age: 15 };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('at least 18');
    });

    it('should validate maximum number value', () => {
      const schema: ValidationSchema = {
        body: {
          score: { type: 'number', required: true, max: 100 },
        },
      };

      mockReq.body = { score: 150 };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('at most 100');
    });
  });

  describe('Enum Validation', () => {
    it('should pass with valid enum value', () => {
      const schema: ValidationSchema = {
        body: {
          role: { type: 'string', required: true, enum: ['PLAYER', 'TEAM', 'ADMIN'] },
        },
      };

      mockReq.body = { role: 'PLAYER' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should fail with invalid enum value', () => {
      const schema: ValidationSchema = {
        body: {
          role: { type: 'string', required: true, enum: ['PLAYER', 'TEAM', 'ADMIN'] },
        },
      };

      mockReq.body = { role: 'INVALID_ROLE' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('must be one of');
    });
  });

  describe('Custom Validation', () => {
    it('should pass with valid custom validation', () => {
      const schema: ValidationSchema = {
        body: {
          age: {
            type: 'number',
            required: true,
            custom: (value: number) => value >= 18 || 'Must be 18 or older',
          },
        },
      };

      mockReq.body = { age: 25 };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should fail with invalid custom validation', () => {
      const schema: ValidationSchema = {
        body: {
          age: {
            type: 'number',
            required: true,
            custom: (value: number) => value >= 18 || 'Must be 18 or older',
          },
        },
      };

      mockReq.body = { age: 15 };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('Must be 18 or older');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should report all validation errors', () => {
      const schema: ValidationSchema = {
        body: {
          email: { type: 'email', required: true },
          password: { type: 'string', required: true, min: 8 },
          age: { type: 'number', required: true, min: 18 },
        },
      };

      mockReq.body = {
        email: 'invalid-email',
        password: 'short',
        age: 15,
      };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('email');
      expect(error.message).toContain('password');
      expect(error.message).toContain('age');
    });
  });

  describe('Query and Params Validation', () => {
    it('should validate query parameters', () => {
      const schema: ValidationSchema = {
        query: {
          page: { type: 'number', required: true, min: 1 },
          limit: { type: 'number', required: true, min: 1, max: 100 },
        },
      };

      mockReq.query = { page: '1', limit: '10' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should validate URL parameters', () => {
      const schema: ValidationSchema = {
        params: {
          id: commonValidations.id,
        },
      };

      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('Optional Fields', () => {
    it('should skip validation for optional missing fields', () => {
      const schema: ValidationSchema = {
        body: {
          name: { type: 'string', required: true },
          age: { type: 'number', required: false, min: 18 },
        },
      };

      mockReq.body = { name: 'John' };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should validate optional fields when present', () => {
      const schema: ValidationSchema = {
        body: {
          name: { type: 'string', required: true },
          age: { type: 'number', required: false, min: 18 },
        },
      };

      mockReq.body = { name: 'John', age: 15 };

      const middleware = validate(schema);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('age');
    });
  });
});
