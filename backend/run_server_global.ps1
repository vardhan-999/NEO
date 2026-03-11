$env:PYTHONPATH = "d:\project\neotrace-gst\backend\.venv\Lib\site-packages"
& "d:\project\neotrace-gst\backend\.venv\Scripts\python.exe" -m uvicorn app:app --reload --port 8000 *>&1 | Out-File "d:\project\neotrace-gst\backend\uvicorn_global_out.txt"
