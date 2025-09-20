import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import GoogleMapPicker from '../components/maps/GoogleMapPicker';
import VenueLayoutMap from '../components/maps/VenueLayoutMap';
import VenueSearchInput from '../components/maps/VenueSearchInput';
import { useEventStore } from '../store/eventStore';
import { eventAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

const NewEvent: React.FC = () => {
  const navigate = useNavigate();
  const { addEvent, setCurrentEvent, setLoading, setError, isLoading } = useEventStore();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    dateStart: '',
    dateEnd: '',
    venue: '',
    description: '',
  });

  const [venueLayoutJson, setVenueLayoutJson] = useState<string>('');

  const [venueLocation, setVenueLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
    placeId?: string;
    name?: string;
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleVenueLayoutChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setVenueLayoutJson(value);
    
    // Clear error when user starts typing
    if (errors.venueLayout) {
      setErrors(prev => ({ ...prev, venueLayout: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.dateStart) {
      newErrors.dateStart = 'Event start date is required';
    } else {
      const startDate = new Date(formData.dateStart);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        newErrors.dateStart = 'Event start date cannot be in the past';
      }
    }

    if (!formData.dateEnd) {
      newErrors.dateEnd = 'Event end date is required';
    } else if (formData.dateStart) {
      const startDate = new Date(formData.dateStart);
      const endDate = new Date(formData.dateEnd);
      
      if (endDate <= startDate) {
        newErrors.dateEnd = 'Event end date must be after start date';
      }
    }

    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required';
    }

    // Venue layout validation (optional for now since it will be implemented later)
    if (venueLayoutJson.trim() && venueLayoutJson.trim() !== '') {
      try {
        JSON.parse(venueLayoutJson);
      } catch (e) {
        newErrors.venueLayout = 'Invalid JSON format for venue layout';
      }
    }

    if (!venueLocation) {
      newErrors.venueLocation = 'Please select a venue location on the map';
    }

    // Check if user is logged in
    if (!user?.email) {
      newErrors.userEmail = 'You must be logged in to create an event';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create JSON payload for API submission (using server-expected field names)
      const submitData: any = {
        name: formData.name,
        dateOfEventStart: formData.dateStart + ':00Z', // Add seconds and UTC timezone
        dateOfEventEnd: formData.dateEnd + ':00Z', // Add seconds and UTC timezone
        venue: formData.venue,
        description: formData.description,
      };
      
      // Add logged-in user email
      if (user?.email) {
        submitData.userEmail = user.email;
      }
      
      if (venueLocation) {
        submitData.venueLocation = venueLocation;
      }
      
      if (venueLayoutJson.trim()) {
        try {
          submitData.venueLayout = JSON.parse(venueLayoutJson);
        } catch (e) {
          console.warn('Invalid JSON in venue layout, sending as string:', e);
          submitData.venueLayout = venueLayoutJson;
        }
      }

      // Debug: Log the JSON data being submitted
      console.log('🚀 Submitting event data to API...');
      console.log('📝 JSON payload:', submitData);
      
      const response = await eventAPI.createEvent(submitData);
      console.log('✅ Event created successfully:', response.data);
      
      const newEvent = response.data;

      // Add event to store
      addEvent(newEvent);
      setCurrentEvent(newEvent);

      // Navigate to dashboard
      navigate('/dashboard', { state: { eventId: newEvent.id } });
    } catch (error: any) {
      console.error('❌ Error creating event:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to create event';
      
      if (error.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check if the server is running at http://localhost:3000';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="mt-2 text-gray-600">
          Set up a new event for crowd simulation analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Event Details */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Event Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter event name"
              icon={Calendar}
              error={errors.name}
              required
            />

            <Input
              label="Event Start Date & Time"
              name="dateStart"
              type="datetime-local"
              value={formData.dateStart}
              onChange={handleInputChange}
              error={errors.dateStart}
              required
            />

            <Input
              label="Event End Date & Time"
              name="dateEnd"
              type="datetime-local"
              value={formData.dateEnd}
              onChange={handleInputChange}
              error={errors.dateEnd}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue *
              </label>
              <VenueSearchInput
                placeholder="Search for venue (e.g., Moscone Center)"
                value={formData.venue}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, venue: value }));
                  // Clear error when user starts typing
                  if (errors.venue) {
                    setErrors(prev => ({ ...prev, venue: '' }));
                  }
                }}
                onVenueSelected={(location) => {
                  setVenueLocation(location);
                  setFormData(prev => ({ ...prev, venue: location.name || location.address || '' }));
                  // Clear venue location error if exists
                  if (errors.venueLocation) {
                    setErrors(prev => ({ ...prev, venueLocation: '' }));
                  }
                }}
              />
              {errors.venue && (
                <p className="mt-1 text-sm text-red-600">{errors.venue}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional event details..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </Card>

        {/* Venue Layout */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Venue Layout Configuration</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Venue Layout (JSON) - Optional
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Provide venue layout configuration in JSON format. This will be implemented later - you can leave this empty for now.
            </p>
            <textarea
              value={venueLayoutJson}
              onChange={handleVenueLayoutChange}
              rows={8}
              placeholder='Example: {"shape": "circular", "sections": 8, "layers": 3, "exits": 4}'
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
            />
            {errors.venueLayout && (
              <p className="mt-1 text-sm text-red-600">{errors.venueLayout}</p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Leave empty to use default venue configuration
            </p>
          </div>
        </Card>

        {/* Venue Location Picker */}
        <GoogleMapPicker
          onLocationSelected={(location) => {
            setVenueLocation(location);
            // Auto-fill venue name if not already set
            if (!formData.venue && location.name) {
              setFormData(prev => ({ ...prev, venue: location.name || location.address || '' }));
            }
            // Clear venue location error if exists
            if (errors.venueLocation) {
              setErrors(prev => ({ ...prev, venueLocation: '' }));
            }
          }}
          initialLocation={venueLocation || undefined}
          title={venueLocation ? "Venue Location - Click to change" : "Select Venue Location"}
        />

        {/* Venue Layout Display */}
        {venueLocation && (
          <VenueLayoutMap
            venueLocation={venueLocation}
            title="Venue Layout & Nearby Facilities"
          />
        )}

        {/* User Authentication Error */}
        {errors.userEmail && (
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-sm font-medium">⚠️ {errors.userEmail}</span>
            </div>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                Creating Event...
              </>
            ) : (
              'Create Event & Start Simulation'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewEvent;
