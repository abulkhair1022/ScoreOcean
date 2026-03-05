import { ValidationSchema, commonValidations } from './validation';
import { UserRole, Sport, TournamentFormat } from '@score-ocean/types';

/**
 * Validation schemas for all API endpoints
 * Organized by domain (auth, user, team, tournament, etc.)
 */

// ============================================================================
// Authentication Schemas
// ============================================================================

export const authSchemas = {
  register: {
    body: {
      email: commonValidations.email,
      password: commonValidations.password,
      role: {
        type: 'string' as const,
        required: true,
        enum: Object.values(UserRole),
        message: `Role must be one of: ${Object.values(UserRole).join(', ')}`,
      },
      name: {
        type: 'string' as const,
        required: true,
        min: 2,
        max: 100,
        message: 'Name is required and must be between 2 and 100 characters',
      },
      age: {
        type: 'number' as const,
        required: false,
        min: 5,
        max: 120,
        message: 'Age must be between 5 and 120',
      },
      city: {
        type: 'string' as const,
        required: false,
        max: 100,
      },
      state: {
        type: 'string' as const,
        required: false,
        max: 100,
      },
      country: {
        type: 'string' as const,
        required: false,
        max: 100,
      },
      phone: {
        type: 'string' as const,
        required: false,
        pattern: /^\+?[\d\s\-().]{7,20}$/,
        message: 'Phone number must be in valid international format',
      },
    },
  } as ValidationSchema,

  login: {
    body: {
      email: commonValidations.email,
      password: {
        type: 'string' as const,
        required: true,
        message: 'Password is required',
      },
    },
  } as ValidationSchema,

  refresh: {
    body: {
      refreshToken: {
        type: 'string' as const,
        required: true,
        message: 'Refresh token is required',
      },
    },
  } as ValidationSchema,
};

// ============================================================================
// User Profile Schemas
// ============================================================================

export const userSchemas = {
  createProfile: {
    params: {
      id: commonValidations.id,
    },
    body: {
      name: {
        type: 'string' as const,
        required: true,
        min: 2,
        max: 100,
      },
      location: {
        type: 'object' as const,
        required: true,
        message: 'Location object with city, state, country is required',
      },
      contactDetails: {
        type: 'object' as const,
        required: true,
        message: 'Contact details object is required',
      },
    },
  } as ValidationSchema,

  updateProfile: {
    params: {
      id: commonValidations.id,
    },
    body: {
      name: {
        type: 'string' as const,
        required: false,
        min: 2,
        max: 100,
      },
      age: {
        type: 'number' as const,
        required: false,
        min: 5,
        max: 120,
      },
      location: {
        type: 'object' as const,
        required: false,
      },
      contactDetails: {
        type: 'object' as const,
        required: false,
      },
      avatarUrl: {
        type: 'string' as const,
        required: false,
      },
    },
  } as ValidationSchema,

  addSportProfile: {
    params: {
      id: commonValidations.id,
    },
    body: {
      sport: {
        type: 'string' as const,
        required: true,
        enum: Object.values(Sport),
        message: `Sport must be one of: ${Object.values(Sport).join(', ')}`,
      },
    },
  } as ValidationSchema,

  getPerformanceStats: {
    params: {
      id: commonValidations.id,
    },
    query: {
      sport: {
        type: 'string' as const,
        required: false,
        enum: Object.values(Sport),
      },
      tournamentId: {
        type: 'string' as const,
        required: false,
        pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      },
      startDate: {
        type: 'date' as const,
        required: false,
      },
      endDate: {
        type: 'date' as const,
        required: false,
      },
    },
  } as ValidationSchema,

  uploadAvatar: {
    params: {
      id: commonValidations.id,
    },
    files: {
      required: true,
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/jpg'],
      maxCount: 1,
    },
  } as ValidationSchema,
};

// ============================================================================
// Team Schemas
// ============================================================================

