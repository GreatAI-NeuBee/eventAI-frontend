import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Calendar, Users, MapPin } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import { useEventStore } from '../store/eventStore';
import { eventAPI } from '../api/apiClient';

const NewEvent: React.FC = () => {
  const navigate = useNavigate();
  const { addEvent, setCurrentEvent, setLoading, setError, isLoading } = useEventStore();

  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    date: '',
    venue: '',
    description: '',
  });

  const [files, setFiles] = useState<{
    ticketingData: File | null;
    venueLayout: File | null;
  }>({
    ticketingData: null,
    venueLayout: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'ticketingData' | 'venueLayout') => {
    const file = e.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [fileType]: file }));
    
    // Clear error when file is selected
    if (errors[fileType]) {
      setErrors(prev => ({ ...prev, [fileType]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.capacity || parseInt(formData.capacity) <= 0) {
      newErrors.capacity = 'Valid capacity is required';
    }

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else {
      const eventDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        newErrors.date = 'Event date cannot be in the past';
      }
    }

    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required';
    }

    if (!files.ticketingData) {
      newErrors.ticketingData = 'Ticketing data file is required';
    } else if (!files.ticketingData.name.toLowerCase().endsWith('.csv')) {
      newErrors.ticketingData = 'Ticketing data must be a CSV file';
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
      navigate('/dashboard', { state: { eventId: newEvent.id } });
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.response?.data?.message || 'Failed to create event');
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
              label="Expected Capacity"
              name="capacity"
              type="number"
              value={formData.capacity}
              onChange={handleInputChange}
              placeholder="Enter maximum capacity"
              icon={Users}
              error={errors.capacity}
              required
            />

            <Input
              label="Event Date"
              name="date"
              type="datetime-local"
              value={formData.date}
              onChange={handleInputChange}
              error={errors.date}
              required
            />

            <Input
              label="Venue"
              name="venue"
              value={formData.venue}
              onChange={handleInputChange}
              placeholder="Enter venue name"
              icon={MapPin}
              error={errors.venue}
              required
            />
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

        {/* File Uploads */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Upload</h2>
          
          <div className="space-y-6">
            {/* Ticketing Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticketing Data (CSV) *
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                      <span>Upload ticketing data</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileChange(e, 'ticketingData')}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">CSV files only</p>
                  {files.ticketingData && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ {files.ticketingData.name}
                    </p>
                  )}
                </div>
              </div>
              {errors.ticketingData && (
                <p className="mt-1 text-sm text-red-600">{errors.ticketingData}</p>
              )}
            </div>

            {/* Venue Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Layout (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                      <span>Upload venue layout</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.json"
                        onChange={(e) => handleFileChange(e, 'venueLayout')}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, or JSON files</p>
                  {files.venueLayout && (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ {files.venueLayout.name}
                    </p>
                  )}
                </div>
              </div>
              {errors.venueLayout && (
                <p className="mt-1 text-sm text-red-600">{errors.venueLayout}</p>
              )}
            </div>
          </div>
        </Card>

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
