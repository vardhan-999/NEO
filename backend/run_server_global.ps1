$env:PYTHONPATH = "d:\gstfraud\backend\venv_clean\Lib\site-packages"
& "d:\gstfraud\backend\venv_clean\Scripts\python.exe" -m uvicorn app:app --reload --port 8000 *>&1 | Out-File "d:\gstfraud\backend\uvicorn_global_out.txt"
