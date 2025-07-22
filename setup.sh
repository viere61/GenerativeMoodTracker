#!/bin/bash

# Generative Mood Tracker - Quick Setup Script
# This script sets up both the frontend and backend for local development

# Text styling
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
RED="\033[0;31m"
NC="\033[0m" # No Color

echo -e "${BOLD}${BLUE}=== Generative Mood Tracker - Quick Setup ===${NC}"
echo -e "${YELLOW}This script will set up both the frontend and backend for local development${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js before continuing.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Node.js version 16 or higher is required. You have version $NODE_VERSION.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js is installed (v$(node -v))${NC}"

# Install frontend dependencies
echo -e "\n${BOLD}Installing frontend dependencies...${NC}"
npm install

# Create frontend environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "\n${YELLOW}Creating frontend .env file...${NC}"
    cat > .env << EOL
# Frontend Environment Variables
EXPO_PUBLIC_BACKEND_URL=http://localhost:3001
EXPO_PUBLIC_DEBUG_MODE=true
EOL
    echo -e "${GREEN}✓ Created frontend .env file${NC}"
fi

# Setup backend
echo -e "\n${BOLD}Setting up backend...${NC}"
cd backend || { echo -e "${RED}Backend directory not found${NC}"; exit 1; }

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
npm install

# Create backend environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "\n${YELLOW}Creating backend .env file...${NC}"
    echo -e "${YELLOW}You'll need to add your ElevenLabs API key to this file.${NC}"
    
    cat > .env << EOL
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006,http://localhost:8081,exp://localhost:19000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# AI Music Generation API Keys (configure at least one)
# ElevenLabs API (Recommended) - https://elevenlabs.io/
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Alternative services (optional)
# Replicate - https://replicate.com/account/api-tokens
# REPLICATE_API_TOKEN=your_replicate_token_here

# Hugging Face - https://huggingface.co/settings/tokens
# HUGGINGFACE_API_TOKEN=your_huggingface_token_here
EOL
    echo -e "${GREEN}✓ Created backend .env file${NC}"
fi

# Go back to the root directory
cd ..

echo -e "\n${BOLD}${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}To start the app:${NC}"
echo -e "run: npx expo start"
echo -e "\n${BLUE}Happy mood tracking!${NC}"

# Make the script executable
chmod +x setup.sh