export const teamSchemas = {
  createTeam: {
    body: {
      name: {
        type: 'string' as const,
        required: true,
        min: 2,
        max: 100,
        message: 'Team name is required and must be between 2 and 100 characters',
      },
      sport: {
        type: 'string' as const,
        required: true,
        enum: Object.values(Sport),
        message: `Sport must be one of: ${Object.values(Sport).join(', ')}`,
      },
      location: {
        type: 'object' as const,
        required: true,
        message: 'Location object with city, state, country is required',
      },
    },
  } as ValidationSchema,

  updateTeam: {
    params: {
      id: commonValidations.id,
    },
    body: {
      name: {
        type: 'string' as const,
        required: false,
        min: 2,
        max: 100,
      },
    },
  } as ValidationSchema,

  invitePlayer: {
    params: {
      id: commonValidations.id,
    },
    body: {
      playerId: {
        ...commonValidations.id,
        message: 'Valid player ID is required',
      },
    },
  } as ValidationSchema,

  removePlayer: {
    params: {
      teamId: commonValidations.id,
      playerId: commonValidations.id,
    },
  } as ValidationSchema,
};

// ============================================================================
// Tournament Schemas
// ============================================================================

export const tournamentSchemas = {
  createTournament: {
    body: {
      name: {
        type: 'string' as const,
        required: true,
        min: 3,
        max: 200,
        message: 'Tournament name is required and must be between 3 and 200 characters',
      },
      sport: {
        type: 'string' as const,
        required: true,
        enum: Object.values(Sport),
        message: `Sport must be one of: ${Object.values(Sport).join(', ')}`,
      },
      format: {
        type: 'string' as const,
        required: true,
        enum: Object.values(TournamentFormat),
        message: `Format must be one of: ${Object.values(TournamentFormat).join(', ')}`,
      },
      startDate: {
        type: 'date' as const,
        required: true,
        custom: (value: any) => {
          const date = new Date(value);
          const now = new Date();
          return date > now || 'Start date must be in the future';
        },
      },
      endDate: {
        type: 'date' as const,
        required: true,
        custom: (value: any) => {
          // Note: This validation is simplified. In production, you'd compare with startDate
          const date = new Date(value);
          const now = new Date();
          return date > now || 'End date must be in the future';
        },
      },
      venue: {
        type: 'string' as const,
        required: true,
        min: 3,
        max: 500,
      },
      registrationFee: {
        type: 'number' as const,
        required: true,
        min: 0,
        message: 'Registration fee must be a positive number',
      },
      registrationDeadline: {
        type: 'date' as const,
        required: true,
        custom: (value: any) => {
          const date = new Date(value);
          const now = new Date();
          return date > now || 'Registration deadline must be in the future';
        },
      },
      teamCapacity: {
        type: 'number' as const,
        required: true,
        min: 2,
        max: 1000,
        message: 'Team capacity must be between 2 and 1000',
      },
    },
  } as ValidationSchema,

  updateTournament: {
    params: {
      id: commonValidations.id,
    },
    body: {
      name: {
        type: 'string' as const,
        required: false,
        min: 3,
        max: 200,
      },
      startDate: {
        type: 'date' as const,
        required: false,
      },
      endDate: {
        type: 'date' as const,
        required: false,
      },
      venue: {
        type: 'string' as const,
        required: false,
        min: 3,
        max: 500,
      },
    },
  } as ValidationSchema,

  registerTeam: {
    params: {
      id: commonValidations.id,
    },
    body: {
      teamId: {
        ...commonValidations.id,
        message: 'Valid team ID is required',
      },
    },
  } as ValidationSchema,
};

// ============================================================================
// Match Schemas
// ============================================================================

