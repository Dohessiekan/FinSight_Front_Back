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
    import tensorflow as tf
    from keras.models import load_model
    from keras.preprocessing.sequence import pad_sequences
    
    # Set memory growth for GPU if available
    gpus = tf.config.experimental.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        except RuntimeError as e:
            print(f"GPU setup warning: {e}")
    
    with open('model/tokenizer.pkl', 'rb') as f:
        tokenizer = pickle.load(f)

    with open('model/label_encoder.pkl', 'rb') as f:
        label_encoder = pickle.load(f)

    with open('model/max_len.pkl', 'rb') as f:
        max_len = pickle.load(f)

    try:
        model = load_model('model/model_sentiment.keras', compile=False)
        print("✅ Spam detection model loaded successfully!")
        print(f"📊 Model input shape: {model.input_shape}")
        print(f"📊 Model output shape: {model.output_shape}")
    except Exception as e:
        print(f"⚠️ Warning: Could not load spam detection model: {e}")
        print("📱 SMS financial summary will still work without spam detection.")
        tokenizer = None
        label_encoder = None
        max_len = None
        model = None
except Exception as e:
    print(f"⚠️ Warning: Could not load spam detection model: {e}")
    print("📱 SMS financial summary will still work without spam detection.")
    tokenizer = None
    label_encoder = None
    max_len = None
    model = None

# Request & Response schemas
from typing import Union, Optional
from pydantic import BaseModel, validator

class FlexibleTextIn(BaseModel):
    # Support both single text and multiple messages (now allow both)
    text: Optional[str] = None
    messages: Optional[List[str]] = None
    
    @validator('messages', pre=True, always=True)
    def check_text_or_messages(cls, v, values):
        text = values.get('text')
        if not text and not v:
            raise ValueError('Either text or messages must be provided')
        # Now allow both fields
        return v

class PredictionOut(BaseModel):
    label: str
    confidence: float
    probabilities: dict

class BatchPredictionOut(BaseModel):
    results: List[PredictionOut]

