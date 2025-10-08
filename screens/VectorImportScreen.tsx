/**
 * Vector Import Screen - End-to-end demo
 * Handles upload, parsing, preview, and integration with simulation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Share,
  ScrollView
} from 'react-native';
import { StadiumMapJSON } from '../types/stadium';
import { UploadSvg } from '../vector-import/UploadSvg';
import { LayoutPreview } from '../vector-import/LayoutPreview';

export const VectorImportScreen: React.FC = () => {
  const [plan, setPlan] = useState<StadiumMapJSON | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlan = (newPlan: StadiumMapJSON) => {
    setPlan(newPlan);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setPlan(null);
  };

  const handleExportPlan = async () => {
    if (!plan) return;

    try {
      const planJson = JSON.stringify(plan, null, 2);
      await Share.share({
        message: planJson,
        title: 'Stadium Layout JSON',
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Could not share the layout data');
    }
  };

  const handleClear = () => {
    setPlan(null);
    setError(null);
  };

  const handleSimulation = () => {
    if (!plan) return;

    // TODO: Integration with VenueLayoutCard
    // For web-only VenueLayoutCard, consider:
    // 1. Wrap in WebView with react-native-webview
    // 2. Port minimal drawing subset to React Native
    // 3. Use react-native-web for web components
    
    Alert.alert(
      'Simulation Integration',
      'This would integrate with the existing VenueLayoutCard simulation. ' +
      'For React Native, you could:\n\n' +
      '1. Use WebView to wrap the web VenueLayoutCard\n' +
      '2. Port the simulation logic to React Native\n' +
      '3. Use react-native-web for web components',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vector Stadium Import</Text>
        <Text style={styles.subtitle}>
          Upload SVG layouts and convert to stadium simulation data
        </Text>
      </View>

      {!plan ? (
        <UploadSvg onPlan={handlePlan} onError={handleError} />
      ) : (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Layout Preview</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleClear}
              >
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleExportPlan}
              >
                <Text style={styles.primaryButtonText}>Export JSON</Text>
              </TouchableOpacity>
            </View>
          </View>

          <LayoutPreview plan={plan} />

          <View style={styles.integrationContainer}>
            <Text style={styles.integrationTitle}>Next Steps</Text>
            <Text style={styles.integrationText}>
              This layout can now be used with the stadium simulation system.
            </Text>
            
            <TouchableOpacity
              style={[styles.button, styles.simulationButton]}
              onPress={handleSimulation}
            >
              <Text style={styles.simulationButtonText}>Run Simulation</Text>
            </TouchableOpacity>

            <View style={styles.todoContainer}>
              <Text style={styles.todoTitle}>TODO: Integration Options</Text>
              <Text style={styles.todoText}>
                • Wrap VenueLayoutCard in WebView for React Native
              </Text>
              <Text style={styles.todoText}>
                • Port simulation logic to React Native
              </Text>
              <Text style={styles.todoText}>
                • Use react-native-web for web components
              </Text>
              <Text style={styles.todoText}>
                • Add AsyncStorage persistence
              </Text>
            </View>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#f1f3f4',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  simulationButton: {
    backgroundColor: '#34c759',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#5f6368',
    fontSize: 14,
    fontWeight: '600',
  },
  simulationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  integrationContainer: {
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
  integrationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  integrationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  todoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  todoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  todoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#fee',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c33',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#c33',
    lineHeight: 20,
  },
});

