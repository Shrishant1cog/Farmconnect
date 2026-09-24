@echo off
title FarmConnect Auto-Host Launcher
echo =======================================================
echo          STARTING FARMCONNECT WEB PLATFORM            
echo =======================================================
echo.

:: 1. Backend Setup & Run
echo [1/3] Preparing Backend Database & Services...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
)
call npx prisma generate
call npx prisma migrate dev --name init
start "FarmConnect Backend (Port 5000)" cmd /k "npm run dev"

:: 2. Frontend Setup & Run
echo [2/3] Preparing Frontend UI...
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
start "FarmConnect Frontend (Port 3000)" cmd /k "npm run dev"

:: 3. Launch in Browser
echo [3/3] Opening FarmConnect in your default web browser...
timeout /t 5 >nul
start http://localhost:3000

echo.
echo =======================================================
echo    Website is running live at http://localhost:3000   
echo =======================================================
pause