import React, { useState, useEffect, useContext } from 'react';
import { Save, Phone, Users, MapPin, Settings, Upload, FileText, ExternalLink, CheckCircle, Bot } from 'lucide-react';
import StaticGlassCard from '../common/StaticGlassCard';
import Button from '../common/Button';
import FileUpload from '../common/FileUpload';
import type { StadiumMapJSON } from '../maps/StadiumMapEditor';
import { eventAPI } from '../../api/apiClient';
import { WeatherContext } from '../common/WeatherBackground';

// Updated interfaces without AWS dependencies
interface FileUploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

interface VenueLayoutEditorProps {
  venueLayout: StadiumMapJSON;
  eventId?: string; // Add eventId for file uploads
  onSave?: (updatedLayout: VenueLayoutEditorData) => void;
  readOnly?: boolean;
  existingAttachmentUrls?: string[]; // Existing attachment URLs from backend
  existingAttachmentFilenames?: string[]; // Existing attachment filenames from backend
}

export interface VenueLayoutEditorData {
  venueLayout: StadiumMapJSON;
  gateConfig: {
    [exitId: string]: {
      capacity: number;
      picPhoneNumber: string;
      picName?: string;
    };
  };
  attachments?: {
    links: string[];
    context: string;
  };
}

interface GateConfig {
  capacity: number;
  picPhoneNumber: string;
  picName?: string;
}

