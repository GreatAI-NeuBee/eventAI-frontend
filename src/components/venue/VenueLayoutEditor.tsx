import React, { useState, useEffect } from 'react';
import { Save, Phone, Users, MapPin, Settings } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import type { StadiumMapJSON } from '../maps/StadiumMapEditor';

interface VenueLayoutEditorProps {
  venueLayout: StadiumMapJSON;
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
}

interface GateConfig {
  capacity: number;
  picPhoneNumber: string;
  picName?: string;
}

const VenueLayoutEditor: React.FC<VenueLayoutEditorProps> = ({
  venueLayout,
  onSave,
  readOnly = false
}) => {
  const [gateConfig, setGateConfig] = useState<Record<string, GateConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleSave = () => {
    if (onSave) {
      const updatedData: VenueLayoutEditorData = {
        venueLayout,
        gateConfig
      };
      onSave(updatedData);
      setHasChanges(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Basic Malaysian phone number validation
    const phoneRegex = /^(\+?6?01[0-46-9]-*[0-9]{7,8}|01[0-46-9]-*[0-9]{7,8})$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
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
                      <p className="text-sm text-gray-500">
                        Position: ({exit.position[0].toFixed(1)}, {exit.position[1].toFixed(1)})
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Gate #{index + 1}
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
        {venueLayout.zones?.map((zone, index) => (
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
        {venueLayout.exitsList?.map((exit, index) => (
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

