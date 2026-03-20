#!/bin/bash

# Razorpay Setup Script for Score Ocean
# This script helps you set up Razorpay payment gateway

echo "================================================"
echo "  Score Ocean - Razorpay Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "apps/backend/.env" ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp apps/backend/.env.example apps/backend/.env
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

echo ""
echo "================================================"
echo "  Step 1: Install Dependencies"
echo "================================================"
echo ""

cd apps/backend

# Remove Stripe if installed
if grep -q "stripe" package.json; then
    echo -e "${YELLOW}Removing Stripe...${NC}"
    npm uninstall stripe
    echo -e "${GREEN}✓ Stripe removed${NC}"
fi

# Install Razorpay
echo -e "${YELLOW}Installing Razorpay...${NC}"
npm install razorpay
echo -e "${GREEN}✓ Razorpay installed${NC}"

# Install other dependencies
echo -e "${YELLOW}Installing other dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

cd ../..

echo ""
echo "================================================"
echo "  Step 2: Configure Razorpay Keys"
echo "================================================"
echo ""

echo "Please follow these steps to get your Razorpay keys:"
echo ""
echo "1. Go to https://razorpay.com and sign up"
echo "2. Log in to https://dashboard.razorpay.com"
echo "3. Switch to 'Test Mode' (toggle in left sidebar)"
echo "4. Go to Settings → API Keys"
echo "5. Generate Test Key if not already generated"
echo ""

read -p "Do you have your Razorpay keys ready? (y/n): " has_keys

if [ "$has_keys" = "y" ] || [ "$has_keys" = "Y" ]; then
    echo ""
    read -p "Enter your Razorpay Key ID (rzp_test_...): " key_id
    read -p "Enter your Razorpay Key Secret: " key_secret
    read -p "Enter your Webhook Secret (create a random string): " webhook_secret
    
    # Update .env file
    sed -i.bak "s|PAYMENT_GATEWAY_KEY=.*|PAYMENT_GATEWAY_KEY=$key_id|g" apps/backend/.env
    sed -i.bak "s|PAYMENT_GATEWAY_SECRET=.*|PAYMENT_GATEWAY_SECRET=$key_secret|g" apps/backend/.env
    sed -i.bak "s|PAYMENT_WEBHOOK_SECRET=.*|PAYMENT_WEBHOOK_SECRET=$webhook_secret|g" apps/backend/.env
    
    # Remove backup file
    rm apps/backend/.env.bak
    
    echo -e "${GREEN}✓ Razorpay keys configured in .env file${NC}"
else
    echo ""
    echo -e "${YELLOW}Please update the following in apps/backend/.env:${NC}"
    echo "  PAYMENT_GATEWAY_KEY=rzp_test_YOUR_KEY_ID"
    echo "  PAYMENT_GATEWAY_SECRET=YOUR_KEY_SECRET"
    echo "  PAYMENT_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET"
fi

echo ""
echo "================================================"
echo "  Step 3: Setup Webhooks"
echo "================================================"
echo ""

echo "For local development, you need to expose your local server:"
echo ""
echo "Option 1: Using ngrok (Recommended)"
echo "  1. Download ngrok from https://ngrok.com/download"
echo "  2. Run: ngrok http 3000"
echo "  3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)"
echo "  4. In Razorpay Dashboard → Settings → Webhooks"
echo "  5. Add webhook: https://abc123.ngrok.io/api/payments/webhook"
echo "  6. Select events: payment.captured, payment.failed, order.paid"
echo ""
echo "Option 2: For production"
echo "  Use your production domain: https://your-domain.com/api/payments/webhook"
echo ""

echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo -e "${GREEN}✓ Razorpay integration is ready!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start your backend: cd apps/backend && npm run dev"
echo "  2. Start your frontend: cd apps/frontend && npm run dev"
echo "  3. Test payment with card: 4111 1111 1111 1111"
echo ""
echo "Documentation:"
echo "  - Setup Guide: RAZORPAY_SETUP_GUIDE.md"
echo "  - Frontend Example: RAZORPAY_FRONTEND_EXAMPLE.tsx"
echo ""
echo "Need help? Check the troubleshooting section in RAZORPAY_SETUP_GUIDE.md"
echo ""
