/**
 * Integration Example: How to use Vector Import with existing VenueLayoutCard
 * This shows how to bridge the React Native vector import with the web simulation
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { StadiumMapJSON } from '../types/stadium';
import { UploadSvg } from './UploadSvg';
import { LayoutPreview } from './LayoutPreview';

// Mock forecast data for demonstration
const MOCK_FORECAST = {
  "1": {
    capacity: 50,
    timeFrames: [
      {
        predicted: 25,
        timestamp: "2025-01-01 10:00:00",
        dataSource: "simulation",
        lower_bound: 20,
        upper_bound: 30
      }
    ]
  }
};

interface IntegrationExampleProps {
  // This would be the actual VenueLayoutCard component
  // For now, we'll show how to prepare the data
}

export const IntegrationExample: React.FC<IntegrationExampleProps> = () => {
  const [plan, setPlan] = useState<StadiumMapJSON | null>(null);

  const handlePlan = (importedPlan: StadiumMapJSON) => {
    setPlan(importedPlan);
    
    // Create event data compatible with VenueLayoutCard
    const eventData = {
      id: 'imported-layout',
      name: 'Imported Stadium Layout',
      venueLayout: importedPlan,
      forecastResult: MOCK_FORECAST
    };
    
    console.log('Event data for VenueLayoutCard:', eventData);
    
    Alert.alert(
      'Integration Ready',
      'Layout imported successfully! This data can now be passed to VenueLayoutCard for simulation.',
      [{ text: 'OK' }]
    );
  };

  const handleWebViewIntegration = () => {
    if (!plan) return;
    
    Alert.alert(
      'WebView Integration',
      'To integrate with VenueLayoutCard in React Native:\n\n' +
      '1. Install react-native-webview\n' +
      '2. Create HTML wrapper with VenueLayoutCard\n' +
      '3. Pass data via postMessage\n' +
      '4. Handle simulation events',
      [{ text: 'OK' }]
    );
  };

  const handleNativePort = () => {
    if (!plan) return;
    
    Alert.alert(
      'Native Port Strategy',
      'To port VenueLayoutCard to React Native:\n\n' +
      '1. Extract simulation logic (buildFramesFromForecast, etc.)\n' +
      '2. Replace react-three-fiber with react-native-svg\n' +
      '3. Use react-native-reanimated for animations\n' +
      '4. Maintain same data structures',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vector Import Integration</Text>
      
      {!plan ? (
        <UploadSvg onPlan={handlePlan} />
      ) : (
        <View style={styles.previewContainer}>
          <LayoutPreview plan={plan} />
          
          <View style={styles.integrationOptions}>
            <Text style={styles.optionsTitle}>Integration Options:</Text>
            
            <View style={styles.buttonContainer}>
              <Text 
                style={styles.integrationButton}
                onPress={handleWebViewIntegration}
              >
                🌐 WebView Integration
              </Text>
              
              <Text 
                style={styles.integrationButton}
                onPress={handleNativePort}
              >
                📱 Native Port
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 20,
    color: '#1a1a1a',
  },
  previewContainer: {
    flex: 1,
  },
  integrationOptions: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  integrationButton: {
    backgroundColor: '#007AFF',
    color: '#fff',
    padding: 12,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    minWidth: 120,
  },
});

// Example WebView integration code:
/*
import { WebView } from 'react-native-webview';

const WebViewIntegration = ({ plan }: { plan: StadiumMapJSON }) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel">
        // VenueLayoutCard component would go here
        // This is a simplified example
        const { useState, useEffect } = React;
        
        function VenueLayoutCard({ event }) {
          return React.createElement('div', null, 
            'Stadium Layout: ' + event.name
          );
        }
        
        function App() {
          const [event, setEvent] = useState(null);
          
          useEffect(() => {
            // Listen for data from React Native
            window.addEventListener('message', (event) => {
              if (event.data.type === 'STADIUM_DATA') {
                setEvent(event.data.payload);
              }
            });
          }, []);
          
          return event ? 
            React.createElement(VenueLayoutCard, { event }) : 
            React.createElement('div', null, 'Loading...');
        }
        
        ReactDOM.render(React.createElement(App), document.getElementById('root'));
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    // Handle messages from WebView
    console.log('Message from WebView:', event.nativeEvent.data);
  };

  const sendDataToWebView = () => {
    // Send stadium data to WebView
    const message = {
      type: 'STADIUM_DATA',
      payload: {
        id: 'imported-layout',
        name: 'Imported Stadium',
        venueLayout: plan,
        forecastResult: MOCK_FORECAST
      }
    };
    
    // This would be sent via WebView ref
    // webViewRef.current?.postMessage(JSON.stringify(message));
  };

  return (
    <WebView
      source={{ html: htmlContent }}
      onMessage={handleMessage}
      style={{ flex: 1 }}
    />
  );
};
*/

