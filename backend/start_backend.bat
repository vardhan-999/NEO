@echo off
cd /d d:\gstfraud\backend
echo Starting server using clean virtual environment...
d:\gstfraud\backend\venv_clean\Scripts\python.exe -m uvicorn app:app --reload --port 8000
