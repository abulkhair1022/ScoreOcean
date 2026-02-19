import { Request, Response, NextFunction } from 'express';
import { validate } from '../validation';
import { authSchemas, userSchemas, tournamentSchemas } from '../validationSchemas';
import { AppError } from '../errorHandler';

/**
 * Integration tests demonstrating validation middleware usage with actual schemas
 */
describe('Validation Middleware Integration', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('Authentication Validation', () => {
    it('should validate registration with all required fields', () => {
      mockReq.body = {
        email: 'player@example.com',
        password: 'securepass123',
        role: 'PLAYER',
        name: 'John Doe',
        age: 25,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        phone: '+919876543210',
      };

      const middleware = validate(authSchemas.register);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject registration with invalid email', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'securepass123',
        role: 'PLAYER',
        name: 'John Doe',
      };

      const middleware = validate(authSchemas.register);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('email');
    });

    it('should reject registration with short password', () => {
      mockReq.body = {
        email: 'player@example.com',
        password: 'short',
        role: 'PLAYER',
        name: 'John Doe',
      };

      const middleware = validate(authSchemas.register);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('Password');
      expect(error.message).toContain('8 characters');
    });

    it('should reject registration with invalid role', () => {
      mockReq.body = {
        email: 'player@example.com',
        password: 'securepass123',
        role: 'INVALID_ROLE',
        name: 'John Doe',
      };

      const middleware = validate(authSchemas.register);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('Role');
    });

    it('should validate login with correct fields', () => {
      mockReq.body = {
        email: 'player@example.com',
        password: 'securepass123',
      };

      const middleware = validate(authSchemas.login);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('User Profile Validation', () => {
    it('should validate sport profile creation', () => {
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockReq.body = { sport: 'CRICKET' };

      const middleware = validate(userSchemas.addSportProfile);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject invalid sport', () => {
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockReq.body = { sport: 'INVALID_SPORT' };

      const middleware = validate(userSchemas.addSportProfile);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('Sport');
    });

    it('should validate performance stats query with date range', () => {
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockReq.query = {
        sport: 'CRICKET',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const middleware = validate(userSchemas.getPerformanceStats);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject invalid date format in query', () => {
      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
      mockReq.query = {
        startDate: '01/01/2024', // Invalid format
        endDate: '2024-12-31',
      };

      const middleware = validate(userSchemas.getPerformanceStats);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('startDate');
    });
  });

  describe('Tournament Validation', () => {
    it('should validate tournament creation with all required fields', () => {
      // Use dates far in the future to pass validation
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const startDate = futureDate.toISOString().split('T')[0];
      
      const endDate = new Date(futureDate);
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const deadline = new Date(futureDate);
      deadline.setDate(deadline.getDate() - 15);
      const deadlineStr = deadline.toISOString().split('T')[0];

      mockReq.body = {
        name: 'Mumbai Premier League',
        sport: 'CRICKET',
        format: 'LEAGUE',
        startDate: startDate,
        endDate: endDateStr,
        venue: 'Wankhede Stadium, Mumbai',
        registrationFee: 5000,
        registrationDeadline: deadlineStr,
        teamCapacity: 16,
      };

      const middleware = validate(tournamentSchemas.createTournament);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('should reject tournament with invalid format', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const startDate = futureDate.toISOString().split('T')[0];
      
      const endDate = new Date(futureDate);
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const deadline = new Date(futureDate);
      deadline.setDate(deadline.getDate() - 15);
      const deadlineStr = deadline.toISOString().split('T')[0];

      mockReq.body = {
        name: 'Mumbai Premier League',
        sport: 'CRICKET',
        format: 'INVALID_FORMAT',
        startDate: startDate,
        endDate: endDateStr,
        venue: 'Wankhede Stadium',
        registrationFee: 5000,
        registrationDeadline: deadlineStr,
        teamCapacity: 16,
      };

      const middleware = validate(tournamentSchemas.createTournament);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('Format');
    });

    it('should reject tournament with negative registration fee', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const startDate = futureDate.toISOString().split('T')[0];
      
      const endDate = new Date(futureDate);
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const deadline = new Date(futureDate);
      deadline.setDate(deadline.getDate() - 15);
      const deadlineStr = deadline.toISOString().split('T')[0];

      mockReq.body = {
        name: 'Mumbai Premier League',
        sport: 'CRICKET',
        format: 'LEAGUE',
        startDate: startDate,
        endDate: endDateStr,
        venue: 'Wankhede Stadium',
        registrationFee: -100,
        registrationDeadline: deadlineStr,
        teamCapacity: 16,
      };

      const middleware = validate(tournamentSchemas.createTournament);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('Registration fee');
    });

    it('should reject tournament with invalid team capacity', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const startDate = futureDate.toISOString().split('T')[0];
      
      const endDate = new Date(futureDate);
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const deadline = new Date(futureDate);
      deadline.setDate(deadline.getDate() - 15);
      const deadlineStr = deadline.toISOString().split('T')[0];

      mockReq.body = {
        name: 'Mumbai Premier League',
        sport: 'CRICKET',
        format: 'LEAGUE',
        startDate: startDate,
        endDate: endDateStr,
        venue: 'Wankhede Stadium',
        registrationFee: 5000,
        registrationDeadline: deadlineStr,
        teamCapacity: 1, // Too low
      };

      const middleware = validate(tournamentSchemas.createTournament);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      expect(error.message).toContain('Team capacity');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should report all validation errors in registration', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'short',
        role: 'INVALID',
        name: 'J', // Too short
      };

      const middleware = validate(authSchemas.register);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0] as AppError;
      
      // Should contain all error messages
      expect(error.message).toContain('email');
      expect(error.message).toContain('Password');
      expect(error.message).toContain('Role');
      expect(error.message).toContain('Name');
    });
  });
});
