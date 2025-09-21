// Simple test utility to verify weather service functionality
import { weatherService, type VenueLocation } from '../services/weatherService';

// Test venue location (Kuala Lumpur)
const testVenue: VenueLocation = {
  lat: 3.1390,
  lng: 101.6869,
  name: 'Kuala Lumpur Convention Centre',
  address: 'Kuala Lumpur City Centre, 50450 Kuala Lumpur, Malaysia'
};

// Test different event dates
const testDates = [
  new Date().toISOString(), // Today
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month from now
];

export async function testWeatherService() {
  console.log('🧪 Testing Weather Service with different event dates...\n');
  
  for (let i = 0; i < testDates.length; i++) {
    const eventDate = testDates[i];
    const eventDateTime = new Date(eventDate);
    const daysFromNow = Math.ceil((eventDateTime.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Test ${i + 1}: Event on ${eventDateTime.toLocaleDateString()} (${daysFromNow} days from now)`);
    console.log(`🕐 Event time: ${eventDateTime.toLocaleTimeString()}`);
    
    try {
      const weatherData = await weatherService.getWeatherData(testVenue, eventDate);
      
      console.log(`📍 Location: ${weatherData.location}`);
      console.log(`🌡️ Temperature: ${weatherData.current.temperature}°C`);
      console.log(`☁️ Condition: ${weatherData.current.condition}`);
      console.log(`💨 Wind: ${weatherData.current.windSpeed} km/h`);
      console.log(`💧 Humidity: ${weatherData.current.humidity}%`);
      
      console.log('📊 Forecast:');
      weatherData.forecast.forEach(day => {
        console.log(`  ${day.day}: ${day.condition} - ${day.temperature}°C`);
      });
      
      console.log('🕐 Hourly (around event time):');
      weatherData.hourly.slice(0, 5).forEach(hour => {
        const marker = hour.isCurrent ? '⭐' : '  ';
        console.log(`  ${marker} ${hour.time}: ${hour.temperature}°C`);
      });
      
      console.log('✅ Test passed\n');
      
    } catch (error) {
      console.error(`❌ Test failed:`, error);
      console.log('');
    }
  }
  
  console.log('🧪 Weather service testing completed!');
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  testWeatherService().catch(console.error);
}
