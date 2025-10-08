import React, { useState, useEffect } from 'react';
import { weatherService } from '../services/weatherService';

const WeatherTest: React.FC = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testWeatherAPI = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      // Test with Kuala Lumpur coordinates
      const testLocation = {
        lat: 3.1390,
        lng: 101.6869,
        name: 'Kuala Lumpur',
        address: 'Kuala Lumpur, Malaysia'
      };

      // Test with today's date (should trigger real API call)
      const today = new Date().toISOString();
      
      console.log('🧪 Testing weather API...');
      console.log('🧪 Location:', testLocation);
      console.log('🧪 Date:', today);
      console.log('🧪 API Key:', import.meta.env.VITE_OPENWEATHER_API_KEY);

      // Clear cache to force fresh API call
      weatherService.clearCache();

      const startTime = Date.now();
      const weatherData = await weatherService.getWeatherData(testLocation, today);
      const endTime = Date.now();

      setTestResult({
        success: true,
        data: weatherData,
        responseTime: endTime - startTime,
        cacheSize: weatherService.getCacheSize()
      });

      console.log('✅ Weather API test successful:', weatherData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Weather API test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const testFutureDate = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const testLocation = {
        lat: 3.1390,
        lng: 101.6869,
        name: 'Kuala Lumpur',
        address: 'Kuala Lumpur, Malaysia'
      };

      // Test with date 10 days in the future (should use mock data)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const weatherData = await weatherService.getWeatherData(testLocation, futureDate.toISOString());
      
      setTestResult({
        success: true,
        data: weatherData,
        isMockData: true,
        cacheSize: weatherService.getCacheSize()
      });

      console.log('✅ Future date test successful (mock data):', weatherData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Future date test failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    weatherService.clearCache();
    setTestResult(null);
    setError(null);
    console.log('🧹 Weather cache cleared');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Weather API Test</h1>
          
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={testWeatherAPI}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Today (Real API)'}
              </button>
              
              <button
                onClick={testFutureDate}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Future (Mock Data)'}
              </button>
              
              <button
                onClick={clearCache}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Clear Cache
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-md">
              <h3 className="font-semibold text-gray-900 mb-2">API Configuration:</h3>
              <div className="text-sm text-gray-700">
                <p><strong>API Key:</strong> {import.meta.env.VITE_OPENWEATHER_API_KEY ? '✅ Configured' : '❌ Not configured'}</p>
                <p><strong>Key Length:</strong> {import.meta.env.VITE_OPENWEATHER_API_KEY?.length || 0} characters</p>
                <p><strong>Cache Size:</strong> {weatherService.getCacheSize()} entries</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {error}
              </div>
            )}

            {testResult && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <h3 className="font-semibold mb-2">Test Result:</h3>
                <div className="text-sm">
                  <p><strong>Success:</strong> {testResult.success ? '✅' : '❌'}</p>
                  {testResult.responseTime && <p><strong>Response Time:</strong> {testResult.responseTime}ms</p>}
                  {testResult.isMockData && <p><strong>Data Type:</strong> Mock Data (Future Date)</p>}
                  {!testResult.isMockData && <p><strong>Data Type:</strong> Real API Data</p>}
                  <p><strong>Cache Size:</strong> {testResult.cacheSize} entries</p>
                </div>
                
                {testResult.data && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Weather Data:</h4>
                    <div className="bg-white p-3 rounded border text-xs overflow-auto max-h-40">
                      <pre>{JSON.stringify(testResult.data, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherTest;

