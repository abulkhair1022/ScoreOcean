# Design Document: Rental Marketplace Platform

## Overview

The rental marketplace platform is a web-based peer-to-peer system that connects item owners (listers) with people who need to rent items (renters). The platform handles the complete rental lifecycle: listing creation, search and discovery, booking requests, payment processing, item transfer coordination, and post-rental reviews.

The system follows a multi-tier architecture with a web frontend, RESTful API backend, relational database for transactional data, and integrations with third-party services for payments, notifications, and file storage.

### Key Design Principles

1. **Trust and Safety First**: Identity verification, condition documentation, and dispute resolution are core features
2. **Scalability**: Designed to handle thousands of concurrent users and listings
3. **Transaction Integrity**: All financial transactions are atomic with proper rollback mechanisms
4. **User Experience**: Simple, intuitive interfaces for both listers and renters
5. **Mobile-First**: Responsive design optimized for mobile devices

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Frontend                          │
│              (React/Vue.js - Responsive SPA)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway/Load Balancer               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Server Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │   Listing    │  │   Booking    │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Payment    │  │   Messaging  │  │   Review     │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │   S3/Blob    │      │
│  │  (Primary)   │  │   (Cache)    │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘

                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Stripe     │  │   SendGrid   │  │   Twilio     │      │
│  │  (Payments)  │  │   (Email)    │  │    (SMS)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React.js with TypeScript, Redux for state management, Material-UI components
- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL for relational data, Redis for caching and session management
- **File Storage**: AWS S3 or Azure Blob Storage for images and documents
- **Payment Processing**: Stripe Connect for payment and payout handling
- **Email**: SendGrid for transactional emails
- **SMS**: Twilio for SMS notifications
- **Authentication**: JWT tokens with refresh token rotation
- **API**: RESTful API with JSON payloads

## Components and Interfaces

### 1. Authentication Service

Handles user registration, login, session management, and identity verification.

**Key Functions:**
- `registerUser(email, password, name)`: Creates new user account
- `authenticateUser(email, password)`: Validates credentials and returns JWT token
- `verifyEmail(token)`: Confirms email ownership
- `resetPassword(email)`: Initiates password reset flow
- `verifyIdentity(userId, documentImage)`: Processes identity verification
- `refreshToken(refreshToken)`: Issues new access token

**Interfaces:**
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  profilePhoto?: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  isIdentityVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### 2. Listing Service

Manages item listings, availability calendars, and listing search/discovery.

**Key Functions:**
- `createListing(listerId, itemDetails)`: Creates new item listing
- `updateListing(listingId, updates)`: Modifies listing details
- `deactivateListing(listingId)`: Removes listing from search
- `searchListings(query, filters)`: Returns matching listings
- `getListingDetails(listingId)`: Retrieves complete listing information
- `updateAvailability(listingId, dates, available)`: Manages availability calendar

**Interfaces:**
```typescript
interface Listing {
  id: string;
  listerId: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  securityDeposit: number;
  location: GeoLocation;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface AvailabilityCalendar {
  listingId: string;
  unavailableDates: Date[];
  blackoutDates: Date[];
}

interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: GeoLocation;
  radiusMiles?: number;
  startDate?: Date;
  endDate?: Date;
}
```


### 3. Booking Service

Handles rental requests, booking confirmations, and rental lifecycle management.

**Key Functions:**
- `createRentalRequest(renterId, listingId, startDate, endDate, message)`: Creates rental request
- `approveRequest(requestId, listerId)`: Converts request to confirmed booking
- `declineRequest(requestId, listerId, reason)`: Rejects rental request
- `calculateRentalCost(listingId, startDate, endDate)`: Computes total cost
- `confirmItemTransfer(bookingId, userId, photos)`: Records item handoff
- `completeRental(bookingId)`: Finalizes rental and triggers payouts
- `reportLateReturn(bookingId, daysLate)`: Applies late fees

**Interfaces:**
```typescript
interface RentalRequest {
  id: string;
  renterId: string;
  listingId: string;
  startDate: Date;
  endDate: Date;
  message?: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: Date;
}

interface Booking {
  id: string;
  renterId: string;
  listerId: string;
  listingId: string;
  startDate: Date;
  endDate: Date;
  rentalAmount: number;
  serviceFee: number;
  securityDeposit: number;
  totalAmount: number;
  status: 'confirmed' | 'active' | 'completed' | 'disputed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  pickupPhotos: string[];
  returnPhotos: string[];
  createdAt: Date;
  completedAt?: Date;
}

interface CostBreakdown {
  rentalAmount: number;
  serviceFee: number;
  securityDeposit: number;
  insuranceFee?: number;
  deliveryFee?: number;
  lateFee?: number;
  totalAmount: number;
}
```

