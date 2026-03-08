import traceback
import sys

with open(r"d:\gstfraud\backend\test_out.txt", "w") as f:
    f.write("Starting import test...\n")
    try:
        import app
        f.write("Successfully imported app\n")
    except Exception as e:
        f.write("Error importing app:\n")
        f.write(traceback.format_exc())
