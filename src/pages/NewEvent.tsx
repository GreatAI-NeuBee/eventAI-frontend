import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import TimeSelector from '../components/common/TimeSelector';
import VenueSearchInput from '../components/maps/VenueSearchInput';
import { useEventStore } from '../store/eventStore';
import { eventAPI } from '../api/apiClient';
import StadiumMapEditor from "../components/maps/StadiumMapEditor";
import type { StadiumMapJSON } from '../components/maps/StadiumMapEditor';
import { useAuth } from '../contexts/AuthContext';
import { DesignInCanvaCTA } from '../components/DesignInCanvaCTA';

const NewEvent: React.FC = () => {
  // SVG upload functionality moved to VenueLayoutEditor
  const navigate = useNavigate();
  const { addEvent, setCurrentEvent, setLoading, setError, isLoading } = useEventStore();
  const { user, backendUser, backendUserLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    eventDate: '',
    startTime: '',
    endTime: '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleVenueLayoutChange = (venueLayoutData: StadiumMapJSON) => {
    setVenueLayoutJson(venueLayoutData);
    if (errors.venueLayout) setErrors(prev => ({ ...prev, venueLayout: '' }));
  };


  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Event name is required';

    if (!formData.eventDate) {
      newErrors.eventDate = 'Event date is required';
    } else {
      const eventDate = new Date(formData.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) newErrors.eventDate = 'Event date cannot be in the past';
    }

    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (formData.startTime && formData.endTime) {
      const [sh, sm] = formData.startTime.split(':').map(Number);
      const [eh, em] = formData.endTime.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) newErrors.endTime = 'End time must be after start time';
    }

    if (!formData.venue.trim()) newErrors.venue = 'Venue is required';
    if (venueLayoutJson && venueLayoutJson.sections === 0) newErrors.venueLayout = 'Venue layout must have at least one section';
    if (!venueLocation) newErrors.venueLocation = 'Please select a venue location on the map';
    if (!user?.email) newErrors.userEmail = 'You must be logged in to create an event';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (backendUserLoading) {
      setError('Account setup in progress. Please wait a moment and try again.');
      return;
    }
    if (!backendUser) {
      setError('Account setup incomplete. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateOfEventStart = `${formData.eventDate}T${formData.startTime}:00Z`;
      const dateOfEventEnd = `${formData.eventDate}T${formData.endTime}:00Z`;
      
      const submitData: any = {
        name: formData.name,
        dateOfEventStart,
        dateOfEventEnd,
        venue: formData.venue,
        description: formData.description,
        userEmail: user?.email,
        venueLocation: venueLocation || undefined,
        venueLayout: venueLayoutJson || undefined,
      };

      console.log('🚀 Submitting event data to API...');
      console.log('📝 JSON payload:', submitData);
      
      const response = await eventAPI.createEvent(submitData);
      const backendEvent = response.data.data || response.data;

      let status: 'draft' | 'processing' | 'completed' | 'error' | 'active' = 'active';
      if (backendEvent.status) {
        const normalized = String(backendEvent.status).toLowerCase();
        if (normalized === 'created') status = 'active';
        else if (['draft', 'processing', 'completed', 'error', 'active'].includes(normalized)) {
          status = normalized as typeof status;
        }
      }

      const newEvent = {
        id: backendEvent.eventId || backendEvent.id,
        name: backendEvent.name || formData.name,
        dateStart: backendEvent.dateOfEventStart || dateOfEventStart,
        dateEnd: backendEvent.dateOfEventEnd || dateOfEventEnd,
        venue: backendEvent.venue || venueLocation?.name || venueLocation?.address || 'Event Venue',
        description: backendEvent.description || formData.description,
        venueLocation: venueLocation || undefined,
        venueLayout: venueLayoutJson || null,
        userEmail: backendEvent.userEmail || submitData.userEmail,
        status,
        createdAt: backendEvent.createdAt || new Date().toISOString(),
      };

      addEvent(newEvent);
      setCurrentEvent(newEvent);
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
              label="Event Date"
              name="eventDate"
              type="date"
              value={formData.eventDate}
              onChange={handleInputChange}
              error={errors.eventDate}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Time Range *
              </label>
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <TimeSelector
                    value={formData.startTime}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, startTime: value }));
                      if (errors.startTime) setErrors(prev => ({ ...prev, startTime: '' }));
                    }}
                    placeholder="Select start time"
                    error={!!(errors.startTime || errors.endTime)}
                    name="startTime"
                  />
                </div>
                <div className="flex-shrink-0 text-gray-500 font-medium">
                  to
                </div>
                <div className="flex-1">
                  <TimeSelector
                    value={formData.endTime}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, endTime: value }));
                      if (errors.endTime) setErrors(prev => ({ ...prev, endTime: '' }));
                    }}
                    placeholder="Select end time"
                    error={!!(errors.startTime || errors.endTime)}
                    name="endTime"
                  />
                </div>
              </div>
              {(errors.startTime || errors.endTime) && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.startTime || errors.endTime}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue *
              </label>
              <VenueSearchInput
                placeholder="Search for venue (e.g., Stadium Bukit Jalil)"
                value={formData.venue}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, venue: value }));
                  if (errors.venue) setErrors(prev => ({ ...prev, venue: '' }));
                }}
                onVenueSelected={(location) => {
                  setVenueLocation(location);
                  setFormData(prev => ({ ...prev, venue: location.name || location.address || '' }));
                  if (errors.venueLocation) setErrors(prev => ({ ...prev, venueLocation: '' }));
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

        {/* Venue Layout Builder */}
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
                    ✓ {venueLayoutJson.sections} sections, {venueLayoutJson.exits}/7 exits
                  </div>
                  {venueLayoutJson.exits >= 7 && (
                    <div className="text-orange-600 text-xs">
                      ⚠️ Maximum exits reached
                    </div>
                  )}
                  {venueLayoutJson.toiletsList && venueLayoutJson.toiletsList.length > 0 && (
                    <div className="text-blue-600 text-xs">
                      + {venueLayoutJson.toiletsList.length} facilities
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
          </div>
          <StadiumMapEditor 
            initialLayers={2} 
            maxExits={7}
            onChange={handleVenueLayoutChange}
          />
          
          {/* Canva Design Workflow Info */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-semibold">💡</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Design in Canva</h3>
                <p className="text-sm text-blue-700 mb-2">
                  For more complex layouts, design your venue in Canva and import it back. 
                  Use the template above as a starting point. You can export as SVG or PNG (circles/rectangles only).
                </p>
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <span>1. Design in Canva</span>
                  <span>→</span>
                  <span>2. Add metadata</span>
                  <span>→</span>
                  <span>3. Upload back</span>
                </div>
              </div>
            </div>
          </div>
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

            <Button
              type="submit"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Event...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewEvent;
