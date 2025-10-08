import React, { useState, useEffect } from 'react';
import { weatherService, type WeatherData, type VenueLocation } from '../../services/weatherService';

interface WeatherBackgroundProps {
  venueLocation: VenueLocation | null;
  eventDate: string;
  children: React.ReactNode;
  testMode?: boolean; // Enable test mode with manual weather selection
}

// Create a context to share weather condition with child components
export const WeatherContext = React.createContext<{
  weatherCondition: string;
  isDarkBackground: boolean;
  isRainBackground: boolean;
  weatherData: WeatherData | null;
}>({
  weatherCondition: 'clear',
  isDarkBackground: false,
  isRainBackground: false,
  weatherData: null,
});

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

  // Determine if background is dark (affects text color)
  // Storm is dark background, rain is light but needs special handling
  const isDarkBackground = weatherCondition === 'storm';
  const isRainBackground = weatherCondition === 'rain';

  // Weather-specific styles and animations
  const getWeatherStyles = () => {
    switch (weatherCondition) {
      case 'rain':
        return {
          background: '', // Video will provide the background
          overlay: 'bg-gray-900/5' // Very light overlay since rain video is lighter
        };
      case 'storm':
        return {
          background: '', // Video will provide the background
          overlay: 'bg-gray-900/10' // Lighter overlay since video has its own overlay
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

  // Rain animation component with video background
  const RainAnimation = () => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
      const video = videoRef.current;
      if (video) {
        // Force load and play when component mounts
        video.load();
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Rain video autoplay prevented:', error);
            // Try to play again after a short delay
            setTimeout(() => video.play(), 100);
          });
        }
      }
    }, []);

    return (
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Video Background */}
        <video
          ref={videoRef}
          key="rain-video"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          style={{
            filter: 'brightness(0.9) contrast(1.0) saturate(0.9)',
            transform: 'scale(1.05)', // Slight scale to avoid edge artifacts
          }}
        >
          <source src="/videos/raining12.mp4" type="video/mp4" />
        </video>
        
        {/* Light overlay for better content readability */}
        <div className="absolute inset-0 bg-gray-500/10" />
      </div>
    );
  };

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

  // Storm animation component with video background
  const StormAnimation = () => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
      const video = videoRef.current;
      if (video) {
        // Force load and play when component mounts
        video.load();
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Storm video autoplay prevented:', error);
            // Try to play again after a short delay
            setTimeout(() => video.play(), 100);
          });
        }
      }
    }, []);

    return (
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Video Background */}
        <video
          ref={videoRef}
          key="storm-video"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          style={{
            filter: 'brightness(0.8) contrast(1.1) saturate(0.8)',
            transform: 'scale(1.05)', // Slight scale to avoid edge artifacts
          }}
        >
          <source src="/videos/storm1.mp4" type="video/mp4" />
        </video>
        
        {/* Light overlay for better content readability */}
        <div className="absolute inset-0 bg-gray-900/15" />
        
        {/* Subtle lightning effect overlay - reduced to let video thunder show through */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
            animation: 'lightning 8s ease-in-out infinite alternate',
          }}
        />
        <style>{`
          @keyframes lightning {
            0%, 85%, 100% {
              opacity: 0;
            }
            5%, 10% {
              opacity: 0.15;
            }
            15%, 20% {
              opacity: 0.1;
            }
          }
        `}</style>
      </div>
    );
  };

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
        <WeatherContext.Provider value={{ weatherCondition, isDarkBackground, isRainBackground, weatherData }}>
          {children}
        </WeatherContext.Provider>
      </div>
      
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
              <option value="storm">⛈️ Storm/Thunder (Video)</option>
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
