import React from 'react';
import { Clock, Calendar } from 'lucide-react';

interface TimeRangeDisplayProps {
  startTime: string;
  endTime: string;
  eventDate?: string;
  currentTime?: string | null; // Current time in the simulation
  className?: string;
  compact?: boolean;
}

const TimeRangeDisplay: React.FC<TimeRangeDisplayProps> = ({
  startTime,
  endTime,
  eventDate,
  currentTime,
  className = '',
  compact = false
}) => {
  // Format time from 24-hour format to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return '';
    
    // Handle both HH:MM format and full date strings
    if (time.includes('T')) {
      // Full date string like "2025-10-25T10:00:00+00:00"
      // Extract time directly from ISO string to avoid timezone conversion
      const timeMatch = time.match(/T(\d{2}):(\d{2}):/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
      }
    } else {
      // Just time string like "10:00"
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    
    return '';
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Calculate duration between start and end time
  const calculateDuration = () => {
    if (!startTime || !endTime) return '';
    
    // Extract hours and minutes from either format
    const getTimeComponents = (time: string) => {
      if (time.includes('T')) {
        // Full date string like "2025-10-25T10:00:00+00:00"
        const timeMatch = time.match(/T(\d{2}):(\d{2}):/);
        if (timeMatch) {
          return [parseInt(timeMatch[1]), parseInt(timeMatch[2])];
        }
      } else {
        // Just time string like "10:00"
        return time.split(':').map(Number);
      }
      return [0, 0];
    };
    
    const [startH, startM] = getTimeComponents(startTime);
    const [endH, endM] = getTimeComponents(endTime);
    
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    
    // Handle overnight events
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    const diffMinutes = endMinutes - startMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours === 0 && minutes === 0) return '';
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  // Compact version for overlay
  if (compact) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-3 shadow-lg ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-3 w-3 text-blue-600" />
          <h3 className="text-xs font-semibold text-gray-800">Simulation Time</h3>
        </div>
        
        <div className="space-y-2">
          {/* Current Time - Prominent */}
          {currentTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
              <div className="text-center">
                <div className="text-xs text-blue-600 font-medium mb-1">Current</div>
                <div className="text-lg font-bold text-blue-800">
                  {formatTime(currentTime)}
                </div>
              </div>
            </div>
          )}
          
          {/* Event Date */}
          {eventDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-2 w-2 text-gray-500" />
              <span className="text-xs text-gray-600">{formatDate(eventDate)}</span>
            </div>
          )}
          
          {/* Time Range - Compact */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium text-gray-800">
              {formatTime(startTime)}
            </span>
            
            <span className="text-xs text-gray-500 px-1 py-0.5 bg-gray-100 rounded text-center min-w-[2rem]">
              {calculateDuration()}
            </span>
            
            <span className="text-xs font-medium text-gray-800">
              {formatTime(endTime)}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
          </div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-800">Simulation Time Range</h3>
      </div>
      
      <div className="space-y-2">
        {/* Event Date */}
        {eventDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-500" />
            <span className="text-sm text-gray-600">{formatDate(eventDate)}</span>
          </div>
        )}
        
        {/* Time Range */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-800">
              Start: {formatTime(startTime)}
            </span>
          </div>
          
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-full">
              {calculateDuration()}
            </span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              End: {formatTime(endTime)}
            </span>
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
          </div>
        </div>
        
        {/* Duration Summary */}
        <div className="text-xs text-gray-500 text-center pt-1">
          Total simulation duration: {calculateDuration()}
        </div>
      </div>
    </div>
  );
};

export default TimeRangeDisplay;
