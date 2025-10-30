#!/bin/bash

echo "🚀 Setting up Service Provider Database..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure it."
    exit 1
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run prisma:generate

# Run database migrations
echo "🗄️ Running database migrations..."
npm run prisma:migrate

# Seed the database
echo "🌱 Seeding database..."
npm run prisma:seed

echo "✅ Database setup complete!"
echo ""
echo "🔗 Available services:"
echo "   - API: http://localhost:3000/api/v1"
echo "   - Swagger: http://localhost:3000/docs"
echo "   - PgAdmin: http://localhost:5050"
echo ""
echo "👤 Default admin user:"
echo "   - Email: admin@example.com"
echo "   - Password: admin123"
































