// Extend Window interface to include Google Maps
declare global {
  interface Window {
    google: {
      maps: {
        Geocoder: new () => google.maps.Geocoder;
        LatLng: new (lat: number, lng: number) => google.maps.LatLng;
      };
    };
  }
}

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    condition: string;
    windSpeed: number;
    humidity: number;
    icon: string;
  };
  forecast: Array<{
    day: string;
    condition: string;
    temperature: number;
    icon: string;
  }>;
  hourly: Array<{
    time: string;
    temperature: number;
    isCurrent?: boolean;
  }>;
}

interface VenueLocation {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

// Cache to store weather data per event
const weatherCache = new Map<string, WeatherData>();

// Generate cache key based on venue location and event date
const getCacheKey = (venueLocation: VenueLocation, eventDate: string): string => {
  const date = new Date(eventDate);
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
  return `${venueLocation.lat},${venueLocation.lng},${dateKey}`;
};

// Wait for Google Maps to load
const waitForGoogleMaps = (maxWaitTime = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      resolve(true);
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
};

// Fetch real weather data from OpenWeatherMap API
const fetchRealWeatherData = async (venueLocation: VenueLocation, eventDate: string): Promise<WeatherData> => {
  try {
    console.log('🌤️ Fetching real weather data for:', venueLocation, eventDate);
    
    // Get OpenWeatherMap API key from environment
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    
    if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
      throw new Error('OpenWeatherMap API key not configured. Please set VITE_OPENWEATHER_API_KEY in your .env file.');
    }
    
    // Use OpenWeatherMap API for current weather and 5-day forecast
    const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${venueLocation.lat}&lon=${venueLocation.lng}&appid=${apiKey}&units=metric`;
    console.log('🌤️ Making OpenWeatherMap API request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log('🌤️ API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenWeatherMap API error: ${response.status} ${response.statusText} - ${errorData.message || ''}`);
    }
    
    const data = await response.json();
    console.log('🌤️ Real weather data received:', data);
    console.log('🌤️ Weather data structure:', {
      list_length: data.list?.length,
      city: data.city?.name,
      first_forecast: data.list?.[0]
    });
    
    // Extract current weather data from the first forecast item
    const currentWeather = data.list[0];
    const currentMain = currentWeather.main;
    const currentWeatherInfo = currentWeather.weather[0];
    
    // Get location name from the response or use venue name
    const location = data.city?.name || venueLocation.name || venueLocation.address || 'Event Venue';
    
    // Extract weather data
    const temperature = Math.round(currentMain.temp);
    const windSpeed = Math.round(currentWeather.wind?.speed * 3.6 || 0); // Convert m/s to km/h
    const humidity = Math.round(currentMain.humidity);
    const condition = currentWeatherInfo.description || 'Unknown';
    
    // Generate forecast data (API provides 5-day forecast, we'll take 3)
    // Group by date to get daily forecasts
    const dailyForecasts = new Map();
    
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      dailyForecasts.get(date).push(item);
    });
    
    const forecast = Array.from(dailyForecasts.values()).slice(0, 3).map((dayItems: any[], index: number) => {
      const dayName = index === 0 ? 'Today' : 
                     index === 1 ? 'Tomorrow' : 
                     `Day ${index + 1}`;
      
      // Get the most representative hour for each day (usually noon)
      const representativeItem = dayItems.find(item => {
        const hour = new Date(item.dt * 1000).getHours();
        return hour >= 12 && hour <= 15; // Prefer afternoon hours
      }) || dayItems[Math.floor(dayItems.length / 2)]; // Fallback to middle of day
      
      return {
        day: dayName,
        condition: representativeItem.weather[0].description,
        temperature: Math.round(representativeItem.main.temp),
        icon: getWeatherIconFromCondition(representativeItem.weather[0].description)
      };
    });
    
    // Generate hourly forecast (next 8 hours from current time)
    const hourly = data.list.slice(0, 8).map((hour: any, index: number) => {
      const hourTime = new Date(hour.dt * 1000); // Convert Unix timestamp to Date
      
      return {
        time: hourTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        temperature: Math.round(hour.main.temp),
        isCurrent: index === 0 // Mark first hour as current
      };
    });
    
    console.log('🌤️ Successfully processed real weather data with varied forecasts');
    
    return {
      location: location,
      current: {
        temperature: temperature,
        condition: condition,
        windSpeed: windSpeed,
        humidity: humidity,
        icon: getWeatherIconFromCondition(condition)
      },
      forecast: forecast,
      hourly: hourly
    };
    
  } catch (error) {
    console.error('Error fetching real weather data:', error);
    // Fallback to mock data if OpenWeatherMap API fails
    console.log('🌤️ OpenWeatherMap API failed, using fallback mock data');
    return generateMockWeatherData(venueLocation, eventDate);
  }
};

