import React from 'react';

const SMSInbox = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>SMS Inbox</h2>
      <p>SMS messages will appear here</p>
    </div>
  );
};

export default SMSInbox;

  // Mock data for now to ensure the component works
  useEffect(() => {
    setTimeout(() => {
      setMessages([
        {
          id: 1,
          sender: 'Mobile User 1',
          phone: '+250781234567',
          content: 'Test SMS message from mobile app',
          timestamp: new Date().toISOString(),
          riskScore: 25,
          status: 'new',
          type: 'Transaction'
        },
        {
          id: 2,
          sender: 'Mobile User 2', 
          phone: '+250789876543',
          content: 'Another test message for fraud detection',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          riskScore: 85,
          status: 'new',
          type: 'Phishing'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const minutes = Math.round((now - date) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  const getRiskColor = (score) => {
    if (score > 80) return '#e74c3c';
    if (score > 60) return '#f39c12';
    return '#27ae60';
  };

  const filteredMessages = messages.filter(message =>
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.phone.includes(searchTerm)
  );

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>SMS Inbox - Mobile App Messages</h2>
        <p style={{ color: '#7f8c8d' }}>Messages from FinSight mobile app users</p>
      </div>
      
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Search messages, phone numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', background: '#f8f9fa', borderRadius: '6px', minWidth: '100px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{filteredMessages.length}</span>
            <span style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>Total Messages</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', background: '#f8f9fa', borderRadius: '6px', minWidth: '100px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{filteredMessages.filter(m => m.riskScore > 80).length}</span>
            <span style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>High Risk</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', background: '#f8f9fa', borderRadius: '6px', minWidth: '100px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>{filteredMessages.filter(m => m.status === 'new').length}</span>
            <span style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '5px' }}>Unreviewed</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <p>Loading SMS messages...</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {filteredMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              <h3>No messages found</h3>
              <p>No SMS messages match your search criteria.</p>
            </div>
          ) : (
            <div style={{ padding: '0' }}>
              {filteredMessages.map((message, index) => (
                <div key={message.id} style={{
                  padding: '20px',
                  borderBottom: index < filteredMessages.length - 1 ? '1px solid #eee' : 'none',
                  transition: 'background-color 0.2s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong>{message.sender}</strong>
                      <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{message.phone}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#7f8c8d' }}>{getTimeAgo(message.timestamp)}</span>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: getRiskColor(message.riskScore) }}>
                        {message.riskScore}% risk
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ margin: '15px 0' }}>
                    <p style={{ margin: '0', color: '#2c3e50', lineHeight: '1.5' }}>{message.content}</p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        background: message.type === 'Transaction' ? '#d4edda' : '#f8d7da',
                        color: message.type === 'Transaction' ? '#155724' : '#721c24'
                      }}>
                        {message.type}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        background: '#cce5ff',
                        color: '#004085'
                      }}>
                        {message.status}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: '#007bff',
                        color: 'white'
                      }}>
                        Review
                      </button>
                      <button style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: '#6c757d',
                        color: 'white'
                      }}>
                        Mark Safe
                      </button>
                      <button style={{
                        padding: '6px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: '#dc3545',
                        color: 'white'
                      }}>
                        Block
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SMSInbox;