@app.post("/predict-spam")
def predict_spam(payload: FlexibleTextIn):
    # Determine if this is a single message or batch
    # Accept both text and messages, merge if both are provided
    messages_to_process = []
    if payload.text is not None:
        messages_to_process.append(payload.text)
    if payload.messages is not None:
        messages_to_process.extend(payload.messages)
    return_single = len(messages_to_process) == 1

    results = []

    for message in messages_to_process:
        # Check if model is loaded
        if not all([tokenizer, label_encoder, max_len, model]):
            results.append(PredictionOut(
                label="unknown",
                confidence=0.0,
                probabilities={"ham": 0.5, "spam": 0.5}
            ))
            continue
        
        try:
            import numpy as np
            
            # 1. Text → sequence → padded
            seq = tokenizer.texts_to_sequences([message])
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

            results.append(PredictionOut(
                label=predicted_label,
                confidence=confidence,
                probabilities=prob_dict
            ))
        except Exception as e:
            results.append(PredictionOut(
                label="error",
                confidence=0.0,
                probabilities={"error": 1.0}
            ))
    
    # Return single result or batch results based on input
    if return_single:
        return results[0] if results else PredictionOut(
            label="error",
            confidence=0.0,
            probabilities={"error": 1.0}
        )
    else:
        return BatchPredictionOut(results=results)



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
    
    # More comprehensive transaction detection patterns
    
    # SENT/TRANSFER patterns (money going out)
    sent_keywords = ['sent', 'transferred', 'paid', 'payment to', 'transfer to', 'sent to', 'paid to']
    sent_patterns = [
        r'(\d+(?:,\d{3})*)\s*rwf\s+(?:sent|transferred|paid)\s+to',
        r'(?:sent|transferred|paid).*?(\d+(?:,\d{3})*)\s*rwf',
        r'payment\s+of\s+(\d+(?:,\d{3})*)\s*rwf\s+to',
        r'transfer\s+of\s+(\d+(?:,\d{3})*)\s*rwf',
        r'you\s+have\s+sent\s+(\d+(?:,\d{3})*)\s*rwf',
    ]
    
    # RECEIVED patterns (money coming in) - Enhanced with more deposit patterns
    received_keywords = ['received', 'credited', 'deposit', 'salary', 'refund', 'deposited', 'income', 'earning']
    received_patterns = [
        r'received.*?(\d+(?:,\d{3})*)\s*rwf',
        r'(\d+(?:,\d{3})*)\s*rwf.*?received',
        r'credited.*?(\d+(?:,\d{3})*)\s*rwf',
        r'deposit.*?(\d+(?:,\d{3})*)\s*rwf',
        r'deposited.*?(\d+(?:,\d{3})*)\s*rwf',
        r'(\d+(?:,\d{3})*)\s*rwf.*?deposited',
        r'(\d+(?:,\d{3})*)\s*rwf.*?deposit',
        r'you\s+have\s+received\s+(\d+(?:,\d{3})*)\s*rwf',
        r'payment.*?(\d+(?:,\d{3})*)\s*rwf.*?from',
        r'income.*?(\d+(?:,\d{3})*)\s*rwf',
        r'earning.*?(\d+(?:,\d{3})*)\s*rwf',
    ]
    
    # WITHDRAWAL patterns
    withdraw_patterns = [
        r'withdrawn.*?(\d+(?:,\d{3})*)\s*rwf',
        r'(\d+(?:,\d{3})*)\s*rwf.*?withdrawn',
        r'withdraw.*?(\d+(?:,\d{3})*)\s*rwf',
        r'cash.*?(\d+(?:,\d{3})*)\s*rwf',
        r'atm.*?(\d+(?:,\d{3})*)\s*rwf',
    ]
    
    # AIRTIME/BUNDLE patterns
    airtime_patterns = [
        r'airtime.*?(\d+(?:,\d{3})*)\s*rwf',
        r'bundle.*?(\d+(?:,\d{3})*)\s*rwf',
        r'(\d+(?:,\d{3})*)\s*rwf.*?airtime',
        r'(\d+(?:,\d{3})*)\s*rwf.*?bundle',
        r'bought.*?(\d+(?:,\d{3})*)\s*rwf.*?(?:airtime|bundle)',
    ]
    
    # Check for SENT transactions first
    if any(keyword in sms_lower for keyword in sent_keywords):
        for pattern in sent_patterns:
            match = re.search(pattern, sms_lower)
            if match:
                tx_type = 'sent'
                amount = safe_float_from_match(match)
                break
    
    # Check for RECEIVED transactions
    if tx_type == 'other' and any(keyword in sms_lower for keyword in received_keywords):
        for pattern in received_patterns:
            match = re.search(pattern, sms_lower)
            if match:
                tx_type = 'received'
                amount = safe_float_from_match(match)
                break
    
    # Check for WITHDRAWAL
    if tx_type == 'other' and ('withdraw' in sms_lower or 'atm' in sms_lower or 'cash' in sms_lower):
        for pattern in withdraw_patterns:
            match = re.search(pattern, sms_lower)
            if match:
                tx_type = 'withdrawn'
                amount = safe_float_from_match(match)
                break
    
    # Check for AIRTIME purchase
    if tx_type == 'other' and ('airtime' in sms_lower or 'bundle' in sms_lower):
        for pattern in airtime_patterns:
            match = re.search(pattern, sms_lower)
            if match:
                tx_type = 'airtime'
                amount = safe_float_from_match(match)
                break
    
    # If still no specific type found but contains transaction indicators, try to get amount
    transaction_indicators = ['rwf', 'transaction', 'payment', 'balance', 'account']
    if tx_type == 'other' and any(indicator in sms_lower for indicator in transaction_indicators):
        # Try to extract any RWF amount
        general_amount_match = re.search(r'(\d+(?:,\d{3})*)\s*rwf', sms_lower)
        if general_amount_match:
            amount = safe_float_from_match(general_amount_match)
            # Try to infer transaction type from context
            if any(word in sms_lower for word in ['to', 'paid', 'sent']):
                tx_type = 'sent'
            elif any(word in sms_lower for word in ['from', 'received', 'credited', 'deposit', 'deposited', 'income', 'earning']):
                tx_type = 'received'
            else:
                tx_type = 'transaction'  # Generic transaction type
    
    # Enhanced date parsing for multiple formats
    date_patterns = [
        r'at\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})',  # "at 2025-07-05 17:12:24"
        r'on\s+(\d{4}-\d{2}-\d{2})',                        # "on 2025-07-05"
        r'on\s+(\d{1,2}\s+\w+\s+\d{4})',                   # "on 5 July 2025"
        r'(\d{4}-\d{2}-\d{2})',                             # "2025-07-05"
        r'(\d{1,2}/\d{1,2}/\d{4})',                         # "05/07/2025"
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, sms)
        if date_match:
            try:
                date_str = date_match.group(1)
                if ' ' in date_str and ':' in date_str:
                    # Format: "2025-07-05 17:12:24"
                    date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                elif len(date_str) == 10 and '-' in date_str:
                    # Format: "2025-07-05"
                    date = datetime.strptime(date_str, '%Y-%m-%d')
                elif '/' in date_str:
                    # Format: "05/07/2025"
                    date = datetime.strptime(date_str, '%d/%m/%Y')
                else:
                    # Format: "5 July 2025"
                    date = datetime.strptime(date_str, '%d %B %Y')
                break
            except ValueError:
                continue
    
    # Enhanced balance extraction - try multiple patterns
    balance_patterns = [
        r'new\s+balance[:\s]*(\d+(?:,\d{3})*)\s*rwf',       # "New balance: 179524 RWF"
        r'balance[:\s]*(\d+(?:,\d{3})*)\s*rwf',             # "Balance: 179524 RWF"
        r'current\s+balance[:\s]*(\d+(?:,\d{3})*)\s*rwf',   # "Current balance: 179524 RWF"
        r'your\s+balance\s+is\s+(\d+(?:,\d{3})*)\s*rwf',    # "Your balance is 179524 RWF"
        r'balance\s+is\s+now\s+(\d+(?:,\d{3})*)\s*rwf',     # "Balance is now 179524 RWF"
        r'remaining\s+balance[:\s]*(\d+(?:,\d{3})*)\s*rwf', # "Remaining balance: 179524 RWF"
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

    # Filter out records with 0 amount or 'other' type to get actual transactions
    transaction_df = df[(df['amount'] > 0) & (df['type'] != 'other')]
    
    # Get latest balance from the most recent transaction (by date, then by position)
    latest_balance = None
    if not df['balance'].dropna().empty:
        # Sort by date (most recent first), then by original index
        df_with_balance = df[df['balance'].notna()].copy()
        if not df_with_balance['date'].isnull().all():
            df_with_balance = df_with_balance.sort_values(['date'], ascending=False, na_position='last')
        latest_balance = float(df_with_balance['balance'].iloc[0])

    # Count all messages that have any transaction-related content (not just those with amounts)
    transaction_count = len(df)  # Count all processed messages as potential transactions
    
    # Count only messages with actual amounts for financial totals
    amount_transaction_count = len(transaction_df)

    # Calculate monthly breakdown for sent + payment (airtime) only
    sent_and_payment_df = transaction_df[transaction_df['type'].isin(['sent', 'airtime'])]
    monthly_sent_payment = {}
    if not sent_and_payment_df.empty and not sent_and_payment_df['date'].isnull().all():
        monthly_sent_payment = sent_and_payment_df.groupby(sent_and_payment_df['date'].dt.strftime('%B %Y'))['amount'].sum().to_dict()

    summary = {
        "total_sent": float(transaction_df[transaction_df['type'] == 'sent']['amount'].sum()),
        "total_received": float(transaction_df[transaction_df['type'] == 'received']['amount'].sum()),
        "total_withdrawn": float(transaction_df[transaction_df['type'] == 'withdrawn']['amount'].sum()),
        "total_airtime": float(transaction_df[transaction_df['type'] == 'airtime']['amount'].sum()),
        "latest_balance": latest_balance,
        "transactions_count": transaction_count,  # All messages processed
        "amount_transactions_count": amount_transaction_count,  # Only messages with amounts
        "monthly_summary": monthly_sent_payment  # Only sent + payment amounts
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

# 🧪 Debug endpoint for SMS parsing analysis
@app.post("/debug-sms-analysis")
def debug_sms_analysis(data: SMSInput):
    """Debug endpoint to analyze how SMS messages are being categorized"""
    sms_list = data.messages
    analysis_results = []
    
    for i, sms in enumerate(sms_list):
        parsed = parse_sms(sms)
        analysis_results.append({
            "message_number": i + 1,
            "original_sms": sms[:100] + "..." if len(sms) > 100 else sms,  # Truncate for readability
            "parsed_type": parsed['type'],
            "parsed_amount": parsed['amount'],
            "parsed_date": parsed['date'],
            "parsed_balance": parsed['balance']
        })
    
    # Generate summary with detailed breakdown
    summary = summarize(sms_list)
    
    # Count transactions by type
    type_counts = {}
    for result in analysis_results:
        tx_type = result['parsed_type']
        if tx_type not in type_counts:
            type_counts[tx_type] = {'count': 0, 'total_amount': 0}
        type_counts[tx_type]['count'] += 1
        if result['parsed_amount'] > 0:
            type_counts[tx_type]['total_amount'] += result['parsed_amount']
    
    return {
        "total_messages": len(sms_list),
        "summary": summary,
        "type_breakdown": type_counts,
        "detailed_analysis": analysis_results,
        "potential_issues": {
            "messages_without_amounts": len([r for r in analysis_results if r['parsed_amount'] == 0]),
            "messages_categorized_as_other": len([r for r in analysis_results if r['parsed_type'] == 'other']),
            "sent_vs_received_ratio": (summary.get('total_sent', 0) / max(summary.get('total_received', 1), 1))
        }
    }

# 🔧 Optional: testing endpoint
@app.get("/")
def read_root():
    return {"message": "SMS Summary API is running"}

