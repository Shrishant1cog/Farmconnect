@echo off
setlocal enabledelayedexpansion
title FarmConnect Auto-Host Launcher

:: Force working directory to the batch script location
cd /d "%~dp0"

echo =======================================================
echo           STARTING FARMCONNECT WEB PLATFORM            
echo =======================================================
echo.

:: ---------------------------------------------------------
:: 1. Backend Setup & Run
:: ---------------------------------------------------------
echo [1/3] Preparing Backend Database & Services...
if not exist "backend\" (
    echo [ERROR] "backend" directory not found. Please run this script from the project root.
    pause
    exit /b 1
)

cd backend

if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
)

echo Generating Prisma Client...
call npx prisma generate

echo Synchronizing database schema...
:: Using db push avoids interactive CLI prompts that block startup
call npx prisma db push

echo Launching Backend Engine...
start "FarmConnect Backend (Port 5000)" cmd /k "npm run dev"

:: ---------------------------------------------------------
:: 2. Frontend Setup & Run
:: ---------------------------------------------------------
echo.
echo [2/3] Preparing Frontend UI...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

echo Launching Frontend Server...
start "FarmConnect Frontend (Port 3000)" cmd /k "npm run dev"

:: ---------------------------------------------------------
:: 3. Launch in Browser
:: ---------------------------------------------------------
echo.
echo [3/3] Waiting for servers to initialize...
timeout /t 6 /nobreak >nul

echo Opening FarmConnect in your default web browser...
start http://localhost:3000

echo.
echo =======================================================
echo     FarmConnect is starting up:
echo     - Frontend: http://localhost:3000
echo     - Backend:  http://localhost:5000
echo =======================================================
echo Keep the backend and frontend terminal windows open.
echo.
pause