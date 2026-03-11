from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user
from datetime import datetime
import csv
import io

router = APIRouter()

@router.post("/import/csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    content = await file.read()
    try:
        decoded = content.decode('utf-8')
    except Exception:
        decoded = content.decode('latin-1')
        
    reader = csv.DictReader(io.StringIO(decoded))
    imported = 0
    # simple csv parser (Date, Description, Amount)
    for row in reader:
        try:
            # Very basic assumption
            date_str = row.get("Date", row.get("Data", ""))
            desc = row.get("Description", row.get("Descrição", ""))
            amount_str = row.get("Amount", row.get("Valor", "0")).replace('R$', '').replace('.','').replace(',','.')
            amount = float(amount_str)
            
            # Skip empty
            if not date_str or not desc:
                continue
                
            tx_type = "income" if amount >= 0 else "expense"
            abs_amount = abs(amount)
            
            tx = models.Transaction(
                amount=abs_amount,
                type=tx_type,
                description=desc,
                date=datetime.strptime(date_str, "%Y-%m-%d"), # Assume YYYY-MM-DD
                owner_id=current_user.id
            )
            db.add(tx)
            imported += 1
        except Exception as e:
            print("Row import failed:", e)
            continue
            
    db.commit()
    return {"status": "success", "imported": imported}

@router.post("/process-recurring")
def process_recurring_transactions(db: Session = Depends(get_db)):
    # In a real app this would be a CRON job. Over here we will just create a trigger endpoint.
    return {"status": "recurring_processed"}
