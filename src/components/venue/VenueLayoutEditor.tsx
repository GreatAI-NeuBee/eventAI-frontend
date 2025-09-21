import React, { useState, useEffect } from 'react';
import { Save, Phone, Users, MapPin, Settings, Upload, FileText, ExternalLink, CheckCircle, Bot } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import FileUpload from '../common/FileUpload';
import type { StadiumMapJSON } from '../maps/StadiumMapEditor';
import { FileUploadResult, ComprehendAnalysis } from '../../services/awsDirectService';
import { eventAPI } from '../../api/apiClient';

interface VenueLayoutEditorProps {
  venueLayout: StadiumMapJSON;
  eventId?: string; // Add eventId for file uploads
  onSave?: (updatedLayout: VenueLayoutEditorData) => void;
  readOnly?: boolean;
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
    analyses: ComprehendAnalysis[];
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
  readOnly = false
}) => {
  const [gateConfig, setGateConfig] = useState<Record<string, GateConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [attachments, setAttachments] = useState<{
    links: string[];
    context: string;
    analyses: ComprehendAnalysis[];
  }>({ links: [], context: '', analyses: [] });
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
          console.log('✅ Attachments saved to backend');
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
        analyses: result.analysisResult 
          ? [...prev.analyses, result.analysisResult as ComprehendAnalysis]
          : prev.analyses,
        context: prev.context + (result.analysisResult 
          ? `\n\nFile: ${result.fileUrl}\nAnalysis: ${(result.analysisResult as ComprehendAnalysis).summary}`
          : `\n\nFile: ${result.fileUrl}`)
      }));
      setHasChanges(true);
    }
  };

  const removeAttachment = (linkToRemove: string) => {
    setAttachments(prev => {
      const linkIndex = prev.links.indexOf(linkToRemove);
      return {
        links: prev.links.filter(link => link !== linkToRemove),
        analyses: linkIndex >= 0 
          ? prev.analyses.filter((_, index) => index !== linkIndex)
          : prev.analyses,
        context: prev.context.replace(new RegExp(`\\n\\nFile: ${linkToRemove}[^\\n]*(?:\\nAnalysis: [^\\n]*)?`, 'g'), '')
      };
    });
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
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p>No venue layout configured for this event.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Venue Layout Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Venue Layout Configuration
            </h3>
            <p className="text-sm text-gray-600 mt-1">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{venueLayout.sections}</div>
            <div className="text-sm text-gray-600">Sections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{venueLayout.layers}</div>
            <div className="text-sm text-gray-600">Layers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{venueLayout.exits}</div>
            <div className="text-sm text-gray-600">Exits/Gates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {venueLayout.toiletsList?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Facilities</div>
          </div>
        </div>

        {/* Venue Layout Visualization */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Layout Visualization</h4>
          <div className="border rounded-lg p-4 bg-white">
            <VenueLayoutVisualization venueLayout={venueLayout} />
          </div>
        </div>
      </Card>

      {/* Gate Configuration */}
      {venueLayout.exitsList && venueLayout.exitsList.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gate Configuration ({venueLayout.exitsList.length} gates)
          </h4>
          <div className="space-y-4">
            {venueLayout.exitsList.map((exit, index) => {
              const config = gateConfig[exit.id] || { capacity: 800, picPhoneNumber: '', picName: '' };
              const isPhoneValid = !config.picPhoneNumber || validatePhoneNumber(config.picPhoneNumber);
              
              return (
                <div key={exit.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900">{exit.name}</h5>
                      
                    </div>
                    <div className="text-sm text-gray-500">
                      Gate #{index + 1}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Update Button */}
                    <div className="md:col-span-3 flex justify-end mb-4">
                      <Button
                        onClick={() => handleUpdateGate(exit.id, exit.name)}
                        disabled={readOnly || !config.picPhoneNumber || !validatePhoneNumber(config.picPhoneNumber)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Users className="h-4 w-4 inline mr-1" />
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
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="800"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        ~{Math.round((config.capacity || 800) / 60)} people/minute
                      </p>
                    </div>

                    {/* PIC Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PIC Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={config.picName || ''}
                        onChange={(e) => updateGateConfig(exit.id, 'picName', e.target.value)}
                        disabled={readOnly}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Phone Number Configuration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Phone className="h-4 w-4 inline mr-1" />
                        PIC Phone Number
                      </label>
                      <input
                        type="tel"
                        value={config.picPhoneNumber}
                        onChange={(e) => updateGateConfig(exit.id, 'picPhoneNumber', e.target.value)}
                        disabled={readOnly}
                        className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 disabled:bg-gray-100 ${
                          isPhoneValid 
                            ? 'border-gray-300 focus:border-primary-500 focus:ring-primary-500' 
                            : 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        }`}
                        placeholder="+60123456789"
                      />
                      {!isPhoneValid && (
                        <p className="text-xs text-red-600 mt-1">
                          Please enter a valid Malaysian phone number
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        WhatsApp number for gate notifications
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
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
          </div>
        </Card>
      )}

      {/* File Upload Section */}
      {eventId && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Event Documents & Files
          </h4>
          <p className="text-sm text-gray-600 mb-6">
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
          />

          {/* Uploaded Files List */}
          {attachments.links.length > 0 && (
            <div className="space-y-4">
              <h5 className="font-medium text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Uploaded Files ({attachments.links.length})
              </h5>
              
              <div className="space-y-2">
                {attachments.links.map((link, index) => {
                  const fileName = link.split('/').pop() || 'Unknown file';
                  const analysis = attachments.analyses[index];
                  
                  return (
                    <div key={link} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h6 className="text-sm font-medium text-gray-900 truncate">
                            {fileName}
                          </h6>
                          <div className="flex items-center space-x-2">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </a>
                            {!readOnly && (
                              <button
                                onClick={() => removeAttachment(link)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {analysis && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                            <p className="text-blue-800 font-medium">AI Analysis:</p>
                            <p className="text-blue-700 mt-1">{analysis.summary}</p>
                            
                            {analysis.keyPhrases.length > 0 && (
                              <div className="mt-2">
                                <span className="text-blue-800 font-medium">Key Topics: </span>
                                <span className="text-blue-700">
                                  {analysis.keyPhrases.slice(0, 3).map(kp => kp.text).join(', ')}
                                </span>
                              </div>
                            )}
                            
                            {analysis.entities.length > 0 && (
                              <div className="mt-1">
                                <span className="text-blue-800 font-medium">Entities: </span>
                                <span className="text-blue-700">
                                  {analysis.entities.slice(0, 3).map(e => e.text).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combined Analysis Summary */}
              {attachments.analyses.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <h5 className="font-medium text-green-900 mb-2">Document Analysis Summary</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-green-800">Total Documents:</span>
                      <span className="ml-2 text-green-700">{attachments.links.length}</span>
                    </div>
                    <div>
                      <span className="font-medium text-green-800">Analysis Status:</span>
                      <span className="ml-2 text-green-700">
                        {attachments.analyses.length} analyzed
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-green-800">Common Themes:</span>
                      <span className="ml-2 text-green-700">
                        {[...new Set(attachments.analyses.flatMap(a => a.keyPhrases.slice(0, 2).map(kp => kp.text)))]
                          .slice(0, 5).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="font-medium text-blue-900 mb-2">💡 Tips for Better Analysis</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload event procedures, safety protocols, or workflow documents</li>
              <li>• Include floor plans, capacity charts, or operational guidelines</li>
              <li>• Text-based files (PDF, Word, Excel) provide the best analysis results</li>
              <li>• Our AI will extract key information to improve event recommendations</li>
            </ul>
          </div>
        </Card>
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

