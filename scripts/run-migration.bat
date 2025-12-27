@echo off
REM Wrapper script to run migration from server directory (Windows)
REM This ensures firebase-admin can be found

cd /d "%~dp0..\server"
node ..\scripts\migrate-translations.mjs %*

