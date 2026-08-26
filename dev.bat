@echo off
start "API" cmd /k "cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload"
start "WEB" cmd /k "cd frontend && npm run dev"
