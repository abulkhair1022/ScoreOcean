# Implementation Plan: Score Ocean

## Overview

This implementation plan breaks down the Score Ocean platform into discrete, incremental tasks. The platform will be built using:
- **Backend**: Node.js with TypeScript and Express.js for RESTful APIs
- **Frontend**: React.js with Tailwind CSS for responsive UI
- **Database**: PostgreSQL for data persistence
- **Cache**: Redis for caching and real-time features
- **Testing**: Jest and fast-check for property-based testing
- **Real-time**: Socket.io for WebSocket connections

Each task builds on previous work, with regular checkpoints to ensure quality and gather feedback.

## Tasks

- [x] 1. Project Setup and Infrastructure
  - Initialize monorepo with Node.js, TypeScript, and Express.js
  - Set up backend API structure with Express routes
  - Configure PostgreSQL database with connection pooling (using pg or Prisma)
  - Configure Redis for caching and pub/sub
  - Set up testing framework (Jest) and fast-check for property-based testing
  - Configure ESLint, Prettier, and TypeScript strict mode
  - Create shared types package for common interfaces
  - Set up environment configuration management (.env files)
  - Initialize React.js frontend with Vite or Create React App
  - Configure Tailwind CSS for styling
  - _Requirements: All (foundational)_

- [x] 2. Authentication Service Implementation
  - [x] 2.1 Implement user registration with role selection
    - Create User and UserProfile database models
    - Implement password hashing with bcrypt
    - Implement email uniqueness validation
    - Create registration endpoint with validation
    - _Requirements: 1.1, 1.2, 1.5, 1.6_
  
  - [ ]* 2.2 Write property test for registration
    - **Property 1: Registration creates account with correct role**
    - **Property 2: Invalid credentials are rejected**
    - **Property 5: Email uniqueness constraint**
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6**
  
  - [x] 2.3 Implement JWT-based authentication
    - Generate access and refresh tokens
    - Implement login endpoint
    - Implement token validation middleware
    - Implement token refresh endpoint
    - _Requirements: 1.3, 1.4_
  
  - [ ]* 2.4 Write property test for authentication
    - **Property 3: Authentication round-trip**
    - **Property 4: Wrong credentials fail authentication**
    - **Validates: Requirements 1.3, 1.4**

- [x] 3. User Profile Service Implementation
  - [x] 3.1 Implement profile management
    - Create profile CRUD endpoints
    - Implement profile data validation
    - Add profile image upload to object storage
    - _Requirements: 2.1, 2.4_
  
  - [ ]* 3.2 Write property test for profile persistence
    - **Property 6: Profile data persistence**
    - **Validates: Requirements 2.1, 2.4**
  
  - [x] 3.3 Implement sport profile management
    - Create sport-specific profile schemas (Cricket, Football, Kabaddi, Volleyball)
    - Implement add sport profile endpoint
    - Implement sport validation
    - Create statistics aggregation logic
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 13.1, 13.2, 13.3, 13.4_
  
  - [ ]* 3.4 Write property tests for sport profiles
    - **Property 7: Sport profile creation**
    - **Property 8: Sport validation**
    - **Property 9: Statistics aggregation correctness**
    - **Validates: Requirements 2.2, 2.3, 2.5, 2.6, 13.1-13.4**

- [x] 4. Checkpoint - Ensure authentication and profiles work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Team Service Implementation
  - [x] 5.1 Implement team creation and management
    - Create Team and TeamRoster database models
    - Implement team CRUD endpoints
    - Implement roster size validation by sport
    - _Requirements: 3.1, 3.6_
  
  - [ ]* 5.2 Write property tests for team management
    - **Property 11: Team data persistence**
    - **Property 16: Roster size constraints**
    - **Validates: Requirements 3.1, 3.6**
  
  - [x] 5.3 Implement team invitation system
    - Create TeamInvitation database model
    - Implement invite player endpoint
    - Implement accept/decline invitation endpoints
    - Integrate with notification service
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ]* 5.4 Write property tests for invitations
    - **Property 12: Invitation creates notification**
    - **Property 13: Invitation acceptance adds to roster**
    - **Property 14: Invitation decline removes invitation**
    - **Validates: Requirements 3.2, 3.3, 3.4**
  
  - [x] 5.5 Implement roster management
    - Implement add/remove player endpoints
    - Implement roster validation for tournament registration
    - _Requirements: 3.5, 3.7_
  
  - [ ]* 5.6 Write property test for roster operations
    - **Property 15: Roster removal updates immediately**
    - **Validates: Requirements 3.5**

