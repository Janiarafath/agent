from backend.database import SessionLocal
from backend import models

db = SessionLocal()
prospects = db.query(models.Prospect).filter(models.Prospect.public_phone == None).all()
for p in prospects:
    p.public_phone = "918148647818"
db.commit()
print("Fixed missing phones")
db.close()
