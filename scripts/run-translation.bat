@echo off
REM Wrapper script to run translation script from project root
REM This ensures the script runs from the correct directory

cd /d "%~dp0\.."
cd server
node ..\scripts\translate-fields.mjs %*

