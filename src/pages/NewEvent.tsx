import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import VenueSearchInput from '../components/maps/VenueSearchInput';
import { useEventStore } from '../store/eventStore';
import { eventAPI } from '../api/apiClient';
import StadiumMapEditor from "../components/maps/StadiumMapEditor";
import type { StadiumMapJSON } from '../components/maps/StadiumMapEditor';
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

  const [venueLayoutJson, setVenueLayoutJson] = useState<StadiumMapJSON | null>(null);

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

  const handleVenueLayoutChange = (venueLayoutData: StadiumMapJSON) => {
    setVenueLayoutJson(venueLayoutData);
    
    // Clear error when layout is updated
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

    // Venue layout validation (optional but if provided should have at least 1 section)
    if (venueLayoutJson && venueLayoutJson.sections === 0) {
      newErrors.venueLayout = 'Venue layout must have at least one section';
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
      
      // Include venue layout JSON if available
      if (venueLayoutJson) {
        submitData.venueLayout = venueLayoutJson;
        console.log('📍 Including venue layout with', venueLayoutJson.sections, 'sections,', venueLayoutJson.exits, 'exits, and', venueLayoutJson.toiletsList?.length || 0, 'toilets');
      } else {
        console.log('📍 No venue layout configured for this event');
      }

      // Debug: Log the JSON data being submitted
      console.log('🚀 Submitting event data to API...');
      console.log('📝 JSON payload:', submitData);
      
      const response = await eventAPI.createEvent(submitData);
      console.log('✅ Event created successfully:', response.data);
      
      // Transform backend response to frontend EventData format
      const backendEvent = response.data.data || response.data;
      
      // Map backend status to frontend status
      let status: 'draft' | 'processing' | 'completed' | 'error' | 'active' = 'active';
      if (backendEvent.status) {
        const normalizedStatus = backendEvent.status.toLowerCase();
        if (normalizedStatus === 'created') {
          status = 'active';
        } else if (['draft', 'processing', 'completed', 'error', 'active'].includes(normalizedStatus)) {
          status = normalizedStatus as typeof status;
        }
      }
      
      const newEvent = {
        id: backendEvent.eventId || backendEvent.id,
        name: backendEvent.name || formData.name,
        dateStart: backendEvent.dateOfEventStart || submitData.dateOfEventStart,
        dateEnd: backendEvent.dateOfEventEnd || submitData.dateOfEventEnd,
        venue: backendEvent.venue || venueLocation?.name || venueLocation?.address || 'Event Venue',
        description: backendEvent.description || formData.description,
        venueLocation: venueLocation || undefined,
        venueLayout: venueLayoutJson || null,
        userEmail: backendEvent.userEmail || submitData.userEmail,
        status,
        createdAt: backendEvent.createdAt || new Date().toISOString(),
      };

      // Add event to store
      addEvent(newEvent);
      setCurrentEvent(newEvent);

      // Navigate to dashboard
      navigate(`/event/${newEvent.id}`);
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
                placeholder="Search for venue (e.g., Stadium Bukit Jalil)"
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

       
        {/* User Authentication Error */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Venue Layout Builder</h2>
              <p className="text-sm text-gray-600 mt-1">Design your venue sections and exits</p>
            </div>
            <div className="text-right">
              {venueLayoutJson ? (
                <div className="text-sm space-y-1">
                  <div className="text-green-600 font-medium">
                    ✓ {venueLayoutJson.sections} sections, {venueLayoutJson.exits} exits
                  </div>
                  {venueLayoutJson.toiletsList && venueLayoutJson.toiletsList.length > 0 && (
                    <div className="text-blue-600 text-xs">
                      + {venueLayoutJson.toiletsList.length} facilities
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No layout configured
                </div>
              )}
            </div>
          </div>
          <StadiumMapEditor 
            initialLayers={2} 
            onChange={handleVenueLayoutChange}
          />
        </Card>
        
        {errors.userEmail && (
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-sm font-medium">⚠️ {errors.userEmail}</span>
            </div>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
          
          <div className="flex space-x-4">
            {/* <Button
              type="button"
              variant="outline"
              onClick={async (e) => {
                e.preventDefault();
                // Navigate to dashboard to run forecast
                if (validateForm()) {
                  setLoading(true);
                  setError(null);

                  try {
                    // Create FormData for file upload
                    const submitData = new FormData();
                    submitData.append('name', formData.name);
                    submitData.append('capacity', formData.capacity);
                    submitData.append('date', formData.date);
                    submitData.append('venue', formData.venue);
                    submitData.append('description', formData.description);
                    
                    if (files.ticketingData) {
                      submitData.append('ticketingData', files.ticketingData);
                    }
                    
                    if (files.venueLayout) {
                      submitData.append('venueLayout', files.venueLayout);
                    }

                    const response = await eventAPI.createEvent(submitData);
                    const newEvent = response.data;

                    // Add event to store
                    addEvent(newEvent);
                    setCurrentEvent(newEvent);

                    // Navigate to dashboard
                    navigate(`/event/${newEvent.id}`);
                  } catch (error: any) {
                    console.error('Error creating event:', error);
                    setError(error.response?.data?.message || 'Failed to create event');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={isLoading}
            >
              Create Event & Run Forecast
            </Button> */}
            
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
                'Create Event'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewEvent;
