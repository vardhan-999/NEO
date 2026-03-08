import psycopg2

passwords = ["", "postgres", "root", "1234", "password", "admin"]
success = False

for pwd in passwords:
    try:
        conn = psycopg2.connect(f"postgresql://postgres:{pwd}@localhost:5432/gst_fraud")
        print(f"Success! Password is: '{pwd}'")
        conn.close()
        success = True
        break
    except psycopg2.OperationalError as e:
        if "password authentication failed" in str(e):
            print(f"Failed '{pwd}'")
        elif "database" in str(e) and "does not exist" in str(e):
            print(f"Password '{pwd}' is correct, but database 'gst_fraud' does not exist.")
            success = True
            break
        else:
            print(f"Other error with '{pwd}': {e}")
            
if not success:
    print("Could not connect with any test passwords.")
