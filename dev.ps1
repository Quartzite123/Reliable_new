Start-Process cmd -ArgumentList '/k', 'cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload'
Start-Process cmd -ArgumentList '/k', 'cd frontend && npm run dev'
