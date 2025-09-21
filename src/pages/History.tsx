import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Eye, Trash2, Search, Clock, ShieldAlert, ArrowRight } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Spinner from '../components/common/Spinner';
import { useEventStore } from '../store/eventStore';
import { useAuth } from '../contexts/AuthContext';
import type { EventData } from '../types/simulation';
import { eventAPI } from '../api/apiClient';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, setEvents, setCurrentEvent, isLoading, setLoading, setError } = useEventStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch event history on component mount
  useEffect(() => {
    const fetchEventHistory = async () => {
      // Don't fetch if user is not logged in or email is not available
      if (!user?.email) {
        setLoading(false);
        setError('User not authenticated');
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await eventAPI.getEventHistory(user.email);
        
        // Debug: Log the response to see what we're getting
        console.log('API Response:', response.data);
        
        // Handle the backend response structure
        const backendEvents = response.data.data?.events || response.data.events || response.data.data || response.data;
        
        // Transform backend events to frontend EventData format
        const transformedEvents: EventData[] = Array.isArray(backendEvents) 
          ? backendEvents.map((event: any) => {
              // Normalize status to expected values
              let status: EventData['status'] = 'completed'; // Default
              if (event.status) {
                const normalizedStatus = event.status.toLowerCase();
                // Map backend status to frontend status
                if (normalizedStatus === 'created') {
                  status = 'active';
                } else if (['draft', 'processing', 'completed', 'error', 'active'].includes(normalizedStatus)) {
                  status = normalizedStatus as EventData['status'];
                }
              }

              return {
                id: event.eventId || event.id,
                name: event.name,
                dateStart: event.dateOfEventStart || event.dateStart,
                dateEnd: event.dateOfEventEnd || event.dateEnd,
                venue: event.venue || event.venueLocation?.name || event.venueLocation?.address || 'Venue location',
                description: event.description || '',
                venueLocation: event.venueLocation,
                venueLayout: event.venueLayout,
                userEmail: event.userEmail,
                status,
                createdAt: event.createdAt,
              };
            })
          : [];
        
        setEvents(transformedEvents);
      } catch (error: any) {
        console.error('Error fetching event history:', error);
        setError(error.response?.data?.message || 'Failed to fetch event history');
        setEvents([]); // Clear events on error
      } finally {
        setLoading(false);
      }
    };

    fetchEventHistory();
  }, [user?.email]);

  // Filter and sort events
  const filteredAndSortedEvents = React.useMemo(() => {
    let filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'date':
        default:
          aValue = new Date(a.dateStart).getTime();
          bValue = new Date(b.dateStart).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [events, searchTerm, sortBy, sortOrder]);

  const handleViewEvent = (event: EventData) => {
    setCurrentEvent(event);
    navigate('/dashboard', { state: { eventId: event.id } });
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Call API to delete the event
      await eventAPI.deleteEvent(eventId);
      console.log('✅ Event deleted successfully:', eventId);
      
      // Remove from local state after successful API call
      const updatedEvents = events.filter(event => event.id !== eventId);
      setEvents(updatedEvents);
      
      // Show success feedback (optional)
      setError(null);
    } catch (error: any) {
      console.error('❌ Error deleting event:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to delete event';
      
      if (error.response?.status === 404) {
        errorMessage = 'Event not found. It may have already been deleted.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this event.';
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

  const getStatusBadge = (status: EventData['status']) => {
    const statusConfig: Record<EventData['status'], { color: string; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      processing: { color: 'bg-blue-100 text-blue-800', label: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      error: { color: 'bg-red-100 text-red-800', label: 'Error' },
      active: { color: 'bg-emerald-100 text-emerald-800', label: 'Active' },
    };

    // Fallback to 'completed' if status is not recognized
    const config = statusConfig[status] || statusConfig.completed;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Spinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading event history...</p>
        </div>
      </div>
    );
  }

  // Show authentication error if user is not logged in
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <div className="text-center py-12">
            <ShieldAlert className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please sign in to view your event history
            </p>
            <Button onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event History</h1>
          <p className="mt-2 text-gray-600">
            View and manage your past event simulations
          </p>
        </div>
        <Button onClick={() => navigate('/new-event')}>
          Create New Event
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'status')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </Card>

      {/* Events List */}
      {filteredAndSortedEvents.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {events.length === 0 ? 'No Events Yet' : 'No Matching Events'}
            </h3>
            <p className="text-gray-600 mb-6">
              {events.length === 0 
                ? 'Start by creating your first event simulation'
                : 'Try adjusting your search criteria'
              }
            </p>
            {events.length === 0 && (
              <Button onClick={() => navigate('/new-event')}>
                Create Your First Event
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedEvents.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.name}
                    </h3>
                    {getStatusBadge(event.status)}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-start">
                    <Clock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Start</div>
                        <div>{new Date(event.dateStart).toLocaleString('en-MY', {
                          timeZone: 'Asia/Kuala_Lumpur',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}</div>
                      </div>
                    </div>
                    
                    <div className="hidden sm:flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    <div className="flex items-start">
                     
                      <div>
                        <div className="font-medium">End</div>
                        <div>{new Date(event.dateEnd).toLocaleString('en-MY', {
                          timeZone: 'Asia/Kuala_Lumpur',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Venue row */}
                  <div className="mt-3 flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.venue}
                  </div>
                  
                  {/* Description row */}
                  {/* <div className="mt-2 flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2" />
                    {event.description || 'No description provided'}
                  </div> */}
                  
                  
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewEvent(event)}
                    icon={Eye}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteEvent(event.id)}
                    icon={Trash2}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      {events.length > 0 && (
        <Card className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-600">
                {events.length}
              </div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.status === 'processing').length}
              </div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">
                {events.filter(e => e.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default History;
