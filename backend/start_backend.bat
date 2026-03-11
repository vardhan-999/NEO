@echo off
cd /d d:\project\neotrace-gst\backend
echo Starting server using clean virtual environment...
d:\project\neotrace-gst\backend\.venv\Scripts\python.exe -m uvicorn app:app --reload --port 8000
