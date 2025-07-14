#!/usr/bin/env python3
"""
Test script for the predict-sms endpoint
Run this to verify the API is working correctly
"""

import requests
import json

# Test messages - diverse Rwandan mobile money and banking SMS
test_messages = [
    "You have received RWF 50,000 from John Doe (0788123456). Your new balance is RWF 125,000. Transaction ID: MW123456789",
    "You have sent RWF 25,000 to Jane Smith (0788654321). Your new balance is RWF 100,000. Transaction ID: MW987654321", 
    "You have withdrawn RWF 30,000 from ATM KIGALI_CITY_TOWER. Your new balance is RWF 70,000. Transaction ID: AT456789123",
    "You have bought airtime worth RWF 5,000. Your new balance is RWF 65,000. Transaction ID: AI789123456",
    "You have received your salary of RWF 120,000 from ABC COMPANY LTD. Your new balance is RWF 185,000. Transaction ID: SA147258369",
    # More diverse examples
    "Payment of RWF 15,000 to MTN has been processed successfully. Your balance is now RWF 170,000.",
    "RWF 75,000 has been credited to your account from COOPERATIVE PAYMENT. Current balance: RWF 245,000",
    "Transfer of RWF 35,000 to account 1234567890 completed. Remaining balance is RWF 210,000 RWF",
    "Your account has been debited with RWF 12,000 for service charges. New balance: RWF 198,000",
    "Deposit of RWF 200,000 from EMPLOYER SALARY processed. Your account balance is RWF 398,000 RWF",
    "Cash withdrawal of RWF 40,000 at BK ATM successful. Balance: 358,000 RWF",
    "You paid RWF 8,500 for airtime bundle. Your current balance is RWF 349,500",
    "Money transfer: RWF 60,000 sent to FAMILY MEMBER. Balance is now 289,500 RWF",
    "Loan payment of RWF 25,000 deducted from your account. New balance: 264,500 RWF"
]

def test_predict_sms_endpoint():
    """Test the predict-sms endpoint with sample messages"""
    
    # API endpoint
    url = "http://localhost:8000/predict-sms"
    
    # Request payload
    payload = {
        "messages": test_messages
    }
    
    try:
        print("🧪 Testing predict-sms endpoint...")
        print(f"📡 Sending {len(test_messages)} test messages to {url}")
        print()
        
        # Send request
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success! API Response:")
            print("=" * 50)
            print(json.dumps(result, indent=2))
            print("=" * 50)
            
            # Validate expected fields
            expected_fields = ['total_sent', 'total_received', 'total_withdrawn', 'total_airtime', 'transactions_count', 'latest_balance']
            missing_fields = [field for field in expected_fields if field not in result]
            
            if missing_fields:
                print(f"⚠️  Warning: Missing expected fields: {missing_fields}")
            else:
                print("✅ All expected fields present in response")
                
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Could not connect to API server")
        print("💡 Make sure to start the API server first:")
        print("   cd FinSightApp/API")
        print("   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
        
    except requests.exceptions.Timeout:
        print("❌ Timeout Error: API took too long to respond")
        
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        print("\n🏥 Testing health endpoint...")
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"Response: {response.json()}")
        else:
            print(f"❌ Health check failed: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")

if __name__ == "__main__":
    print("🚀 FinSight SMS Analysis API Tester")
    print("=" * 50)
    
    # Test health endpoint first
    test_health_endpoint()
    
    # Test main predict-sms endpoint
    test_predict_sms_endpoint()
    
    print("\n📋 Test completed!")
