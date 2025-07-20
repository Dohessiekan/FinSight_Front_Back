/**
 * Quick Diagnostic Tool for Message Count Discrepancy
 * 
 * Copy and paste this into your browser console on the FinSight webapp
 * to quickly diagnose why mobile shows 176 messages but web shows 139
 */

window.diagnoseMessageCounts = async function(userId, mobileCount = 176) {
  console.log('🔍 Starting message count diagnostic...');
  
  try {
    // Import Firebase from the global scope
    const { db, collection, getDocs } = window;
    
    if (!db) {
      console.error('❌ Firebase not available. Make sure you are on the FinSight webapp page.');
      return;
    }
    
    if (!userId) {
      console.error('❌ Please provide a userId. Usage: diagnoseMessageCounts("user-id-here", 176)');
      return;
    }
    
    console.log(`📊 Analyzing messages for user: ${userId}`);
    console.log(`📱 Mobile reported: ${mobileCount} messages`);
    
    // Get all messages for the user
    const messagesRef = collection(db, 'users', userId, 'messages');
    const snapshot = await getDocs(messagesRef);
    
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const webStored = messages.length;
    const discrepancy = mobileCount - webStored;
    
    console.log(`🌐 Web stored: ${webStored} messages`);
    console.log(`📉 Discrepancy: ${discrepancy} messages`);
    
    // Analyze duplicates
    const duplicateMap = new Map();
    messages.forEach(msg => {
      const key = `${msg.text || 'NO_TEXT'}-${msg.sender || 'NO_SENDER'}`;
      if (duplicateMap.has(key)) {
        duplicateMap.get(key).push(msg);
      } else {
        duplicateMap.set(key, [msg]);
      }
    });
    
    const duplicateGroups = Array.from(duplicateMap.values()).filter(group => group.length > 1);
    const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + (group.length - 1), 0);
    
    console.log(`🔍 DUPLICATE ANALYSIS:`);
    console.log(`• Found ${duplicateGroups.length} duplicate groups`);
    console.log(`• Total duplicate messages: ${totalDuplicates}`);
    
    if (duplicateGroups.length > 0) {
      console.log(`📋 DUPLICATE GROUPS:`, duplicateGroups);
    }
    
    // Analyze content
    const noContent = messages.filter(msg => !msg.text && !msg.content && !msg.message && !msg.messageContent).length;
    const unprocessed = messages.filter(msg => msg.processed === false).length;
    
    console.log(`📝 CONTENT ANALYSIS:`);
    console.log(`• Messages with no content: ${noContent}`);
    console.log(`• Unprocessed messages: ${unprocessed}`);
    
    // Status breakdown
    const statusCounts = {
      safe: messages.filter(m => m.status === 'safe').length,
      suspicious: messages.filter(m => m.status === 'suspicious').length,
      fraud: messages.filter(m => m.status === 'fraud').length,
      unknown: messages.filter(m => m.status === 'unknown').length
    };
    
    console.log(`📊 STATUS BREAKDOWN:`, statusCounts);
    
    // Potential causes
    console.log(`\n🔍 POTENTIAL CAUSES OF DISCREPANCY:`);
    
    if (totalDuplicates > 0) {
      console.log(`• DUPLICATES: Mobile may be counting ${totalDuplicates} duplicate messages multiple times`);
    }
    
    if (discrepancy > totalDuplicates) {
      const unexplained = discrepancy - totalDuplicates;
      console.log(`• MISSING MESSAGES: ${unexplained} messages may have failed to save to Firebase`);
    }
    
    if (noContent > 0) {
      console.log(`• EMPTY CONTENT: ${noContent} messages have no content, may indicate save failures`);
    }
    
    console.log(`• MOBILE REANALYSIS: Mobile may be reanalyzing existing messages instead of only new ones`);
    
    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log(`1. Implement incremental scanning (only analyze NEW messages)`);
    console.log(`2. Improve duplicate detection on mobile app`);
    console.log(`3. Add proper analysis tracking to prevent reprocessing`);
    console.log(`4. Check mobile app logs for save failures`);
    
    // Summary object
    const summary = {
      mobileReported: mobileCount,
      webStored: webStored,
      discrepancy: discrepancy,
      duplicates: totalDuplicates,
      duplicateGroups: duplicateGroups.length,
      noContent: noContent,
      unprocessed: unprocessed,
      statusCounts: statusCounts
    };
    
    console.log(`\n📋 SUMMARY:`, summary);
    
    return summary;
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    return { error: error.message };
  }
};

// Instructions
console.log(`
📋 MESSAGE COUNT DIAGNOSTIC TOOL LOADED

To use this tool:
1. Find the user ID from the admin panel
2. Run: diagnoseMessageCounts("USER_ID_HERE", 176)

Example:
diagnoseMessageCounts("abc123def456", 176)

This will analyze why mobile shows 176 messages but web shows fewer.
`);

// Auto-detect if we're in FinSight webapp
if (window.location.href.includes('localhost') || window.location.href.includes('finsight')) {
  console.log('✅ FinSight webapp detected. Diagnostic tool ready to use.');
} else {
  console.log('⚠️ Please navigate to your FinSight webapp first, then reload this script.');
}
