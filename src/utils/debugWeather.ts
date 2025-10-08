// Debug script to check weather API configuration
export const debugWeatherConfig = () => {
  console.log('🔍 Weather API Debug Information:');
  console.log('🔍 VITE_OPENWEATHER_API_KEY:', import.meta.env.VITE_OPENWEATHER_API_KEY);
  console.log('🔍 API Key length:', import.meta.env.VITE_OPENWEATHER_API_KEY?.length);
  console.log('🔍 API Key starts with:', import.meta.env.VITE_OPENWEATHER_API_KEY?.substring(0, 8));
  console.log('🔍 Is API key configured:', !!(import.meta.env.VITE_OPENWEATHER_API_KEY && import.meta.env.VITE_OPENWEATHER_API_KEY !== 'your_openweathermap_api_key_here'));
  
  // Test direct API call
  const testApiCall = async () => {
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error('❌ No API key found');
      return;
    }
    
    const testUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=3.1390&lon=101.6869&appid=${apiKey}&units=metric`;
    console.log('🔍 Test API URL:', testUrl);
    
    try {
      const response = await fetch(testUrl);
      console.log('🔍 API Response Status:', response.status);
      console.log('🔍 API Response OK:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 API Response Data:', data);
        console.log('✅ OpenWeatherMap API is working!');
      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Network Error:', error);
    }
  };
  
  testApiCall();
};

// Call the debug function immediately
debugWeatherConfig();