- [x] 6. Tournament Service Implementation
  - [x] 6.1 Implement tournament creation
    - Create Tournament database model
    - Implement tournament CRUD endpoints
    - Implement format validation (League, Knockout, Group+Knockout)
    - Implement role-based tournament creation (Team and Organization roles)
    - _Requirements: 4.1, 4.2, 4.5, 4.7_
  
  - [ ]* 6.2 Write property tests for tournament creation
    - **Property 17: Tournament data persistence**
    - **Property 18: Tournament format validation**
    - **Property 22: Role-based tournament creation**
    - **Validates: Requirements 4.1, 4.2, 4.7**
  
  - [x] 6.3 Implement tournament lifecycle management
    - Implement status state machine (Draft → Registration_Open → etc.)
    - Implement publish tournament endpoint
    - Implement deadline enforcement
    - Implement capacity enforcement
    - _Requirements: 4.3, 4.4, 4.6, 18.1-18.8_
  
  - [ ]* 6.4 Write property tests for tournament lifecycle
    - **Property 19: Registration deadline enforcement**
    - **Property 20: Team capacity enforcement**
    - **Property 21: Tournament visibility after publication**
    - **Property 72: Tournament status transitions**
    - **Validates: Requirements 4.3, 4.4, 4.6, 18.1-18.8**

- [x] 7. Checkpoint - Ensure teams and tournaments work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Payment Service Implementation
  - [x] 8.1 Integrate payment gateway (Razorpay or Stripe)
    - Set up payment gateway SDK
    - Implement payment session creation
    - Implement webhook handler for payment events
    - Create Payment database model
    - _Requirements: 5.2, 15.1, 15.2_
  
  - [x] 8.2 Implement registration payment flow
    - Link registration to payment
    - Implement payment success handler
    - Implement payment failure handler
    - Implement commission calculation
    - _Requirements: 5.3, 5.4, 5.5, 15.3, 15.4, 15.5, 15.6_
  
  - [ ]* 8.3 Write property tests for payment processing
    - **Property 24: Payment initiation**
    - **Property 25: Successful payment confirms registration**
    - **Property 26: Failed payment keeps registration pending**
    - **Property 27: Payment record completeness**
    - **Property 28: Commission calculation correctness**
    - **Validates: Requirements 5.2-5.5, 15.1-15.6**
  
  - [x] 8.3 Implement payout management
    - Create Payout database model
    - Implement revenue calculation for hosts
    - Implement payout request endpoint
    - _Requirements: 15.7_
  
  - [ ]* 8.4 Write property test for revenue calculation
    - **Property 29: Revenue calculation correctness**
    - **Validates: Requirements 15.7**

- [x] 9. Tournament Registration Implementation
  - [x] 9.1 Implement registration workflow
    - Create TournamentRegistration database model
    - Implement register team endpoint with validation
    - Integrate with payment service
    - Implement registration confirmation
    - _Requirements: 5.1, 5.6_
  
  - [ ]* 9.2 Write property test for registration validation
    - **Property 23: Registration validation**
    - **Validates: Requirements 5.1**

- [x] 10. Fixture Generation Service Implementation
  - [x] 10.1 Implement round-robin fixture generator
    - Create algorithm for League format
    - Generate all pairings for N teams
    - Assign sequential match numbers
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ]* 10.2 Write property test for round-robin fixtures
    - **Property 31: Round-robin fixture correctness**
    - **Property 34: Sequential match numbering**
    - **Validates: Requirements 6.2, 6.5**
  
  - [x] 10.3 Implement knockout fixture generator
    - Create algorithm for Knockout format
    - Generate single-elimination bracket
    - Handle byes for non-power-of-2 team counts
    - _Requirements: 6.3_
  
  - [ ]* 10.4 Write property test for knockout fixtures
    - **Property 32: Knockout bracket correctness**
    - **Validates: Requirements 6.3**
  
  - [x] 10.5 Implement group+knockout fixture generator
    - Create algorithm for Group+Knockout format
    - Generate group stage fixtures
    - Generate knockout stage for qualifiers
    - _Requirements: 6.4_
  
  - [ ]* 10.6 Write property test for group+knockout fixtures
    - **Property 33: Group+Knockout fixture correctness**
    - **Validates: Requirements 6.4**
  
  - [x] 10.7 Implement fixture management
    - Create Fixture database model
    - Implement fixture modification endpoints
    - Implement fixture publication with notifications
    - _Requirements: 6.6, 6.7_
  
  - [ ]* 10.8 Write property tests for fixture management
    - **Property 35: Fixture modification persistence**
    - **Property 36: Fixture publication notifications**
    - **Validates: Requirements 6.6, 6.7**

