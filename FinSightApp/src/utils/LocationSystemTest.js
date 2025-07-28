/**
 * Location System Test Script
 * 
 * Quick test to verify all location components are working
 */

import LocationVerificationManager from '../src/utils/LocationVerificationManager';
import LocationPermissionManager from '../src/utils/LocationPermissionManager';
import UserLocationManager from '../src/utils/UserLocationManager';

export const testLocationSystem = async () => {
  console.log('🧪 Testing Location System Components...');
  
  try {
    // Test 1: Check LocationPermissionManager
    console.log('\n1️⃣ Testing LocationPermissionManager...');
    const permissionCheck = await LocationPermissionManager.checkLocationPermission();
    console.log('Permission Status:', permissionCheck);
    
    // Test 2: Test Region Approximation
    console.log('\n2️⃣ Testing Region Approximation...');
    const kigaliLocation = UserLocationManager.getRwandaRegionCoordinates('kigali');
    console.log('Kigali Coordinates:', kigaliLocation);
    
    // Test 3: Test LocationVerificationManager
    console.log('\n3️⃣ Testing LocationVerificationManager...');
    const isFirstTime = await LocationVerificationManager.isFirstTimeUser('test-user-123');
    console.log('Is First Time User:', isFirstTime);
    
    // Test 4: Test Location Status
    console.log('\n4️⃣ Testing Current Location Status...');
    const locationStatus = await LocationVerificationManager.getCurrentLocationStatus();
    console.log('Location Status:', locationStatus);
    
    console.log('\n✅ Location System Test Complete!');
    
    return {
      success: true,
      results: {
        permissionCheck,
        regionApproximation: kigaliLocation,
        isFirstTime,
        locationStatus
      }
    };
    
  } catch (error) {
    console.error('❌ Location System Test Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Quick component verification
export const verifyLocationComponents = () => {
  console.log('🔍 Verifying Location Components...');
  
  const components = {
    LocationVerificationManager: !!LocationVerificationManager,
    LocationPermissionManager: !!LocationPermissionManager,
    UserLocationManager: !!UserLocationManager,
    verifyUserLocation: !!LocationVerificationManager.verifyUserLocation,
    requestLocationPermission: !!LocationPermissionManager.requestLocationPermission,
    updateUserLocation: !!UserLocationManager.updateUserLocation
  };
  
  console.log('Component Status:', components);
  
  const allPresent = Object.values(components).every(status => status === true);
  
  if (allPresent) {
    console.log('✅ All location components verified successfully!');
  } else {
    console.log('❌ Some location components are missing!');
  }
  
  return { allPresent, components };
};

export default { testLocationSystem, verifyLocationComponents };
