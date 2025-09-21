import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Clock } from 'lucide-react';

interface TimeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  name?: string;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  error = false,
  disabled = false,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate time options (00:00, 00:30, 01:00, etc.)
  const timeOptions = Array.from({ length: 24 }, (_, hour) => [
    `${hour.toString().padStart(2, '0')}:00`,
    `${hour.toString().padStart(2, '0')}:30`
  ]).flat();

  // Format time for display (convert to 12-hour format for better UX)
  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedTime: string) => {
    onChange(selectedTime);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`
          relative w-full rounded-lg border px-3 py-2 text-left text-sm
          focus:outline-none focus:ring-1 transition-all duration-200
          ${error 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
          }
          ${disabled 
            ? 'bg-gray-100 cursor-not-allowed text-gray-400' 
            : 'bg-white hover:border-gray-400 cursor-pointer'
          }
          ${isOpen ? 'ring-1 ring-primary-500 border-primary-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className={`h-4 w-4 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {value ? formatTimeDisplay(value) : placeholder}
            </span>
          </div>
          <ChevronDown 
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            } ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="py-1">
            {timeOptions.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => handleSelect(time)}
                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors duration-150
                  hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:bg-primary-50
                  ${value === time 
                    ? 'bg-primary-100 text-primary-800 font-medium' 
                    : 'text-gray-900'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{formatTimeDisplay(time)}</span>
                  <span className="text-xs text-gray-500">{time}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden input for form compatibility */}
      <input
        type="hidden"
        name={name}
        value={value}
      />
    </div>
  );
};

export default TimeSelector;
