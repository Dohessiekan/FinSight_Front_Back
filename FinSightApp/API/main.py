from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pickle
import pandas as pd
import re
import uvicorn
from datetime import datetime

app = FastAPI(title="FinSight Unified API - Spam & SMS Analysis")

# Enable CORS (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load artifacts at startup with error handling
try:
    import pickle
    import numpy as np
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    
    with open('../tokenizer.pkl', 'rb') as f:
        tokenizer = pickle.load(f)

    with open('../label_encoder.pkl', 'rb') as f:
        label_encoder = pickle.load(f)

    with open('../max_len.pkl', 'rb') as f:
        max_len = pickle.load(f)

    model = load_model('../spam_classifier.h5')
    print("✅ Spam detection model loaded successfully!")
except Exception as e:
    print(f"⚠️ Warning: Could not load spam detection model: {e}")
    print("📱 SMS financial summary will still work without spam detection.")
    tokenizer = None
    label_encoder = None
    max_len = None
    model = None

# Request & Response schemas
class TextIn(BaseModel):
    text: str

class PredictionOut(BaseModel):
    label: str
    confidence: float
    probabilities: dict

@app.post("/predict-spam", response_model=PredictionOut)
def predict_spam(payload: TextIn):
    # Check if model is loaded
    if not all([tokenizer, label_encoder, max_len, model]):
        return PredictionOut(
            label="unknown",
            confidence=0.0,
            probabilities={"ham": 0.5, "spam": 0.5}
        )
    
    try:
        import numpy as np
        
        # 1. Text → sequence → padded
        seq = tokenizer.texts_to_sequences([payload.text])
        pad = pad_sequences(seq, maxlen=max_len, padding='post')

        # 2. Model inference
        probs = model.predict(pad).flatten()

        # 3. Build probability dict
        if probs.shape[0] == 1:
            # Binary sigmoid
            prob_dict = {
                label_encoder.classes_[0]: float(1 - probs[0]),
                label_encoder.classes_[1]: float(probs[0])
            }
        else:
            # (rare) multiclass softmax
            prob_dict = {
                label: float(p)
                for label, p in zip(label_encoder.classes_, probs)
            }

        # 4. Pick top
        idx = int(np.argmax(list(prob_dict.values())))
        predicted_label = label_encoder.classes_[idx]
        confidence = list(prob_dict.values())[idx]

        return PredictionOut(
            label=predicted_label,
            confidence=confidence,
            probabilities=prob_dict
        )
    except Exception as e:
        return PredictionOut(
            label="error",
            confidence=0.0,
            probabilities={"error": 1.0}
        )



# =======================
# SMS Summary Section  
# =======================

# Additional imports for SMS processing

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
    sms_lower = sms.lower()
    amount = 0
    tx_type = 'other'
    date = None
    balance = None
    
    # Enhanced patterns for your specific message format
    # Pattern: "2000 RWF transferred to" or "transferred to ... 2000 RWF"
    transfer_patterns = [
        r'(\d+(?:,\d{3})*)\s*rwf\s+transferred\s+to',  # "2000 RWF transferred to"
        r'transferred\s+to.*?(\d+(?:,\d{3})*)\s*rwf',   # "transferred to ... 2000 RWF"
        r'(\d+(?:,\d{3})*)\s*rwf.*?transferred',        # "2000 RWF ... transferred"
    ]
    
    # Pattern: "received ... RWF from" or "RWF received from"
    received_patterns = [
        r'received.*?(\d+(?:,\d{3})*)\s*rwf',
        r'(\d+(?:,\d{3})*)\s*rwf.*?received',
        r'payment.*?(\d+(?:,\d{3})*)\s*rwf.*?from',
        r'credited.*?(\d+(?:,\d{3})*)\s*rwf',
    ]
    
    # Check for transferred/sent money
    for pattern in transfer_patterns:
        match = re.search(pattern, sms_lower)
        if match:
            tx_type = 'sent'
            amount = safe_float_from_match(match)
            break
    
    # Check for received money
    if tx_type == 'other':
        for pattern in received_patterns:
            match = re.search(pattern, sms_lower)
            if match:
                tx_type = 'received'
                amount = safe_float_from_match(match)
                break
    
    # Check for withdrawal
    if tx_type == 'other' and ('withdrawn' in sms_lower or 'withdraw' in sms_lower):
        withdraw_match = re.search(r'(\d+(?:,\d{3})*)\s*rwf', sms_lower)
        if withdraw_match:
            tx_type = 'withdrawn'
            amount = safe_float_from_match(withdraw_match)
    
    # Check for airtime purchase
    if tx_type == 'other' and ('airtime' in sms_lower or 'bundle' in sms_lower):
        airtime_match = re.search(r'(\d+(?:,\d{3})*)\s*rwf', sms_lower)
        if airtime_match:
            tx_type = 'airtime'
            amount = safe_float_from_match(airtime_match)
    
    # If still no type found, try to get first amount
    if tx_type == 'other':
        fallback_match = re.search(r'(\d+(?:,\d{3})*)\s*rwf', sms_lower)
        if fallback_match:
            amount = safe_float_from_match(fallback_match)
    
    # Enhanced date parsing for multiple formats
    date_patterns = [
        r'at\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})',  # "at 2025-07-05 17:12:24"
        r'on\s+(\d{4}-\d{2}-\d{2})',                        # "on 2025-07-05"
        r'on\s+(\d{1,2}\s+\w+\s+\d{4})',                   # "on 5 July 2025"
        r'(\d{4}-\d{2}-\d{2})',                             # "2025-07-05"
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, sms)
        if date_match:
            try:
                date_str = date_match.group(1)
                if ' ' in date_str and ':' in date_str:
                    # Format: "2025-07-05 17:12:24"
                    date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                elif len(date_str) == 10:
                    # Format: "2025-07-05"
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                else:
                    # Format: "5 July 2025"
                    date = datetime.strptime(date_str, '%d %B %Y')
                break
            except ValueError:
                continue
    
    # Enhanced balance extraction
    balance_patterns = [
        r'new\s+balance[:\s]*(\d+(?:,\d{3})*)\s*rwf',      # "New balance: 179524 RWF"
        r'balance[:\s]*(\d+(?:,\d{3})*)\s*rwf',            # "Balance: 179524 RWF"
        r'current\s+balance[:\s]*(\d+(?:,\d{3})*)\s*rwf',  # "Current balance: 179524 RWF"
    ]
    
    for pattern in balance_patterns:
        balance_match = re.search(pattern, sms_lower)
        if balance_match:
            balance = safe_float_from_match(balance_match)
            break

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
@app.post("/predict-sms")
def predict_sms(data: SMSInput):
    return summarize(data.messages)

# 🧪 Test endpoint for single SMS parsing
@app.post("/test-sms")
def test_sms_parsing(message: dict):
    """Test endpoint to see how a single SMS is parsed"""
    sms_text = message.get('text', '')
    parsed = parse_sms(sms_text)
    return {
        "original_message": sms_text,
        "parsed_result": parsed
    }

# 🔧 Optional: testing endpoint
@app.get("/")
def read_root():
    return {"message": "SMS Summary API is running"}

