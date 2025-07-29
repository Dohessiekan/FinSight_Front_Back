/**
 * GPS Testing Component
 * 
 * Quick access component for testing ultra-high precision GPS
 * Add this to any screen for easy GPS testing during development
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import UltraHighPrecisionGPSTest from '../tests/UltraHighPrecisionGPSTest';

const GPSTestingComponent = () => {
  
  const handleQuickTest = async () => {
    console.log('🚀 Starting quick GPS test...');
    await UltraHighPrecisionGPSTest.quickTest();
  };
  
  const handleFullTest = async () => {
    console.log('🧪 Starting full GPS test suite...');
    await UltraHighPrecisionGPSTest.runFullTest();
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GPS Testing</Text>
      
      <TouchableOpacity style={styles.quickButton} onPress={handleQuickTest}>
        <Text style={styles.buttonText}>🚀 Quick GPS Test</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.fullButton} onPress={handleFullTest}>
        <Text style={styles.buttonText}>🧪 Full Test Suite</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  quickButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  fullButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default GPSTestingComponent;