- [x] 11. Checkpoint - Ensure registration and fixtures work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Match Service Implementation
  - [x] 12.1 Implement match creation and management
    - Create Match and ScoreHistory database models
    - Implement create match from fixture
    - Implement get match endpoint
    - Implement sport-specific score structures
    - _Requirements: 7.1, 13.5_
  
  - [x] 12.2 Implement live score entry
    - Implement score update endpoint with authorization
    - Implement sport-specific score validation
    - Store score updates in history
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [ ]* 12.3 Write property tests for score management
    - **Property 37: Score update authorization**
    - **Property 38: Sport-specific score validation**
    - **Property 39: Score update persistence**
    - **Property 41: Score history completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**
  
  - [x] 12.4 Implement match finalization
    - Implement finalize match endpoint
    - Prevent score updates after finalization
    - Trigger statistics and points table updates
    - Send result notifications
    - _Requirements: 7.6, 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ]* 12.5 Write property tests for match finalization
    - **Property 42: Finalized match immutability**
    - **Property 70: Match finalization triggers updates**
    - **Property 71: Match finalization notifications**
    - **Validates: Requirements 7.6, 17.1-17.5**

- [x] 13. Real-Time Updates Implementation
  - [x] 13.1 Set up WebSocket server with Socket.io
    - Install and configure Socket.io on Node.js backend
    - Implement connection management and authentication
    - Implement room-based subscriptions (match rooms, auction rooms)
    - _Requirements: 7.4, 19.4_
  
  - [x] 13.2 Implement score broadcasting
    - Broadcast score updates to match subscribers
    - Implement Redis pub/sub for multi-server broadcasting
    - _Requirements: 7.4_
  
  - [ ]* 13.3 Write property test for score broadcasting
    - **Property 40: Score broadcast to connected clients**
    - **Validates: Requirements 7.4**
  
  - [x] 13.4 Implement reconnection handling
    - Track missed updates during disconnection
    - Deliver missed updates on reconnection
    - Handle concurrent updates
    - _Requirements: 19.5, 19.6_
  
  - [ ]* 13.5 Write property tests for real-time synchronization
    - **Property 75: Reconnection synchronization**
    - **Property 76: Concurrent update preservation**
    - **Validates: Requirements 19.5, 19.6**

- [x] 14. Points Table Service Implementation
  - [x] 14.1 Implement points calculation
    - Create PointsTable database model
    - Implement sport-specific point rules
    - Implement tiebreaker calculations (goal difference, win percentage)
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 14.2 Write property tests for points calculation
    - **Property 43: Points table updates on match completion**
    - **Property 44: Sport-specific points calculation**
    - **Property 45: Tiebreaker calculation correctness**
    - **Validates: Requirements 8.1, 8.2, 8.3**
  
  - [x] 14.3 Implement points table ranking
    - Implement ranking algorithm with tiebreakers
    - Cache points table in Redis
    - Implement get points table endpoint
    - _Requirements: 8.4, 8.5, 8.6_
  
  - [ ]* 14.4 Write property test for ranking correctness
    - **Property 46: Points table ranking correctness**
    - **Validates: Requirements 8.4, 8.5, 8.6**

- [x] 15. Checkpoint - Ensure matches and scoring work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Player Performance Statistics Implementation
  - [x] 16.1 Implement performance recording
    - Create PlayerPerformance database model
    - Record performance data on match finalization
    - Update sport profile statistics
    - _Requirements: 2.5, 17.3_
  
  - [x] 16.2 Implement statistics dashboard
    - Implement get performance stats endpoint
    - Implement date range filtering
    - Implement tournament filtering
    - Implement comparison calculations (team average, sport average)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_
  
  - [ ]* 16.3 Write property tests for statistics
    - **Property 9: Statistics aggregation correctness** (already tested in task 3.4, verify integration)
    - **Property 10: Statistics filtering correctness**
    - **Validates: Requirements 9.1-9.4, 9.6**

