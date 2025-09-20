import React, { useState, useCallback } from 'react';
import { Settings, Eye, EyeOff, RotateCcw, Palette, Car, Square, Circle } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import type { VenueConfiguration, VenuePreset } from '../../types/venueTypes';
import { DEFAULT_STADIUM_CONFIG, VENUE_PRESETS } from '../../types/venueTypes';

interface VenueConfigEditorProps {
  config: VenueConfiguration;
  onChange: (config: VenueConfiguration) => void;
  onPreview?: (config: VenueConfiguration) => void;
}

const VenueConfigEditor: React.FC<VenueConfigEditorProps> = ({
  config,
  onChange
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Update configuration with validation
  const updateConfig = useCallback((updates: Partial<VenueConfiguration>) => {
    const newConfig = { ...config, ...updates };
    onChange(newConfig);
  }, [config, onChange]);

  // Load preset configuration
  const loadPreset = (preset: VenuePreset) => {
    onChange({ ...preset.configuration });
  };

  // Reset to default
  const resetToDefault = () => {
    onChange(DEFAULT_STADIUM_CONFIG);
  };

  if (isMinimized) {
    return (
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Venue Configuration</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(false)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Venue Configuration</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(true)}
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>

      {/* Preset Templates */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Templates
        </label>
        <div className="flex flex-wrap gap-2">
          {VENUE_PRESETS.map((preset) => (
            <Button
              key={preset.type}
              variant="outline"
              size="sm"
              onClick={() => loadPreset(preset)}
              className="flex items-center gap-1"
            >
              <Palette className="h-3 w-3" />
              {preset.name}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="flex items-center gap-1 text-gray-600"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Venue Shape Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Venue Shape
        </label>
        <div className="flex gap-3">
          <Button
            variant={config.geometry.shape === 'circular' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => updateConfig({
              geometry: { ...config.geometry, shape: 'circular' }
            })}
            className="flex items-center gap-2"
          >
            <Circle className="h-4 w-4" />
            Circular
          </Button>
          <Button
            variant={config.geometry.shape === 'rectangle' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => updateConfig({
              geometry: { ...config.geometry, shape: 'rectangle' }
            })}
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Rectangle
          </Button>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sections (minimum 2)
            </label>
            <input
              type="number"
              min="2"
              max="12"
              value={config.sections.sections}
              onChange={(e) => updateConfig({
                sections: { ...config.sections, sections: Math.max(2, parseInt(e.target.value) || 2) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Number of seating sections</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Layers
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={config.rings.layers}
              onChange={(e) => updateConfig({
                rings: { ...config.rings, layers: Math.max(1, parseInt(e.target.value) || 1) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Number of seating tiers</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exits (minimum 1)
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={config.exits.exits}
              onChange={(e) => updateConfig({
                exits: { ...config.exits, exits: Math.max(1, parseInt(e.target.value) || 1) }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Number of venue exits</p>
          </div>

          {config.geometry.shape === 'circular' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inner Radius
              </label>
              <input
                type="number"
                min="10"
                max="25"
                value={config.rings.baseInnerRadius}
                onChange={(e) => updateConfig({
                  rings: { ...config.rings, baseInnerRadius: Math.max(10, parseFloat(e.target.value) || 10) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Size of center field/stage area</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Parking Configuration */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Car className="h-4 w-4 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">
                Parking Areas
              </label>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="parking-enabled"
                checked={config.parking.enabled}
                onChange={(e) => updateConfig({
                  parking: { ...config.parking, enabled: e.target.checked }
                })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="parking-enabled" className="text-sm text-gray-700">
                Include parking areas
              </label>
            </div>

            {config.parking.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Number of Areas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={config.parking.areas}
                    onChange={(e) => updateConfig({
                      parking: { ...config.parking, areas: Math.max(1, parseInt(e.target.value) || 1) }
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Capacity per Area
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    step="50"
                    value={config.parking.capacity}
                    onChange={(e) => updateConfig({
                      parking: { ...config.parking, capacity: Math.max(50, parseInt(e.target.value) || 50) }
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Configuration Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Current Configuration</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <div className="flex justify-between">
                <span>Venue:</span>
                <span className="font-medium">{config.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Shape:</span>
                <span className="font-medium capitalize">{config.geometry.shape}</span>
              </div>
              <div className="flex justify-between">
                <span>Sections:</span>
                <span className="font-medium">{config.sections.sections}</span>
              </div>
              <div className="flex justify-between">
                <span>Layers:</span>
                <span className="font-medium">{config.rings.layers}</span>
              </div>
              <div className="flex justify-between">
                <span>Exits:</span>
                <span className="font-medium">{config.exits.exits}</span>
              </div>
              {config.parking.enabled && (
                <div className="flex justify-between">
                  <span>Parking:</span>
                  <span className="font-medium">{config.parking.areas} areas</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VenueConfigEditor;