const VenueLayoutEditor: React.FC<VenueLayoutEditorProps> = ({
  venueLayout,
  eventId,
  onSave,
  readOnly = false,
  existingAttachmentUrls = [],
  existingAttachmentFilenames = []
}) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  // Determine text colors based on weather background
  const getTextColor = () => {
    if (isDarkBackground || isRainBackground) return 'text-white'; // Storm/Rain - white text
    return 'text-gray-900'; // Clear/Sunny/Cloudy - dark text
  };
  
  const getSecondaryTextColor = () => {
    if (isDarkBackground || isRainBackground) return 'text-white/80'; // Storm/Rain
    return 'text-gray-700'; // Clear/Sunny/Cloudy
  };
  
  const getIconColor = () => {
    if (isDarkBackground || isRainBackground) return 'text-white/80'; // Storm/Rain
    return 'text-gray-600'; // Clear/Sunny/Cloudy
  };
  const [gateConfig, setGateConfig] = useState<Record<string, GateConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [attachments, setAttachments] = useState<{
    links: string[];
    context: string;
  }>({ links: [], context: '' });

  // Combine existing and newly uploaded attachments for display
  const allAttachmentUrls = [...existingAttachmentUrls, ...attachments.links];
  const allAttachmentFilenames = [
    ...existingAttachmentFilenames,
    ...attachments.links.map(url => url.split('/').pop() || 'Uploaded file')
  ];
  const [showUpdateNotification, setShowUpdateNotification] = useState<{
    show: boolean;
    gateName: string;
    picName: string;
    picPhone: string;
  }>({ show: false, gateName: '', picName: '', picPhone: '' });

  // Initialize gate configuration from venue layout
  useEffect(() => {
    if (venueLayout?.exitsList) {
      const initialConfig: Record<string, GateConfig> = {};
      venueLayout.exitsList.forEach(exit => {
        initialConfig[exit.id] = {
          capacity: exit.capacity || 800,
          picPhoneNumber: '',
          picName: ''
        };
      });
      setGateConfig(initialConfig);
    }
  }, [venueLayout]);

  const updateGateConfig = (exitId: string, field: keyof GateConfig, value: string | number) => {
    setGateConfig(prev => ({
      ...prev,
      [exitId]: {
        ...prev[exitId],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (onSave) {
      const updatedData: VenueLayoutEditorData = {
        venueLayout,
        gateConfig,
        attachments
      };
      onSave(updatedData);
      setHasChanges(false);

      // Also save attachments to backend if eventId is provided
      if (eventId && attachments.links.length > 0) {
        try {
          await eventAPI.updateEventAttachments(eventId, {
            attachmentLinks: attachments.links,
            attachmentContext: attachments.context
          });
        } catch (error) {
          console.error('❌ Failed to save attachments to backend:', error);
        }
      }
    }
  };

  const handleFileUploaded = (result: FileUploadResult) => {
    if (result.success && result.fileUrl) {
      setAttachments(prev => ({
        links: [...prev.links, result.fileUrl!],
        context: prev.context + `\n\nFile: ${result.fileName || 'uploaded file'} - ${result.fileUrl}`
      }));
      setHasChanges(true);
    }
  };

  const removeAttachment = (linkToRemove: string) => {
    // Only allow removing newly uploaded files, not existing ones
    const isExistingFile = existingAttachmentUrls.includes(linkToRemove);
    
    if (isExistingFile) {
      console.warn('Cannot remove existing attachments from frontend');
      return;
    }
    
    setAttachments(prev => ({
      links: prev.links.filter(link => link !== linkToRemove),
      context: prev.context.replace(new RegExp(`\\n\\nFile: .*${linkToRemove}.*`, 'g'), '')
    }));
    setHasChanges(true);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Basic Malaysian phone number validation
    const phoneRegex = /^(\+?6?01[0-46-9]-*[0-9]{7,8}|01[0-46-9]-*[0-9]{7,8})$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  };

  const handleUpdateGate = (exitId: string, exitName: string) => {
    const config = gateConfig[exitId];
    if (!config) return;

    // Validate required fields
    if (!config.picPhoneNumber || !validatePhoneNumber(config.picPhoneNumber)) {
      alert('Please enter a valid phone number before updating.');
      return;
    }

    // Show success notification
    setShowUpdateNotification({
      show: true,
      gateName: exitName,
      picName: config.picName || 'PIC',
      picPhone: config.picPhoneNumber
    });

    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowUpdateNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  if (!venueLayout) {
    return (
      <StaticGlassCard intensity="medium" blur="md">
        <div className="text-center text-white/70">
          <MapPin className="mx-auto h-12 w-12 text-white/60 mb-3" />
          <p className="text-white/80">No venue layout configured for this event.</p>
        </div>
      </StaticGlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Venue Layout Summary */}
      <StaticGlassCard intensity="medium" blur="md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold ${getTextColor()} flex items-center gap-2`}>
              <Settings className={`h-5 w-5 ${getIconColor()}`} />
              Venue Layout Configuration
            </h3>
            <p className={`text-sm ${getSecondaryTextColor()} mt-1`}>
              Configure capacity and assign person-in-charge for each gate
            </p>
          </div>
          {!readOnly && hasChanges && (
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          )}
        </div>

        {/* Venue Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-300">{venueLayout.sections}</div>
            <div className={`text-sm ${getSecondaryTextColor()}`}>Sections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-300">{venueLayout.layers}</div>
            <div className={`text-sm ${getSecondaryTextColor()}`}>Layers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-300">{venueLayout.exits}</div>
            <div className={`text-sm ${getSecondaryTextColor()}`}>Exits/Gates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-300">
              {venueLayout.toiletsList?.length || 0}
            </div>
            <div className={`text-sm ${getSecondaryTextColor()}`}>Facilities</div>
          </div>
        </div>

        {/* Venue Layout Visualization */}
        <div className="mb-6">
          <h4 className={`text-md font-medium ${getTextColor()} mb-3`}>Layout Visualization</h4>
          <div className="border border-white/30 rounded-lg p-4 bg-white/10 backdrop-blur-sm">
            <VenueLayoutVisualization venueLayout={venueLayout} />
          </div>
        </div>
      </StaticGlassCard>

      {/* Gate Configuration */}
      {venueLayout.exitsList && venueLayout.exitsList.length > 0 && (
        <StaticGlassCard intensity="medium" blur="md">
          <h4 className={`text-lg font-semibold ${getTextColor()} mb-4 flex items-center gap-2`}>
            <Users className={`h-5 w-5 ${getIconColor()}`} />
            Gate Configuration ({venueLayout.exitsList.length} gates)
          </h4>
          <div className="space-y-4">
            {venueLayout.exitsList.map((exit, index) => {
              const config = gateConfig[exit.id] || { capacity: 800, picPhoneNumber: '', picName: '' };
              const isPhoneValid = !config.picPhoneNumber || validatePhoneNumber(config.picPhoneNumber);
              
              return (
                <div key={exit.id} className="p-4 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className={`font-medium ${getTextColor()}`}>{exit.name}</h5>
                      
                    </div>
                    <div className={`text-sm ${getSecondaryTextColor()}`}>
                      Gate #{index + 1}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Update Button */}
                    <div className="md:col-span-3 flex justify-end mb-4">
                      <Button
                        onClick={() => handleUpdateGate(exit.id, exit.name)}
                        disabled={readOnly || !config.picPhoneNumber || !validatePhoneNumber(config.picPhoneNumber)}
                        className="flex items-center gap-2 disabled:bg-gray-400"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Update PIC
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Capacity Configuration */}
                    <div>
                      <label className={`block text-sm font-medium ${getSecondaryTextColor()} mb-1`}>
                        <Users className={`h-4 w-4 inline mr-1 ${getIconColor()}`} />
                        Capacity (people/hour)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={config.capacity || ''}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '') {
                            // Allow empty string temporarily while user is typing
                            updateGateConfig(exit.id, 'capacity', '' as any);
                          } else {
                            const parsed = parseInt(inputValue, 10);
                            const value = Number.isFinite(parsed) ? Math.max(0, parsed) : 800;
                            updateGateConfig(exit.id, 'capacity', value);
                          }
                        }}
                        onBlur={(e) => {
                          // On blur, ensure we have a valid number
                          const inputValue = e.target.value;
                          const parsed = parseInt(inputValue, 10);
                          const value = Number.isFinite(parsed) && parsed > 0 ? parsed : 800;
                          updateGateConfig(exit.id, 'capacity', value);
                        }}
                        disabled={readOnly}
                        className={`block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                          isDarkBackground 
                            ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100'
                        }`}
                        placeholder="800"
                      />
                      <p className={`text-xs ${getSecondaryTextColor()} mt-1`}>
                        ~{Math.round((config.capacity || 800) / 60)} people/minute
                      </p>
                    </div>

                    {/* PIC Name */}
                    <div>
                      <label className={`block text-sm font-medium ${getSecondaryTextColor()} mb-1`}>
                        PIC Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={config.picName || ''}
                        onChange={(e) => updateGateConfig(exit.id, 'picName', e.target.value)}
                        disabled={readOnly}
                        className={`block w-full rounded-lg border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                          isDarkBackground 
                            ? 'bg-white/10 border-white/20 text-white placeholder:text-white/60' 
                            : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100'
                        }`}
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Phone Number Configuration */}
                    <div>
                      <label className={`block text-sm font-medium ${getSecondaryTextColor()} mb-1`}>
                        <Phone className={`h-4 w-4 inline mr-1 ${getIconColor()}`} />
                        PIC Phone Number
                      </label>
                      <input
                        type="tel"
                        value={config.picPhoneNumber}
                        onChange={(e) => updateGateConfig(exit.id, 'picPhoneNumber', e.target.value)}
                        disabled={readOnly}
                        className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                          isDarkBackground 
                            ? `bg-white/10 border-white/20 text-white placeholder:text-white/60 ${!isPhoneValid ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'focus:border-primary-500 focus:ring-primary-500'}` 
                            : `bg-white text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 ${isPhoneValid ? 'border-gray-300 focus:border-primary-500 focus:ring-primary-500' : 'border-red-300 focus:border-red-500 focus:ring-red-500'}`
                        }`}
                        placeholder="+60123456789"
                      />
                      {!isPhoneValid && (
                        <p className="text-xs text-red-600 mt-1">
                          Please enter a valid Malaysian phone number
                        </p>
                      )}
                      <p className={`text-xs ${getSecondaryTextColor()} mt-1`}>
                        WhatsApp number for gate notifications
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration Summary */}
          {/* <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">Configuration Summary</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Total Capacity:</span>
                <span className="ml-2 text-blue-700">
                  {Object.values(gateConfig).reduce((sum, config) => sum + config.capacity, 0).toLocaleString()} people/hour
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Configured Gates:</span>
                <span className="ml-2 text-blue-700">
                  {Object.values(gateConfig).filter(config => config.picPhoneNumber).length} / {venueLayout.exitsList.length}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">WhatsApp Ready:</span>
                <span className="ml-2 text-blue-700">
                  {Object.values(gateConfig).filter(config => 
                    config.picPhoneNumber && validatePhoneNumber(config.picPhoneNumber)
                  ).length} gates
                </span>
              </div>
            </div>
          </div> */}
        </StaticGlassCard>
      )}

      {/* File Upload Section */}
      {eventId && (
        <StaticGlassCard intensity="medium" blur="md">
          <h4 className={`text-lg font-semibold ${getTextColor()} mb-4 flex items-center gap-2`}>
            <Upload className={`h-5 w-5 ${getIconColor()}`} />
            Event Documents & Files
          </h4>
          <p className={`text-sm ${getSecondaryTextColor()} mb-6`}>
            Upload relevant documents such as workflows, procedures, floor plans, or any other files related to your event. 
            Our AI will analyze the content to provide better insights and recommendations.
          </p>

          {/* File Upload Component */}
          <FileUpload
            eventId={eventId}
            onFileUploaded={handleFileUploaded}
            disabled={readOnly}
            maxFiles={5}
            className="mb-6"
            existingFiles={{
              urls: existingAttachmentUrls,
              filenames: existingAttachmentFilenames
            }}
          />

          {/* All Files List (Existing + New) */}
          {allAttachmentUrls.length > 0 && (
            <div className="space-y-4">
              <h5 className={`font-medium ${getTextColor()} flex items-center gap-2`}>
                <FileText className={`h-4 w-4 ${getIconColor()}`} />
                Documents ({allAttachmentUrls.length})
              </h5>
              
              <div className="space-y-2">
                {allAttachmentUrls.map((link, index) => {
                  const fileName = allAttachmentFilenames[index] || 'Unknown file';
                  const isExistingFile = existingAttachmentUrls.includes(link);
                  
                  return (
                    <div key={link} className="flex items-start space-x-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                      <FileText className="h-5 w-5 text-blue-300 mt-0.5" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h6 className={`text-sm font-medium ${getTextColor()} truncate`}>
                              {fileName}
                            </h6>
                            {isExistingFile && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-400/30 text-blue-100 border border-blue-300/40">
                                Existing
                              </span>
                            )}
                            {!isExistingFile && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-400/30 text-green-100 border border-green-300/40">
                                New
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 hover:text-blue-100 text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </a>
                            {!readOnly && !isExistingFile && (
                              <button
                                onClick={() => removeAttachment(link)}
                                className="text-red-600 hover:text-red-800 text-sm"
                                title="Remove newly uploaded file"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </StaticGlassCard>
      )}

      {/* Modern Update Notification Popup */}
      {showUpdateNotification.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-white bg-opacity-20">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 animate-in">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Bot className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                🤖 AI Chatbot Linked!
              </h3>
              
              {/* Success Message */}
              <div className="text-center space-y-3 mb-6">
                <p className="text-gray-600">
                  <strong>{showUpdateNotification.picName}</strong> at <strong>{showUpdateNotification.gateName}</strong> has been successfully linked to our AI chatbot.
                </p>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-center space-x-2 text-sm text-green-800">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">{showUpdateNotification.picPhone}</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1 text-center">
                    Will receive WhatsApp notifications and AI assistance during the event
                  </p>
                </div>
              </div>
              
              {/* Features List */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-blue-900 mb-2">✨ AI Chatbot Features:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Real-time crowd density alerts</li>
                  <li>• Emergency response guidance</li>
                  <li>• Gate capacity monitoring</li>
                  <li>• Instant communication with event control</li>
                </ul>
              </div>
              
              {/* Close Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowUpdateNotification(prev => ({ ...prev, show: false }))}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-medium"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Got it!
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple venue layout visualization component
const VenueLayoutVisualization: React.FC<{ venueLayout: StadiumMapJSON }> = ({ venueLayout }) => {
  const vbW = 100;
  const vbH = 62.5;

  return (
    <div className="w-full h-64 bg-gray-50 rounded-lg overflow-hidden">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {/* Render zones */}
        {venueLayout.zones?.map((zone) => (
          <g key={zone.id}>
            <polygon
              points={zone.points.map(p => `${p[0]},${p[1]}`).join(' ')}
              fill="rgba(59,130,246,0.2)"
              stroke="#2563eb"
              strokeWidth="0.3"
            />
            <text
              x={zone.points.reduce((sum, p) => sum + p[0], 0) / zone.points.length}
              y={zone.points.reduce((sum, p) => sum + p[1], 0) / zone.points.length}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="1.5"
              fill="#1e40af"
              fontWeight="bold"
            >
              {zone.name}
            </text>
          </g>
        ))}

        {/* Render exits */}
        {venueLayout.exitsList?.map((exit) => (
          <g key={exit.id}>
            <circle
              cx={exit.position[0]}
              cy={exit.position[1]}
              r="1.5"
              fill="#ef4444"
              stroke="#dc2626"
              strokeWidth="0.2"
            />
            <text
              x={exit.position[0]}
              y={exit.position[1] - 2.5}
              textAnchor="middle"
              fontSize="1.2"
              fill="#dc2626"
              fontWeight="bold"
            >
              {exit.name}
            </text>
          </g>
        ))}

        {/* Render toilets */}
        {venueLayout.toiletsList?.map((toilet) => (
          <text
            key={toilet.id}
            x={toilet.position[0]}
            y={toilet.position[1]}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="2"
          >
            🚻
          </text>
        ))}
      </svg>
    </div>
  );
};

export default VenueLayoutEditor;

