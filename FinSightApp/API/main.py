# filename: sms_summary_api.py
import re
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS for all origins (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧾 1. Input Schema
class SMSInput(BaseModel):
    messages: List[str]

def safe_float_from_match(match):
    if match and match.group(1):
        s = match.group(1).replace(',', '').strip()
        if s:
            try:
                return float(s)
            except ValueError:
                return 0
    return 0

# 🧠 2. Function to extract structured info from SMS
def parse_sms(sms):
    sms = sms.lower()
    # Improved amount extraction based on context
    amount = 0
    # For sent/payment messages
    sent_amount_match = re.search(r'(?:payment of|paid|payment to|you paid|transferred to|debited|purchase at|purchase to)\D*?([\d,]+)\s*rwf', sms)
    # For received/credited messages
    received_amount_match = re.search(r'(?:received|received from|payment from|transferred from|credited|deposit|you received|credited to)\D*?([\d,]+)\s*rwf', sms)
    # Fallback: first RWF amount
    fallback_amount_match = re.search(r'rwf\s?([\d,]+)', sms)

    sent_keywords = [
        'sent', 'payment of', 'paid to', 'you paid', 'payment to', 'transferred to', 'debited', 'purchase at', 'purchase to'
    ]
    received_keywords = [
        'received', 'received from', 'payment from', 'transferred from', 'credited', 'deposit', 'you received', 'credited to'
    ]
    if any(k in sms for k in sent_keywords):
        tx_type = 'sent'
        if sent_amount_match:
            amount = safe_float_from_match(sent_amount_match)
        elif fallback_amount_match:
            amount = safe_float_from_match(fallback_amount_match)
    elif any(k in sms for k in received_keywords):
        tx_type = 'received'
        if received_amount_match:
            amount = safe_float_from_match(received_amount_match)
        elif fallback_amount_match:
            amount = safe_float_from_match(fallback_amount_match)
    elif 'withdrawn' in sms:
        tx_type = 'withdrawn'
        if fallback_amount_match:
            amount = safe_float_from_match(fallback_amount_match)
    elif 'bought airtime' in sms or 'buy airtime' in sms:
        tx_type = 'airtime'
        if fallback_amount_match:
            amount = safe_float_from_match(fallback_amount_match)
    else:
        tx_type = 'other'
        if fallback_amount_match:
            amount = safe_float_from_match(fallback_amount_match)

    date_match = re.search(r'on\s(\d{1,2}\s\w+\s\d{4})', sms)
    date = datetime.strptime(date_match.group(1), '%d %B %Y') if date_match else None

    # Improved balance regex: matches 'balance: <number> rwf' or 'balance is <number> rwf'
    balance_match = re.search(r'balance[:\s\w]*?([\d,]+)\s*rwf', sms)
    balance = safe_float_from_match(balance_match) if balance_match else None

    return {
        "type": tx_type,
        "amount": amount,
        "date": date.strftime('%Y-%m-%d') if date else None,  # Ensure JSON serializable
        "balance": balance
    }

# 📊 3. Function to summarize transactions
def summarize(sms_list):
    records = [parse_sms(s) for s in sms_list]
    df = pd.DataFrame(records)

    # Convert 'date' column to datetime, coerce errors, handle None
    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
    else:
        df['date'] = pd.NaT

    summary = {
        "total_sent": float(df[df['type'] == 'sent']['amount'].sum()),
        "total_received": float(df[df['type'] == 'received']['amount'].sum()),
        "total_withdrawn": float(df[df['type'] == 'withdrawn']['amount'].sum()),
        "total_airtime": float(df[df['type'] == 'airtime']['amount'].sum()),
        "latest_balance": float(df['balance'].dropna().iloc[-1]) if not df['balance'].dropna().empty else None,
        "transactions_count": len(df),
        "monthly_summary": df.groupby(df['date'].dt.strftime('%B %Y'))['amount'].sum().to_dict() if not df['date'].isnull().all() else {}
    }

    return summary

# 🚀 4. API Endpoint
@app.post("/predict")
def predict(data: SMSInput):
    return summarize(data.messages)

# 🔧 Optional: testing endpoint
@app.get("/")
def read_root():
    return {"message": "SMS Summary API is running"}

# 🔁 5. Run API
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