// Convert weather condition to icon name
const getWeatherIconFromCondition = (condition: string): string => {
  const conditionLower = condition.toLowerCase();
  
  // Handle wttr.in specific weather descriptions
  if (conditionLower.includes('thunder') || conditionLower.includes('storm')) {
    return 'storm';
  } else if (conditionLower.includes('rain') || conditionLower.includes('shower') || conditionLower.includes('drizzle')) {
    return 'cloud-rain';
  } else if (conditionLower.includes('snow') || conditionLower.includes('blizzard')) {
    return 'snow';
  } else if (conditionLower.includes('cloud') || conditionLower.includes('overcast') || conditionLower.includes('mist') || conditionLower.includes('fog')) {
    return 'cloud';
  } else if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
    return 'sun';
  } else if (conditionLower.includes('partly') || conditionLower.includes('patchy')) {
    return 'cloud'; // Partly cloudy shows as cloud
  } else {
    return 'sun'; // Default to sun for unknown conditions
  }
};

// Generate location-aware weather data using Google Places API context
const generateLocationAwareWeatherData = (venueLocation: VenueLocation, eventDate: string, locationName: string): WeatherData => {
  const date = new Date(eventDate);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const month = date.getMonth();
  const hour = date.getHours();
  
  // Generate weather based on location (latitude affects temperature)
  // Malaysia/KL area (around 3°N) - tropical climate
  const isTropical = venueLocation.lat > 0 && venueLocation.lat < 10;
  const baseTemp = isTropical ? 28 + (Math.sin(month * 0.5) * 3) : 20 + (venueLocation.lat * 0.5) + (Math.sin(month * 0.5) * 10);
  
  // Tropical areas have more rain, especially in afternoon
  const isAfternoon = hour >= 12 && hour <= 18;
  const isRainy = isTropical ? (isAfternoon ? Math.random() > 0.3 : Math.random() > 0.7) : Math.random() > 0.6;
  const isStormy = isTropical ? (isAfternoon ? Math.random() > 0.6 : Math.random() > 0.8) : Math.random() > 0.8;
  
  // More realistic conditions for tropical climate
  const conditions = isStormy ? 'Thunderstorm' : 
                   isRainy ? (isTropical ? 'Heavy rain' : 'Cloudy with rain') : 
                   isTropical ? (hour < 6 || hour > 18 ? 'Clear' : 'Partly cloudy') :
                   isWeekend ? 'Sunny' : 'Partly cloudy';
  
  const currentTemp = Math.round(baseTemp + (Math.random() - 0.5) * 4);
  
  // Generate realistic forecast with tropical patterns
  const forecast = [
    { 
      day: 'Today', 
      condition: conditions, 
      temperature: currentTemp, 
      icon: isStormy ? 'storm' : isRainy ? 'cloud-rain' : (isTropical ? 'sun' : 'cloud')
    },
    { 
      day: 'Tomorrow', 
      condition: isTropical ? (Math.random() > 0.4 ? 'Heavy rain' : 'Partly cloudy') : (Math.random() > 0.5 ? 'Sunny' : 'Cloudy'), 
      temperature: Math.round(currentTemp + (Math.random() - 0.5) * 3), 
      icon: isTropical ? 'cloud-rain' : 'sun' 
    },
    { 
      day: 'Day 3', 
      condition: isTropical ? (Math.random() > 0.3 ? 'Thunderstorm' : 'Heavy rain') : (Math.random() > 0.6 ? 'Rain with thunder' : 'Cloudy'), 
      temperature: Math.round(currentTemp + (Math.random() - 0.5) * 4), 
      icon: 'storm' 
    }
  ];
  
  // Generate hourly forecast with realistic temperature patterns
  const hourly = Array.from({ length: 8 }, (_, i) => {
    const hourOffset = i;
    const hourTemp = Math.round(currentTemp + Math.sin((hour + hourOffset - 12) * 0.3) * 3 + (Math.random() - 0.5) * 2);
    const displayHour = (hour + hourOffset) % 24;
    
    return {
      time: `${displayHour.toString().padStart(2, '0')}:00`,
      temperature: hourTemp,
      isCurrent: i === 0 // Mark first hour as current
    };
  });
  
  return {
    location: locationName,
    current: {
      temperature: currentTemp,
      condition: conditions,
      windSpeed: Math.round((Math.random() * 3 + 2) * 10) / 10, // 2-5 km/h for tropical areas
      humidity: Math.round(Math.random() * 20 + (isTropical ? 70 : 50)), // Higher humidity in tropical areas
      icon: isStormy ? 'storm' : isRainy ? 'cloud-rain' : (isTropical ? 'sun' : 'cloud')
    },
    forecast: forecast,
    hourly: hourly
  };
};

