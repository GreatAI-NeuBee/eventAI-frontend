import React, { useState, useEffect } from 'react';
import { Droplets, Wind, Cloud, Sun, CloudRain, CloudSnow, Zap } from 'lucide-react';
import { weatherService, type WeatherData, type VenueLocation } from '../../services/weatherService';

interface WeatherWidgetProps {
  venueLocation: VenueLocation;
  eventDate: string;
  className?: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ 
  venueLocation, 
  eventDate, 
  className = '' 
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Weather condition icons mapping
  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return <Zap className="h-8 w-8 text-yellow-400" />;
    } else if (conditionLower.includes('rain')) {
      return <CloudRain className="h-8 w-8 text-blue-400" />;
    } else if (conditionLower.includes('snow')) {
      return <CloudSnow className="h-8 w-8 text-blue-200" />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className="h-8 w-8 text-gray-400" />;
    } else {
      return <Sun className="h-8 w-8 text-yellow-400" />;
    }
  };

  // Get weather icon for forecast
  const getForecastIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('storm') || conditionLower.includes('thunder')) {
      return <CloudRain className="h-4 w-4" />;
    } else if (conditionLower.includes('rain')) {
      return <CloudRain className="h-4 w-4" />;
    } else if (conditionLower.includes('snow')) {
      return <CloudSnow className="h-4 w-4" />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className="h-4 w-4" />;
    } else {
      return <Sun className="h-4 w-4" />;
    }
  };

  // Fetch weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!venueLocation || !eventDate) return;

      setIsLoading(true);
      setError(null);

      try {
        const weatherData = await weatherService.getWeatherData(venueLocation, eventDate);
        setWeatherData(weatherData);
      } catch (err) {
        console.error('Error fetching weather data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load weather data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeatherData();
  }, [venueLocation, eventDate]);

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Weather Forecast</h3>
          <p className="text-sm text-gray-600">Loading weather data...</p>
        </div>
        <div className="p-4 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className={`${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Weather Forecast</h3>
          <p className="text-sm text-gray-600">Weather data unavailable</p>
        </div>
        <div className="p-4 text-center text-gray-500">
          <Cloud className="h-8 w-8 mx-auto mb-2" />
          <p>Unable to load weather data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Event Weather Forecast</h3>
        <p className="text-sm text-gray-600">
          Weather conditions for {weatherData.location} on {new Date(eventDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <div className="space-y-3">
        {/* Current Weather Card */}
        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <h4 className="font-medium text-gray-900 mr-2 text-sm">Event Weather</h4>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  📅
                  <span className="ml-1">Event Day</span>
                </span>
                <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  FORECAST
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900">{weatherData.current.temperature}°C</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm">{weatherData.current.condition}</span>
                </div>
                <div className="flex items-center">
                  <Wind className="w-3 h-3 mr-1" />
                  <span>{weatherData.current.windSpeed}km/h</span>
                </div>
                <div className="flex items-center">
                  <Droplets className="w-3 h-3 mr-1" />
                  <span>{weatherData.current.humidity}%</span>
                </div>
              </div>
            </div>

            <div className="ml-3">
              <div className="text-4xl">
                {getWeatherIcon(weatherData.current.condition)}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Day Forecast Cards */}
        {weatherData.forecast.slice(0, 3).map((day, index) => (
          <div key={index} className="p-3 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h4 className="font-medium text-gray-900 mr-2 text-sm">{day.day}</h4>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getForecastIcon(day.condition)}
                    <span className="ml-1">{day.condition}</span>
                  </span>
                  <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {day.temperature}°C
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="flex items-center">
                    <span className="text-sm">Forecast</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm">Temperature</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm">{day.condition}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{day.temperature}°C</span>
                  </div>
                </div>
              </div>

              <div className="ml-3">
                <div className="text-2xl">
                  {getForecastIcon(day.condition)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Hourly Forecast Summary */}
        <div className="p-3 border border-gray-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <h4 className="font-medium text-gray-900 mr-2 text-sm">Hourly Forecast</h4>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  📅
                  <span className="ml-1">Next 8 Hours</span>
                </span>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2">
                {weatherData.hourly.map((hour, index) => (
                  <div key={index} className="flex flex-col items-center min-w-0 px-2 py-1">
                    <div className={`text-xs ${hour.isCurrent ? 'text-yellow-600 font-bold' : 'text-gray-500'} mb-1`}>
                      {hour.time}
                    </div>
                    <div className={`text-sm font-medium ${hour.isCurrent ? 'text-yellow-600' : 'text-gray-900'}`}>
                      {hour.temperature}°
                    </div>
                    {hour.isCurrent && (
                      <div className="w-1 h-1 bg-yellow-500 rounded-full mt-1"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;