export const matchSchemas = {
  updateScore: {
    params: {
      id: commonValidations.id,
    },
    body: {
      homeScore: {
        type: 'number' as const,
        required: true,
        min: 0,
        message: 'Home score must be a non-negative number',
      },
      awayScore: {
        type: 'number' as const,
        required: true,
        min: 0,
        message: 'Away score must be a non-negative number',
      },
      sportSpecificData: {
        type: 'object' as const,
        required: false,
      },
    },
  } as ValidationSchema,

  recordPerformance: {
    params: {
      id: commonValidations.id,
    },
    body: {
      playerId: commonValidations.id,
      teamId: commonValidations.id,
      statistics: {
        type: 'object' as const,
        required: true,
        message: 'Player statistics object is required',
      },
    },
  } as ValidationSchema,
};

// ============================================================================
// Auction Schemas
// ============================================================================

export const auctionSchemas = {
  createAuction: {
    body: {
      tournamentId: commonValidations.id,
      teamBudget: {
        type: 'number' as const,
        required: true,
        min: 1000,
        message: 'Team budget must be at least 1000',
      },
      minSquadSize: {
        type: 'number' as const,
        required: true,
        min: 1,
        max: 50,
      },
      maxSquadSize: {
        type: 'number' as const,
        required: true,
        min: 1,
        max: 50,
      },
      bidIncrement: {
        type: 'number' as const,
        required: true,
        min: 100,
      },
      bidTimeout: {
        type: 'number' as const,
        required: true,
        min: 10,
        max: 300,
        message: 'Bid timeout must be between 10 and 300 seconds',
      },
    },
  } as ValidationSchema,

  registerPlayer: {
    params: {
      id: commonValidations.id,
    },
    body: {
      playerId: commonValidations.id,
      basePrice: {
        type: 'number' as const,
        required: true,
        min: 100,
        message: 'Base price must be at least 100',
      },
    },
  } as ValidationSchema,

  placeBid: {
    params: {
      id: commonValidations.id,
    },
    body: {
      playerId: commonValidations.id,
      teamId: commonValidations.id,
      amount: {
        type: 'number' as const,
        required: true,
        min: 100,
        message: 'Bid amount must be at least 100',
      },
    },
  } as ValidationSchema,
};

// ============================================================================
// Payment Schemas
// ============================================================================

export const paymentSchemas = {
  initiatePayment: {
    body: {
      tournamentId: commonValidations.id,
      amount: {
        type: 'number' as const,
        required: true,
        min: 0,
        message: 'Payment amount must be a positive number',
      },
    },
  } as ValidationSchema,
};

// ============================================================================
// Notification Schemas
// ============================================================================

export const notificationSchemas = {
  updatePreferences: {
    body: {
      channels: {
        type: 'array' as const,
        required: true,
        message: 'Notification channels array is required',
      },
      types: {
        type: 'array' as const,
        required: true,
        message: 'Notification types array is required',
      },
    },
  } as ValidationSchema,
};

// ============================================================================
// Search Schemas
// ============================================================================

export const searchSchemas = {
  search: {
    query: {
      q: {
        type: 'string' as const,
        required: true,
        min: 1,
        max: 200,
        message: 'Search query is required and must be between 1 and 200 characters',
      },
      type: {
        type: 'string' as const,
        required: false,
        enum: ['player', 'team', 'tournament'],
        message: 'Search type must be one of: player, team, tournament',
      },
      sport: {
        type: 'string' as const,
        required: false,
        enum: Object.values(Sport),
      },
      location: {
        type: 'string' as const,
        required: false,
        max: 100,
      },
    },
  } as ValidationSchema,
};

// ============================================================================
// Certificate Schemas
// ============================================================================

export const certificateSchemas = {
  generate: {
    params: {
      tournamentId: commonValidations.id,
    },
  } as ValidationSchema,

  verify: {
    params: {
      code: {
        type: 'string' as const,
        required: true,
        pattern: /^[A-Z0-9]{8,20}$/,
        message: 'Invalid verification code format',
      },
    },
  } as ValidationSchema,
};