### 4. Payment Service

Integrates with Stripe to handle payments, escrow, payouts, and refunds.

**Key Functions:**
- `processPayment(bookingId, paymentMethodId)`: Charges renter for booking
- `holdSecurityDeposit(bookingId, amount)`: Authorizes deposit charge
- `releaseSecurityDeposit(bookingId)`: Refunds deposit to renter
- `deductFromDeposit(bookingId, amount, reason)`: Charges deposit for damages
- `schedulePayoutToLister(bookingId)`: Queues payment to lister
- `processRefund(bookingId, amount, reason)`: Returns money to renter
- `chargeLateF ee(bookingId, amount)`: Bills renter for late return

**Interfaces:**
```typescript
interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'rental' | 'deposit' | 'late_fee' | 'insurance' | 'delivery';
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  stripePaymentIntentId: string;
  createdAt: Date;
}

interface Payout {
  id: string;
  listerId: string;
  bookingId: string;
  amount: number;
  serviceFeeDeducted: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  stripeTransferId?: string;
  scheduledDate: Date;
  completedDate?: Date;
}

interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: 'card' | 'bank_account';
  last4: string;
  isDefault: boolean;
}
```

### 5. Messaging Service

Provides in-platform communication between users with content moderation.

**Key Functions:**
- `createConversation(userId1, userId2, listingId)`: Starts new conversation thread
- `sendMessage(conversationId, senderId, content, attachments)`: Sends message
- `getConversation(conversationId)`: Retrieves message history
- `getUserConversations(userId)`: Lists all user conversations
- `moderateMessage(content)`: Filters prohibited content

**Interfaces:**
```typescript
interface Conversation {
  id: string;
  participants: string[];
  listingId?: string;
  lastMessageAt: Date;
  createdAt: Date;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments: string[];
  isRead: boolean;
  createdAt: Date;
}
```


### 6. Review Service

Manages ratings and reviews for items and users.

**Key Functions:**
- `submitReview(bookingId, reviewerId, rating, reviewText)`: Creates new review
- `getItemReviews(listingId)`: Retrieves all reviews for an item
- `getUserReviews(userId)`: Gets reviews received by a user
- `calculateAverageRating(targetId, targetType)`: Computes average rating
- `flagReview(reviewId, reason)`: Reports inappropriate review

**Interfaces:**
```typescript
interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  targetType: 'item' | 'user';
  targetId: string;
  rating: number; // 1-5
  reviewText?: string;
  createdAt: Date;
}

interface RatingStats {
  targetId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
```

### 7. Notification Service

Sends notifications via email, SMS, and in-app channels.

**Key Functions:**
- `sendNotification(userId, type, data)`: Dispatches notification
- `getUserPreferences(userId)`: Retrieves notification settings
- `updatePreferences(userId, preferences)`: Modifies notification settings
- `markAsRead(notificationId)`: Updates notification status

**Interfaces:**
```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'rental_request' | 'request_approved' | 'request_declined' | 
        'payment_confirmed' | 'rental_starting' | 'rental_ending' | 
        'new_message' | 'review_received' | 'dispute_opened';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationPreferences {
  userId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  notificationTypes: {
    [key: string]: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}
```

### 8. Dispute Service

Handles conflict resolution between listers and renters.

**Key Functions:**
- `openDispute(bookingId, reporterId, description, evidence)`: Creates dispute
- `submitEvidence(disputeId, userId, evidence)`: Adds supporting materials
- `resolveDispute(disputeId, resolution, amount)`: Closes dispute with outcome
- `escalateDispute(disputeId)`: Flags for admin review

**Interfaces:**
```typescript
interface Dispute {
  id: string;
  bookingId: string;
  reporterId: string;
  respondentId: string;
  description: string;
  evidence: Evidence[];
  status: 'open' | 'under_review' | 'resolved' | 'escalated';
  resolution?: string;
  resolvedAmount?: number;
  createdAt: Date;
  resolvedAt?: Date;
}

interface Evidence {
  userId: string;
  type: 'photo' | 'document' | 'message';
  url: string;
  description: string;
  uploadedAt: Date;
}
```

