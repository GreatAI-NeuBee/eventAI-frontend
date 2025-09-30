import React, { useState, useEffect } from 'react';
import { weatherService, type WeatherData, type VenueLocation } from '../../services/weatherService';

interface WeatherBackgroundProps {
  venueLocation: VenueLocation | null;
  eventDate: string;
  children: React.ReactNode;
  testMode?: boolean; // Enable test mode with manual weather selection
}

const WeatherBackground: React.FC<WeatherBackgroundProps> = ({
  venueLocation,
  eventDate,
  children,
  testMode = false
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testWeatherCondition, setTestWeatherCondition] = useState<string>('clear');

  // Fetch weather data (skip in test mode)
  useEffect(() => {
    const fetchWeatherData = async () => {
      if (testMode) {
        setIsLoading(false);
        return;
      }

      if (!venueLocation || !eventDate) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const data = await weatherService.getWeatherData(venueLocation, eventDate);
        setWeatherData(data);
      } catch (err) {
        console.error('Error fetching weather data for background:', err);
        setWeatherData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeatherData();
  }, [venueLocation, eventDate, testMode]);

  // Determine weather condition for background
  const getWeatherCondition = (): string => {
    // In test mode, use the manually selected condition
    if (testMode) {
      return testWeatherCondition;
    }

    if (!weatherData) return 'clear';
    
    const condition = weatherData.current.condition.toLowerCase();
    
    if (condition.includes('storm') || condition.includes('thunder')) {
      return 'storm';
    } else if (condition.includes('rain') || condition.includes('drizzle')) {
      return 'rain';
    } else if (condition.includes('snow')) {
      return 'snow';
    } else if (condition.includes('cloud') || condition.includes('overcast')) {
      return 'cloudy';
    } else {
      return 'clear';
    }
  };

  const weatherCondition = getWeatherCondition();

  // Weather-specific styles and animations
  const getWeatherStyles = () => {
    switch (weatherCondition) {
      case 'rain':
        return {
          background: '', // Keep default white background
          overlay: ''
        };
      case 'storm':
        return {
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          overlay: 'bg-gray-900/20'
        };
      case 'snow':
        return {
          background: 'linear-gradient(135deg, #e6f3ff 0%, #b3d9ff 100%)',
          overlay: 'bg-blue-100/30'
        };
      case 'cloudy':
        return {
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          overlay: 'bg-gray-100/20'
        };
      default: // clear/sunny
        return {
          background: '', // No background for sunny weather
          overlay: ''
        };
    }
  };

  const styles = getWeatherStyles();

  // Rain animation component
  const RainAnimation = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => {
        const dropHeight = Math.random() * 12 + 8; // 8-20px height
        const animationDuration = Math.random() * 1.5 + 1.5; // 1.5-3s duration (slower)
        return (
          <div
            key={i}
            className="absolute bg-blue-500/70"
            style={{
              left: `${Math.random() * 100}%`,
              width: '3px',
              height: `${dropHeight}px`,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', // Teardrop shape
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${animationDuration}s`,
              transform: `translateY(-100vh) rotate(${Math.random() * 6 - 3}deg)`, // Slight random rotation
              animation: `rainDrop ${animationDuration}s linear infinite`,
              boxShadow: '0 0 2px rgba(59, 130, 246, 0.4)', // Subtle blue glow
              filter: 'blur(0.3px)', // Slight blur for more realistic look
            }}
          />
        );
      })}
      <style>{`
        @keyframes rainDrop {
          0% {
            transform: translateY(-100vh);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );

  // Snow animation component
  const SnowAnimation = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-white/60 rounded-full animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 3 + 2}s`,
            transform: `translateY(-10px)`,
            animation: `snowFall ${Math.random() * 3 + 2}s linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes snowFall {
          to {
            transform: translateY(100vh) translateX(50px);
          }
        }
      `}</style>
    </div>
  );

  // Storm animation component
  const StormAnimation = () => (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          animation: 'lightning 4s ease-in-out infinite alternate',
        }}
      />
      <style>{`
        @keyframes lightning {
          0%, 90%, 100% {
            opacity: 0;
          }
          5%, 10% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div 
      className="min-h-screen relative"
      style={styles.background ? { background: styles.background } : { backgroundColor: '#f9fafb' }}
    >
      {/* Weather Animations */}
      {weatherCondition === 'rain' && <RainAnimation />}
      {weatherCondition === 'snow' && <SnowAnimation />}
      {weatherCondition === 'storm' && <StormAnimation />}
      
      {/* Overlay for better content readability */}
      {styles.overlay && (
        <div className={`absolute inset-0 ${styles.overlay} z-10`} />
      )}
      
      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
      
      {/* Weather indicator (subtle) */}
      {weatherData && weatherCondition !== 'clear' && !testMode && (
        <div className="fixed top-4 right-4 z-30 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center space-x-2 text-sm text-gray-700">
            <span>{weatherData.current.condition}</span>
            <span className="font-medium">{weatherData.current.temperature}°C</span>
          </div>
        </div>
      )}

      {/* Test Mode Dropdown */}
      {testMode && (
        <div className="fixed top-4 right-4 z-30 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🧪 Test Weather Background
            </label>
            <select
              value={testWeatherCondition}
              onChange={(e) => setTestWeatherCondition(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="clear">☀️ Clear/Sunny</option>
              <option value="rain">🌧️ Rain</option>
              <option value="storm">⛈️ Storm/Thunder</option>
              <option value="snow">❄️ Snow</option>
              <option value="cloudy">☁️ Cloudy</option>
            </select>
          </div>
          <div className="text-xs text-gray-600">
            Current: <span className="font-medium capitalize">{weatherCondition}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherBackground;
