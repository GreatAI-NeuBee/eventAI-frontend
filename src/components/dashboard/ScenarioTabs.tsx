import React, { useState } from 'react';
import { Users, LogOut, AlertTriangle } from 'lucide-react';

interface ScenarioData {
  entry: any;
  exit: any;
  congestion: any;
}

interface ScenarioTabsProps {
  scenarios: ScenarioData;
  onScenarioChange?: (scenario: 'entry' | 'exit' | 'congestion') => void;
}

const ScenarioTabs: React.FC<ScenarioTabsProps> = ({ scenarios, onScenarioChange }) => {
  const [activeTab, setActiveTab] = useState<'entry' | 'exit' | 'congestion'>('entry');

  const tabs = [
    {
      id: 'entry' as const,
      name: 'Entry Flow',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      id: 'exit' as const,
      name: 'Exit Flow',
      icon: LogOut,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'congestion' as const,
      name: 'Congestion Points',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  ];

  const handleTabChange = (tabId: 'entry' | 'exit' | 'congestion') => {
    setActiveTab(tabId);
    onScenarioChange?.(tabId);
  };

  const renderScenarioContent = () => {
    const currentScenario = scenarios[activeTab];
    
    if (!currentScenario) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No data available for this scenario</p>
        </div>
      );
    }

    // This is a flexible content renderer that can handle different data structures
    if (typeof currentScenario === 'object' && currentScenario !== null) {
      return (
        <div className="space-y-4">
          {Object.entries(currentScenario).map(([key, value]) => (
            <div key={key} className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h4>
              <div className="text-sm text-gray-600">
                {typeof value === 'object' ? (
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : (
                  <p>{String(value)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-8 text-gray-500">
        <p>Scenario data format not supported</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? `border-current ${tab.color}`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2 h-5 w-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <div className={`rounded-lg p-4 ${tabs.find(t => t.id === activeTab)?.bgColor} ${tabs.find(t => t.id === activeTab)?.borderColor} border`}>
          <div className="flex items-center mb-4">
            {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Users, {
              className: `h-6 w-6 mr-2 ${tabs.find(t => t.id === activeTab)?.color}`
            })}
            <h3 className="text-lg font-semibold text-gray-900">
              {tabs.find(t => t.id === activeTab)?.name} Analysis
            </h3>
          </div>
          
          {renderScenarioContent()}
        </div>
      </div>
    </div>
  );
};

export default ScenarioTabs;
