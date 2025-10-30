@echo off
REM Service Provider Platform - Development Setup Script for Windows
REM This script helps you set up the project for development

echo 🚀 Setting up Service Provider Platform for development...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected
node --version

REM Check if PostgreSQL is available
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  PostgreSQL command line tools not found.
    echo    Please install PostgreSQL from: https://www.postgresql.org/download/
    echo    Or use pgAdmin to create the database manually.
) else (
    echo ✅ PostgreSQL command line tools found
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if .env file exists
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created. Please update it with your PostgreSQL credentials.
    echo    Edit .env and update DATABASE_URL with your PostgreSQL connection details.
    echo.
    echo    Example DATABASE_URL:
    echo    postgresql://postgres:your_password@localhost:5432/service_provider_db?schema=public
    echo.
    pause
)

REM Test database connection
echo 🔍 Testing database connection...
npx prisma db pull --schema=./prisma/schema.prisma >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Database connection failed. Please check your DATABASE_URL in .env file.
    echo    Make sure PostgreSQL is running and the database exists.
    pause
    exit /b 1
) else (
    echo ✅ Database connection successful
)

REM Run migrations
echo 🗄️  Running database migrations...
npx prisma migrate dev

REM Seed database
echo 🌱 Seeding database...
npx prisma db seed

echo.
echo 🎉 Setup complete! You can now start the development server:
echo    npm run start:dev
echo.
echo 📚 Useful commands:
echo    npm run start:dev    - Start development server
echo    npm run build        - Build for production
echo    npm run test         - Run tests
echo    npm run test:e2e     - Run E2E tests
echo    npx prisma studio    - Open Prisma Studio (database GUI)
echo.
echo 🌐 Access points:
echo    API: http://localhost:3000
echo    Docs: http://localhost:3000/docs
echo    Health: http://localhost:3000/health
pause