## Data Models

### Database Schema

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  profile_photo VARCHAR(500),
  phone_number VARCHAR(20),
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_identity_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  INDEX idx_email (email)
);
```

**Listings Table:**
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lister_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  images TEXT[], -- Array of image URLs
  daily_rate DECIMAL(10,2) NOT NULL,
  weekly_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  security_deposit DECIMAL(10,2) DEFAULT 0,
  late_fee_per_day DECIMAL(10,2) DEFAULT 0,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_until TIMESTAMP,
  delivery_available BOOLEAN DEFAULT FALSE,
  delivery_fee DECIMAL(10,2),
  delivery_radius_miles INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lister (lister_id),
  INDEX idx_category (category),
  INDEX idx_location (latitude, longitude),
  INDEX idx_active (is_active)
);
```


**Availability Table:**
```sql
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  is_blackout BOOLEAN DEFAULT FALSE,
  UNIQUE(listing_id, date),
  INDEX idx_listing_date (listing_id, date)
);
```

**Rental Requests Table:**
```sql
CREATE TABLE rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  decline_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_renter (renter_id),
  INDEX idx_listing (listing_id),
  INDEX idx_status (status)
);
```

**Bookings Table:**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_request_id UUID REFERENCES rental_requests(id),
  renter_id UUID NOT NULL REFERENCES users(id),
  lister_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rental_amount DECIMAL(10,2) NOT NULL,
  service_fee DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2) DEFAULT 0,
  insurance_fee DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  late_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  payment_status VARCHAR(20) DEFAULT 'pending',
  pickup_photos TEXT[],
  return_photos TEXT[],
  pickup_confirmed_at TIMESTAMP,
  return_confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_renter (renter_id),
  INDEX idx_lister (lister_id),
  INDEX idx_listing (listing_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_status (status)
);
```

**Payments Table:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking (booking_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);
```

**Payouts Table:**
```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lister_id UUID NOT NULL REFERENCES users(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  amount DECIMAL(10,2) NOT NULL,
  service_fee_deducted DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  stripe_transfer_id VARCHAR(255),
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lister (lister_id),
  INDEX idx_status (status),
  INDEX idx_scheduled (scheduled_date)
);
```

**Messages Table:**
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id UUID NOT NULL REFERENCES users(id),
  participant2_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_participants (participant1_id, participant2_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  attachments TEXT[],
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (conversation_id),
  INDEX idx_created (created_at)
);
```

**Reviews Table:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  reviewee_id UUID NOT NULL REFERENCES users(id),
  target_type VARCHAR(10) NOT NULL,
  target_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(booking_id, reviewer_id, target_type),
  INDEX idx_target (target_type, target_id),
  INDEX idx_reviewee (reviewee_id)
);
```


**Disputes Table:**
```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  reporter_id UUID NOT NULL REFERENCES users(id),
  respondent_id UUID NOT NULL REFERENCES users(id),
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  resolution TEXT,
  resolved_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  INDEX idx_booking (booking_id),
  INDEX idx_status (status)
);

CREATE TABLE dispute_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  url VARCHAR(500) NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dispute (dispute_id)
);
```

**Notifications Table:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
);
```

**Wishlists Table:**
```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, listing_id),
  INDEX idx_user (user_id)
);
```

### Key Relationships

1. **User → Listings**: One-to-many (a user can list multiple items)
2. **Listing → Availability**: One-to-many (each listing has multiple availability records)
3. **Listing → Bookings**: One-to-many (an item can be booked multiple times)
4. **User → Bookings**: One-to-many (as both renter and lister)
5. **Booking → Payments**: One-to-many (rental payment, deposit, late fees)
6. **Booking → Reviews**: One-to-many (renter reviews item, lister reviews renter)
7. **Booking → Disputes**: One-to-one (optional)
8. **Users → Conversations**: Many-to-many through conversations table
9. **Conversation → Messages**: One-to-many

### Data Integrity Constraints

1. **Booking Date Validation**: `end_date` must be after `start_date`
2. **Rating Range**: Reviews must have ratings between 1 and 5
3. **Payment Amount**: All monetary amounts must be non-negative
4. **Availability Consistency**: Booked dates must be marked unavailable
5. **Review Uniqueness**: Each user can only review each booking once per target type
6. **Cascade Deletes**: Deleting a listing cascades to availability records
7. **Referential Integrity**: All foreign keys must reference valid records