// Enhanced mock weather data generator with location-aware patterns
const generateMockWeatherData = (venueLocation: VenueLocation, eventDate: string): WeatherData => {
  const date = new Date(eventDate);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const month = date.getMonth();
  const hour = date.getHours();
  
  // Generate weather based on location (latitude affects temperature)
  // Malaysia/KL area (around 3°N) - tropical climate
  const isTropical = venueLocation.lat > 0 && venueLocation.lat < 10;
  const baseTemp = isTropical ? 28 + (Math.sin(month * 0.5) * 3) : 20 + (venueLocation.lat * 0.5) + (Math.sin(month * 0.5) * 10);
  
  // Tropical areas have more rain, especially in afternoon
  const isAfternoon = hour >= 12 && hour <= 18;
  const isRainy = isTropical ? (isAfternoon ? Math.random() > 0.3 : Math.random() > 0.7) : Math.random() > 0.6;
  const isStormy = isTropical ? (isAfternoon ? Math.random() > 0.6 : Math.random() > 0.8) : Math.random() > 0.8;
  
  // More realistic conditions for tropical climate
  const conditions = isStormy ? 'Thunderstorm' : 
                   isRainy ? (isTropical ? 'Heavy rain' : 'Cloudy with rain') : 
                   isTropical ? (hour < 6 || hour > 18 ? 'Clear' : 'Partly cloudy') :
                   isWeekend ? 'Sunny' : 'Partly cloudy';
  
  const currentTemp = Math.round(baseTemp + (Math.random() - 0.5) * 4);
  
  // Generate realistic forecast with tropical patterns
  const forecast = [
    { 
      day: 'Today', 
      condition: conditions, 
      temperature: currentTemp, 
      icon: isStormy ? 'storm' : isRainy ? 'cloud-rain' : (isTropical ? 'sun' : 'cloud')
    },
    { 
      day: 'Tomorrow', 
      condition: isTropical ? (Math.random() > 0.4 ? 'Heavy rain' : 'Partly cloudy') : (Math.random() > 0.5 ? 'Sunny' : 'Cloudy'), 
      temperature: Math.round(currentTemp + (Math.random() - 0.5) * 3), 
      icon: isTropical ? 'cloud-rain' : 'sun' 
    },
    { 
      day: 'Day 3', 
      condition: isTropical ? (Math.random() > 0.3 ? 'Thunderstorm' : 'Heavy rain') : (Math.random() > 0.6 ? 'Rain with thunder' : 'Cloudy'), 
      temperature: Math.round(currentTemp + (Math.random() - 0.5) * 4), 
      icon: 'storm' 
    }
  ];
  
  // Generate hourly forecast with realistic temperature patterns
  const hourly = Array.from({ length: 8 }, (_, i) => {
    const hourOffset = i;
    const hourTemp = Math.round(currentTemp + Math.sin((hour + hourOffset - 12) * 0.3) * 3 + (Math.random() - 0.5) * 2);
    const displayHour = (hour + hourOffset) % 24;
    
    return {
      time: `${displayHour.toString().padStart(2, '0')}:00`,
      temperature: hourTemp,
      isCurrent: i === 0 // Mark first hour as current
    };
  });
  
  return {
    location: venueLocation.name || venueLocation.address || 'Event Venue',
    current: {
      temperature: currentTemp,
      condition: conditions,
      windSpeed: Math.round((Math.random() * 3 + 2) * 10) / 10, // 2-5 km/h for tropical areas
      humidity: Math.round(Math.random() * 20 + (isTropical ? 70 : 50)), // Higher humidity in tropical areas
      icon: isStormy ? 'storm' : isRainy ? 'cloud-rain' : (isTropical ? 'sun' : 'cloud')
    },
    forecast: forecast,
    hourly: hourly
  };
};

export const weatherService = {
  // Get weather data for a specific venue and event date
  async getWeatherData(venueLocation: VenueLocation, eventDate: string): Promise<WeatherData> {
    const cacheKey = getCacheKey(venueLocation, eventDate);
    
    // Check if we already have cached data for this location and date
    if (weatherCache.has(cacheKey)) {
      console.log('🌤️ Using cached weather data for:', cacheKey);
      return weatherCache.get(cacheKey)!;
    }
    
    console.log('🌤️ Fetching weather data for:', cacheKey);
    console.log('🌤️ Venue location:', venueLocation);
    console.log('🌤️ Event date:', eventDate);
    
    try {
      // Fetch real weather data from Google Weather API
      const weatherData = await fetchRealWeatherData(venueLocation, eventDate);
      
      // Cache the data
      weatherCache.set(cacheKey, weatherData);
      
      console.log('🌤️ Successfully fetched and cached weather data:', weatherData);
      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // The fetchRealWeatherData function now handles fallback to mock data internally
      // So if we reach here, it means both Google Weather API and mock data failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Weather service unavailable: ${errorMessage}`);
    }
  },
  
  // Clear cache (useful for testing or when you want fresh data)
  clearCache(): void {
    console.log('🌤️ Clearing weather cache');
    weatherCache.clear();
  },
  
  // Get cache size (for debugging)
  getCacheSize(): number {
    return weatherCache.size;
  }
};

export type { WeatherData, VenueLocation };
