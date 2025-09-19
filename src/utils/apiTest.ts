// API Testing Utilities
import { UserService } from '../services/userService';

export const testApiConnection = async () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
  
  console.log('🔧 Testing API connection...');
  console.log('API Base URL:', API_BASE_URL);
  
  try {
    // Test health endpoint (at server root)
    console.log('Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/health');
    console.log('Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint works:', healthData);
    } else {
      console.log('⚠️ Health endpoint error:', healthResponse.status);
    }

    // Test users endpoint (GET)
    console.log('Testing users GET endpoint...');
    const usersResponse = await fetch('http://localhost:3000/api/v1/users');
    console.log('Users GET status:', usersResponse.status);
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('✅ Users GET works:', usersData);
    } else {
      console.log('⚠️ Users GET error:', usersResponse.status);
    }
    
  } catch (error) {
    console.error('❌ API connection failed:', error);
  }
};

export const testUserCreation = async () => {
  console.log('🔧 Testing user creation...');
  
  // Test with direct fetch first
  const testUserData = {
    id: 'test-user-' + Date.now(),
    email: 'test-fetch@example.com',
    name: 'Test Fetch User',
  };

  try {
    console.log('Testing direct fetch POST...');
    const fetchResponse = await fetch('http://localhost:3000/api/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUserData),
    });

    console.log('Direct fetch status:', fetchResponse.status);
    
    if (fetchResponse.ok) {
      const fetchData = await fetchResponse.json();
      console.log('✅ Direct fetch POST works:', fetchData);
    } else {
      const errorData = await fetchResponse.text();
      console.log('⚠️ Direct fetch POST error:', fetchResponse.status, errorData);
    }

    // Now test with UserService
    console.log('Testing UserService...');
    const mockUser = {
      id: 'test-service-' + Date.now(),
      email: 'test-service@example.com',
      user_metadata: {
        full_name: 'Test Service User',
        avatar_url: 'https://via.placeholder.com/150',
      },
      app_metadata: {
        provider: 'google',
      },
    };
    
    const result = await UserService.createOrUpdateUser(mockUser as any);
    console.log('✅ UserService test successful:', result);
    return result;
  } catch (error) {
    console.error('❌ User creation test failed:', error);
    throw error;
  }
};

// Add to window for browser console testing
if (typeof window !== 'undefined') {
  (window as any).apiTest = {
    testConnection: testApiConnection,
    testUserCreation: testUserCreation,
  };
  
  console.log('🔧 API testing utilities added to window.apiTest');
  console.log('Usage: window.apiTest.testConnection() or window.apiTest.testUserCreation()');
}