- [x] 17. Notification Service Implementation
  - [x] 17.1 Implement notification infrastructure
    - Create Notification and NotificationPreferences database models
    - Set up email service integration (SendGrid or AWS SES)
    - Set up SMS service integration (Twilio)
    - Implement notification queue with Redis
    - _Requirements: 10.1-10.7_
  
  - [x] 17.2 Implement notification delivery
    - Implement multi-channel notification sending
    - Implement notification preferences enforcement
    - Store notifications in history
    - Implement get notifications endpoint
    - _Requirements: 10.6, 10.7_
  
  - [ ]* 17.3 Write property tests for notifications
    - **Property 47: Registration confirmation notifications**
    - **Property 48: Match reminder notifications**
    - **Property 49: Score update notifications**
    - **Property 50: Notification preferences enforcement**
    - **Property 51: Notification history completeness**
    - **Validates: Requirements 10.1-10.7**
  
  - [x] 17.3 Implement real-time notification delivery
    - Broadcast notifications via WebSocket
    - Implement notification subscription
    - _Requirements: 10.5_

- [x] 18. Search Service Implementation
  - [x] 18.1 Implement search functionality
    - Implement player search with fuzzy matching
    - Implement team search with fuzzy matching
    - Implement tournament search
    - Implement relevance ranking
    - _Requirements: 11.1, 11.2, 11.3, 11.5_
  
  - [ ]* 18.2 Write property tests for search
    - **Property 52: Search result relevance**
    - **Property 53: Search result completeness**
    - **Property 54: Search result ranking**
    - **Validates: Requirements 11.1-11.5**
  
  - [x] 18.3 Implement search filtering
    - Implement filter by sport
    - Implement filter by location
    - Implement filter by performance level
    - _Requirements: 11.6_
  
  - [ ]* 18.4 Write property test for search filtering
    - **Property 55: Search filter correctness**
    - **Validates: Requirements 11.6**

- [x] 19. Checkpoint - Ensure statistics, notifications, and search work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Auction Service Implementation
  - [x] 20.1 Implement auction infrastructure
    - Create Auction, AuctionPlayer, AuctionBid, and AuctionResult database models
    - Implement create auction endpoint
    - Implement player registration for auction
    - _Requirements: 21.1, 21.2_
  
  - [ ]* 20.2 Write property tests for auction setup
    - **Property 78: Auction creation**
    - **Property 79: Player auction registration**
    - **Validates: Requirements 21.1, 21.2**
  
  - [x] 20.3 Implement auction bidding logic
    - Implement start auction endpoint
    - Implement place bid endpoint with validation
    - Implement bid amount validation
    - Implement budget tracking and deduction
    - _Requirements: 21.3, 21.4, 21.7, 21.8_
  
  - [ ]* 20.4 Write property tests for bidding
    - **Property 80: Auction pool visibility**
    - **Property 81: Bid validation**
    - **Property 84: Budget deduction correctness**
    - **Property 85: Budget exhaustion prevents bidding**
    - **Validates: Requirements 21.3, 21.4, 21.7, 21.8**
  
  - [x] 20.5 Implement real-time auction broadcasting
    - Broadcast bids to all auction participants via WebSocket
    - Implement auction room subscriptions
    - _Requirements: 21.5_
  
  - [ ]* 20.6 Write property test for bid broadcasting
    - **Property 82: Bid broadcast**
    - **Validates: Requirements 21.5**
  
  - [x] 20.7 Implement auction completion
    - Implement player assignment to highest bidder
    - Implement squad size enforcement
    - Finalize team rosters based on auction results
    - Send notifications to players and teams
    - Store complete auction history
    - _Requirements: 21.6, 21.9, 21.10, 21.11, 21.12_
  
  - [ ]* 20.8 Write property tests for auction completion
    - **Property 83: Player assignment to highest bidder**
    - **Property 86: Auction roster finalization**
    - **Property 87: Squad size enforcement during auction**
    - **Property 88: Auction sale notifications**
    - **Property 89: Auction history completeness**
    - **Validates: Requirements 21.6, 21.9-21.12**

- [x] 21. Certificate Generation Service Implementation
  - [x] 21.1 Implement certificate generation
    - Set up PDF generation library (PDFKit or similar)
    - Create certificate template with branding
    - Implement generate certificates endpoint
    - Store certificates in object storage
    - Create Certificate database model with verification codes
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ]* 21.2 Write property tests for certificates
    - **Property 56: Certificate generation for all participants**
    - **Property 57: Certificate content completeness**
    - **Property 58: Certificate format validation**
    - **Property 59: Certificate accessibility**
    - **Property 60: Certificate ID uniqueness**
    - **Validates: Requirements 12.1-12.5**
  
  - [x] 21.3 Implement certificate verification
    - Implement verification URL endpoint
    - Return certificate data for valid verification codes
    - _Requirements: 12.6_
  
  - [ ]* 21.4 Write property test for certificate verification
    - **Property 61: Certificate verification**
    - **Validates: Requirements 12.6**

