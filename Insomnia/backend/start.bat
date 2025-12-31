@echo off
echo 🚀 Starting Insomnia Game Backend...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please copy env.example to .env and configure your settings.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo ✅ Dependencies ready
echo 🎮 Starting backend service...
echo.

npm run dev
