#!/bin/bash

# Service Provider Platform - Development Setup Script
# This script helps you set up the project for development

echo "🚀 Setting up Service Provider Platform for development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL command line tools not found."
    echo "   Please install PostgreSQL from: https://www.postgresql.org/download/"
    echo "   Or use pgAdmin to create the database manually."
else
    echo "✅ PostgreSQL command line tools found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please update it with your PostgreSQL credentials."
    echo "   Edit .env and update DATABASE_URL with your PostgreSQL connection details."
    echo ""
    echo "   Example DATABASE_URL:"
    echo "   postgresql://postgres:your_password@localhost:5432/service_provider_db?schema=public"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Test database connection
echo "🔍 Testing database connection..."
if npx prisma db pull --schema=./prisma/schema.prisma &> /dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your DATABASE_URL in .env file."
    echo "   Make sure PostgreSQL is running and the database exists."
    exit 1
fi

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

echo ""
echo "🎉 Setup complete! You can now start the development server:"
echo "   npm run start:dev"
echo ""
echo "📚 Useful commands:"
echo "   npm run start:dev    - Start development server"
echo "   npm run build        - Build for production"
echo "   npm run test         - Run tests"
echo "   npm run test:e2e     - Run E2E tests"
echo "   npx prisma studio    - Open Prisma Studio (database GUI)"
echo ""
echo "🌐 Access points:"
echo "   API: http://localhost:3000"
echo "   Docs: http://localhost:3000/docs"
echo "   Health: http://localhost:3000/health"






























