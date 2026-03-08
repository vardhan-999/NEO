import sys
import os
import traceback

sys.path.insert(0, r"d:\gstfraud\backend\venv\Lib\site-packages")

with open(r"d:\gstfraud\backend\actual_error.txt", "w") as f:
    f.write("Starting test...\n")
    f.flush()
    try:
        import app
        f.write("Successfully imported app!\n")
        f.flush()
    except Exception as e:
        f.write("Failed to import app:\n")
        f.write(traceback.format_exc())
        f.flush()