- [x] 22. Checkpoint - Ensure auctions and certificates work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Access Control and Permissions Implementation
  - [x] 23.1 Implement role-based access control middleware
    - Create permission checking middleware
    - Implement resource ownership validation
    - Implement admin override logic
    - Apply to all protected endpoints
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_
  
  - [ ]* 23.2 Write property tests for access control
    - **Property 62: Tournament ownership enforcement**
    - **Property 63: Admin unrestricted access**
    - **Property 64: Permission validation on all operations**
    - **Property 65: Permission updates take effect immediately**
    - **Validates: Requirements 14.1-14.7**

- [x] 24. Data Validation Implementation
  - [x] 24.1 Implement comprehensive validation middleware
    - Create validation schemas for all endpoints
    - Implement required field validation
    - Implement email format validation
    - Implement date validation
    - Implement file upload validation
    - Return specific error messages for validation failures
    - _Requirements: 16.1, 16.2, 16.3, 16.5, 16.6_
  
  - [ ]* 24.2 Write property tests for validation
    - **Property 66: Required field validation**
    - **Property 67: Email format validation**
    - **Property 68: Date validation**
    - **Property 69: File upload validation**
    - **Validates: Requirements 16.1-16.6**

- [x] 25. Frontend Web Application Implementation
  - [x] 25.1 Set up React.js frontend with Tailwind CSS
    - Initialize React.js project with TypeScript (using Vite or CRA)
    - Install and configure Tailwind CSS
    - Set up React Router for navigation
    - Configure Axios or Fetch for API client with authentication interceptors
    - Implement responsive layout framework with Tailwind
    - Set up Socket.io client for real-time features
    - _Requirements: 20.1, 20.3, 20.6_
  
  - [x] 25.2 Implement authentication UI with Tailwind
    - Create registration form with role selection (styled with Tailwind)
    - Create login form (styled with Tailwind)
    - Implement JWT token storage in localStorage
    - Create protected route wrapper component
    - _Requirements: 1.1-1.6_
  
  - [x] 25.3 Implement user profile UI with Tailwind
    - Create profile view and edit forms (styled with Tailwind)
    - Create sport profile management interface
    - Implement profile image upload with preview
    - Create statistics dashboard with charts (using Chart.js or Recharts)
    - _Requirements: 2.1-2.6, 9.1-9.6_
  
  - [x] 25.4 Implement team management UI with Tailwind
    - Create team creation and edit forms (styled with Tailwind)
    - Create roster management interface with drag-and-drop
    - Create invitation management interface
    - Implement team search with filters
    - _Requirements: 3.1-3.7, 11.1-11.6_
  
  - [x] 25.5 Implement tournament management UI with Tailwind
    - Create tournament creation and edit forms (styled with Tailwind)
    - Create tournament listing and search with filters
    - Create registration interface with payment integration
    - Create fixture management interface with calendar view
    - _Requirements: 4.1-4.7, 5.1-5.6, 6.1-6.7_
  
  - [x] 25.6 Implement live match UI with Tailwind
    - Create match view with live score display (styled with Tailwind)
    - Create score entry interface for authorized users
    - Implement Socket.io connection for real-time score updates
    - Create points table display with sorting
    - _Requirements: 7.1-7.6, 8.1-8.6_
  
  - [x] 25.7 Implement auction UI with Tailwind
    - Create auction setup interface (styled with Tailwind)
    - Create live bidding interface with real-time updates via Socket.io
    - Display player pool with cards and team budgets
    - Show auction results and final rosters
    - _Requirements: 21.1-21.12_
  
  - [x] 25.8 Implement notifications UI with Tailwind
    - Create notification center dropdown (styled with Tailwind)
    - Implement real-time notification display via Socket.io
    - Create notification preferences interface
    - Add notification badges and sounds
    - _Requirements: 10.1-10.7_
  
  - [x] 25.9 Implement certificates UI with Tailwind
    - Display earned certificates in profile (styled with Tailwind)
    - Implement certificate download button
    - Create certificate verification page
    - _Requirements: 12.1-12.6_

- [ ]* 26. Write integration tests for key user workflows
  - Test complete registration → tournament → match → results flow
  - Test auction workflow from setup to completion
  - Test real-time features (live scoring, auction bidding)
  - Test payment flow with mock payment gateway

- [x] 27. Final Checkpoint - Complete system integration
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all requirements are implemented
  - Verify all correctness properties are tested

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and user feedback
- The implementation follows a bottom-up approach: infrastructure → services → integration → frontend
- Real-time features (WebSocket) are integrated throughout relevant services
- All services are independently testable with mocked dependencies
