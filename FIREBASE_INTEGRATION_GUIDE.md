## 🔥 Firebase Collections Structure for Mobile App Integration

### **Collection: `users/{userId}/messages`**
```json
{
  "messageText": "Congratulations! You've won $1000. Click here to claim.",
  "phoneNumber": "+1234567890",
  "analysis": {
    "isFraud": true,
    "confidence": 0.95,
    "category": "prize_scam",
    "riskLevel": "high"
  },
  "timestamp": "2025-07-18T10:30:00Z",
  "processed": true,
  "userId": "user123",
  "source": "mobile_app"
}
```

### **Collection: `fraudAlerts`**
```json
{
  "type": "Prize Scam Detected",
  "severity": "high",
  "phone": "+1234567890", 
  "message": "Congratulations! You've won $1000...",
  "confidence": 95,
  "status": "active",
  "userId": "user123",
  "timestamp": "2025-07-18T10:30:00Z"
}
```

### **Collection: `dashboard/stats`**
```json
{
  "totalUsers": 150,
  "smsAnalyzedToday": 47,
  "fraudsPrevented": 12,
  "lastUpdated": "2025-07-18T10:30:00Z"
}
```

### **Collection: `users`**
```json
{
  "userId": "user123",
  "email": "user@example.com",
  "createdAt": "2025-07-15T09:00:00Z",
  "lastActive": "2025-07-18T10:30:00Z",
  "messagesAnalyzed": 25,
  "fraudsDetected": 3
}
```
