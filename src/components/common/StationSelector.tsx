import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin, Train, Bus } from 'lucide-react';
import { Station, RapidKlAgency } from '../../api/rapidKlApi';

interface StationSelectorProps {
  stations: Station[];
  value: Station | null;
  onChange: (station: Station) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  name?: string;
}

const StationSelector: React.FC<StationSelectorProps> = ({
  stations,
  value,
  onChange,
  placeholder = "Select station",
  error = false,
  disabled = false,
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getAgencyIcon = (agency: RapidKlAgency) => {
    switch (agency) {
      case 'lrt':
      case 'mrt':
        return <Train className="w-4 h-4" />;
      case 'monorail':
        return <Train className="w-4 h-4" />;
      case 'bus':
      case 'brt':
        return <Bus className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getAgencyColor = (agency: RapidKlAgency) => {
    switch (agency) {
      case 'lrt':
        return 'text-blue-600 bg-blue-100';
      case 'mrt':
        return 'text-green-600 bg-green-100';
      case 'monorail':
        return 'text-purple-600 bg-purple-100';
      case 'bus':
      case 'brt':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
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

  const handleSelect = (selectedStation: Station) => {
    onChange(selectedStation);
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
            {value?.agency ? (
              getAgencyIcon(value.agency)
            ) : (
              <MapPin className={`h-4 w-4 ${disabled ? 'text-gray-400' : 'text-gray-500'}`} />
            )}
            <span className={value ? 'text-gray-900' : 'text-gray-500'}>
              {value ? value.name : placeholder}
            </span>
            {value && value.distance && (
              <span className="text-xs text-gray-500">
                • {formatDistance(value.distance)} away
              </span>
            )}
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
            {stations.map((station) => (
              <button
                key={station.id}
                type="button"
                onClick={() => handleSelect(station)}
                className={`
                  w-full px-3 py-2 text-left text-sm transition-colors duration-150
                  hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:bg-primary-50
                  ${value?.id === station.id 
                    ? 'bg-primary-100 text-primary-800 font-medium' 
                    : 'text-gray-900'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {station.agency && getAgencyIcon(station.agency)}
                    <span>{station.name}</span>
                    {station.agency && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getAgencyColor(station.agency)}`}>
                        {station.agency.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {station.distance && (
                    <span className="text-xs text-gray-500">
                      {formatDistance(station.distance)}
                    </span>
                  )}
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
        value={value?.id || ''}
      />
    </div>
  );
};

export default StationSelector;
