import sqlite3
conn = sqlite3.connect('growthpilot_demo.db')
c = conn.cursor()
try:
    c.execute("ALTER TABLE prospects ADD COLUMN user_id VARCHAR DEFAULT 'default_user'")
    conn.commit()
    print("Migration successful")
except Exception as e:
    print("Error:", e)
conn.close()
