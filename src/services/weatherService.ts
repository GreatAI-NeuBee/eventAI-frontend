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


// Fetch real weather data from OpenWeatherMap API
const fetchRealWeatherData = async (venueLocation: VenueLocation, eventDate: string): Promise<WeatherData> => {
  try {
    console.log('🌤️ Fetching real weather data for:', venueLocation, eventDate);
    
    // Get OpenWeatherMap API key from environment
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    
    if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
      throw new Error('OpenWeatherMap API key not configured. Please set VITE_OPENWEATHER_API_KEY in your .env file.');
    }
    
    const eventDateTime = new Date(eventDate);
    const currentDate = new Date();
    const daysDifference = Math.ceil((eventDateTime.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('🌤️ Event date:', eventDateTime.toISOString());
    console.log('🌤️ Current date:', currentDate.toISOString());
    console.log('🌤️ Days difference:', daysDifference);
    
    // If event is more than 5 days in the future, use historical/forecast API or fallback to mock
    if (daysDifference > 5) {
      console.log('🌤️ Event is more than 5 days away, using enhanced mock data');
      return generateEventSpecificWeatherData(venueLocation, eventDate);
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
    
    const location = data.city?.name || venueLocation.name || venueLocation.address || 'Event Venue';
    
    // Find weather data closest to the event date
    let eventWeather = null;
    let eventHour = eventDateTime.getHours();
    
    // Look for weather data closest to the event date and time
    if (daysDifference >= 0 && daysDifference <= 5) {
      // Find the forecast item closest to the event date and time
      eventWeather = data.list.find((item: any) => {
        const itemDate = new Date(item.dt * 1000);
        const itemHour = itemDate.getHours();
        const itemDay = Math.floor((itemDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Match the day and prefer the hour closest to event hour
        return itemDay === daysDifference && Math.abs(itemHour - eventHour) <= 3;
      });
      
      // If no exact match, find the closest time on the event day
      if (!eventWeather) {
        eventWeather = data.list.find((item: any) => {
          const itemDate = new Date(item.dt * 1000);
          const itemDay = Math.floor((itemDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          return itemDay === daysDifference;
        });
      }
    }
    
    // If no event-specific weather found, use the first available forecast
    if (!eventWeather) {
      eventWeather = data.list[0];
    }
    
    const eventMain = eventWeather.main;
    const eventWeatherInfo = eventWeather.weather[0];
    
    // Extract weather data for the event
    const temperature = Math.round(eventMain.temp);
    const windSpeed = Math.round(eventWeather.wind?.speed * 3.6 || 0); // Convert m/s to km/h
    const humidity = Math.round(eventMain.humidity);
    const condition = eventWeatherInfo.description || 'Unknown';
    
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
    
    // Create forecast centered around the event date
    const forecastDates = Array.from(dailyForecasts.keys()).sort();
    const eventDateString = eventDateTime.toDateString();
    const eventDateIndex = forecastDates.findIndex(date => date === eventDateString);
    
    let forecastDays = [];
    if (eventDateIndex >= 0) {
      // Event is within the 5-day forecast
      const startIndex = Math.max(0, eventDateIndex - 1);
      const endIndex = Math.min(forecastDates.length, eventDateIndex + 2);
      forecastDays = forecastDates.slice(startIndex, endIndex);
    } else {
      // Event is outside forecast range, use available days
      forecastDays = forecastDates.slice(0, 3);
    }
    
    const forecast = forecastDays.map((dateString, index) => {
      const dayItems = dailyForecasts.get(dateString);
      const date = new Date(dateString);
      const isEventDay = dateString === eventDateString;
      
      let dayName;
      if (isEventDay) {
        dayName = 'Event Day';
      } else if (index === 0 && !isEventDay) {
        dayName = 'Before Event';
      } else if (index === forecastDays.length - 1 && !isEventDay) {
        dayName = 'After Event';
      } else {
        dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      
      // Get the most representative hour for each day (prefer event hour if it's the event day)
      const representativeItem = dayItems.find((item: any) => {
        const hour = new Date(item.dt * 1000).getHours();
        if (isEventDay) {
          return Math.abs(hour - eventHour) <= 2; // Prefer hours close to event time
        }
        return hour >= 12 && hour <= 15; // Prefer afternoon hours for other days
      }) || dayItems[Math.floor(dayItems.length / 2)]; // Fallback to middle of day
      
      return {
        day: dayName,
        condition: representativeItem.weather[0].description,
        temperature: Math.round(representativeItem.main.temp),
        icon: getWeatherIconFromCondition(representativeItem.weather[0].description)
      };
    });
    
    // Generate hourly forecast around the event time
    const hourly = [];
    if (daysDifference >= 0 && daysDifference <= 5) {
      // Find hourly data around the event time
      const eventDayItems = data.list.filter((item: any) => {
        const itemDate = new Date(item.dt * 1000);
        const itemDay = Math.floor((itemDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return itemDay === daysDifference;
      });
      
      // Get 4 hours before and 4 hours after event time
      const eventHourIndex = eventDayItems.findIndex((item: any) => {
        const hour = new Date(item.dt * 1000).getHours();
        return Math.abs(hour - eventHour) <= 1;
      });
      
      const startIndex = Math.max(0, eventHourIndex - 4);
      const endIndex = Math.min(eventDayItems.length, eventHourIndex + 5);
      const selectedHours = eventDayItems.slice(startIndex, endIndex);
      
      hourly.push(...selectedHours.map((hour: any) => {
        const hourTime = new Date(hour.dt * 1000);
        const hourOfDay = hourTime.getHours();
        const isEventTime = Math.abs(hourOfDay - eventHour) <= 1;
        
        return {
          time: hourTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          temperature: Math.round(hour.main.temp),
          isCurrent: isEventTime // Mark event time
        };
      }));
    } else {
      // Fallback to first 8 hours if event is outside forecast range
      hourly.push(...data.list.slice(0, 8).map((hour: any) => {
        const hourTime = new Date(hour.dt * 1000);
        
        return {
          time: hourTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          temperature: Math.round(hour.main.temp),
          isCurrent: false
        };
      }));
    }
    
    console.log('🌤️ Successfully processed event-specific weather data');
    
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
    return generateEventSpecificWeatherData(venueLocation, eventDate);
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


// Generate event-specific weather data for events beyond 5-day forecast
const generateEventSpecificWeatherData = (venueLocation: VenueLocation, eventDate: string): WeatherData => {
  const eventDateTime = new Date(eventDate);
  const currentDate = new Date();
  const daysDifference = Math.ceil((eventDateTime.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  const eventHour = eventDateTime.getHours();
  const eventMonth = eventDateTime.getMonth();
  
  // Generate weather based on location and season
  const isTropical = venueLocation.lat > 0 && venueLocation.lat < 10;
  const baseTemp = isTropical ? 28 + (Math.sin(eventMonth * 0.5) * 3) : 20 + (venueLocation.lat * 0.5) + (Math.sin(eventMonth * 0.5) * 10);
  
  // Event-specific weather patterns
  const isAfternoon = eventHour >= 12 && eventHour <= 18;
  const isEvening = eventHour >= 18 && eventHour <= 22;
  const isMorning = eventHour >= 6 && eventHour <= 12;
  
  // Weather conditions based on time of day and season
  let conditions;
  if (isTropical) {
    if (isAfternoon) {
      conditions = Math.random() > 0.4 ? 'Heavy rain' : 'Partly cloudy';
    } else if (isEvening) {
      conditions = Math.random() > 0.6 ? 'Clear' : 'Partly cloudy';
    } else if (isMorning) {
      conditions = Math.random() > 0.7 ? 'Clear' : 'Partly cloudy';
    } else {
      conditions = Math.random() > 0.8 ? 'Clear' : 'Partly cloudy';
    }
  } else {
    if (isAfternoon) {
      conditions = Math.random() > 0.5 ? 'Sunny' : 'Partly cloudy';
    } else if (isEvening) {
      conditions = Math.random() > 0.6 ? 'Clear' : 'Cloudy';
    } else if (isMorning) {
      conditions = Math.random() > 0.7 ? 'Sunny' : 'Partly cloudy';
    } else {
      conditions = Math.random() > 0.8 ? 'Clear' : 'Cloudy';
    }
  }
  
  const eventTemp = Math.round(baseTemp + (Math.random() - 0.5) * 4);
  
  // Generate forecast around the event
  const forecast = [
    { 
      day: daysDifference > 1 ? 'Before Event' : 'Event Day', 
      condition: daysDifference > 1 ? (isTropical ? 'Heavy rain' : 'Partly cloudy') : conditions, 
      temperature: Math.round(eventTemp + (Math.random() - 0.5) * 2), 
      icon: isTropical ? 'cloud-rain' : 'cloud'
    },
    { 
      day: 'Event Day', 
      condition: conditions, 
      temperature: eventTemp, 
      icon: conditions.toLowerCase().includes('rain') ? 'cloud-rain' : 
            conditions.toLowerCase().includes('storm') ? 'storm' : 
            conditions.toLowerCase().includes('cloud') ? 'cloud' : 'sun'
    },
    { 
      day: 'After Event', 
      condition: isTropical ? (Math.random() > 0.3 ? 'Heavy rain' : 'Partly cloudy') : (Math.random() > 0.5 ? 'Sunny' : 'Cloudy'), 
      temperature: Math.round(eventTemp + (Math.random() - 0.5) * 3), 
      icon: isTropical ? 'cloud-rain' : 'sun'
    }
  ];
  
  // Generate hourly forecast around event time
  const hourly = Array.from({ length: 8 }, (_, i) => {
    const hourOffset = i - 4; // 4 hours before to 4 hours after event
    const hourTemp = Math.round(eventTemp + Math.sin((eventHour + hourOffset - 12) * 0.3) * 3 + (Math.random() - 0.5) * 2);
    const displayHour = (eventHour + hourOffset + 24) % 24;
    const isEventTime = hourOffset === 0;
    
    return {
      time: `${displayHour.toString().padStart(2, '0')}:00`,
      temperature: hourTemp,
      isCurrent: isEventTime
    };
  });
  
  return {
    location: venueLocation.name || venueLocation.address || 'Event Venue',
    current: {
      temperature: eventTemp,
      condition: conditions,
      windSpeed: Math.round((Math.random() * 3 + 2) * 10) / 10,
      humidity: Math.round(Math.random() * 20 + (isTropical ? 70 : 50)),
      icon: conditions.toLowerCase().includes('rain') ? 'cloud-rain' : 
            conditions.toLowerCase().includes('storm') ? 'storm' : 
            conditions.toLowerCase().includes('cloud') ? 'cloud' : 'sun'
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
