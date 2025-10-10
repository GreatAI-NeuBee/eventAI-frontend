import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, DoorOpen, RefreshCw, TrendingUp, Calendar, ChevronDown, ChevronUp, FileDown, QrCode, X, Download } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import { useEventStore } from "../store/eventStore";
import { eventAPI } from "../api/apiClient";
import { Line } from 'react-chartjs-2';
import { QRCodeSVG } from 'qrcode.react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ==== Page types ====
export type FloorZonePolygon = {
  id: string;
  name: string;
  layer: number;
  section: number; // synthesized if not present
  points: Array<[number, number]>;
  congestion: number; // 0..100
};

/* =======================
   Live Page
   ======================= */
const OngoingEvent: React.FC = () => {
  const { currentEvent, isLoading } = useEventStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { eventId: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [predictResult, setPredictResult] = useState<any>(null);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set());
  const [isGeneratingPostMortem, setIsGeneratingPostMortem] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Resolve eventId (fallback)
  const eventId =
    paramId ?? searchParams.get("eventId") ?? location.state?.eventId ?? currentEvent?.id ?? "demo";

  // Fetch event details including predict_result
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId || eventId === "demo") {
        setIsLoadingEvent(false);
        return;
      }

      setIsLoadingEvent(true);
      try {
        const response = await eventAPI.getEvent(eventId);
        console.log('📥 OnGoingEvent - Full API Response:', response);
        console.log('📥 OnGoingEvent - Response.data:', response.data);
        
        // Handle nested response structure similar to Dashboard
        const event = response.data.data || response.data;
        console.log('📥 OnGoingEvent - Extracted event:', event);
        
        setEventDetails(event);
        
        // Extract predict_result and forecast_result with multiple fallback paths
        const predictData = event.predict_result || event.predictResult || null;
        const forecastData = event.forecast_result || event.forecastResult || null;
        
        console.log('📊 OnGoingEvent - Predict Result:', predictData);
        console.log('📊 OnGoingEvent - Forecast Result:', forecastData);
        console.log('🔍 Is Predict Result null?', predictData === null);
        console.log('🔍 Is Forecast Result null?', forecastData === null);
        
        setPredictResult(predictData);
        setForecastResult(forecastData);
      } catch (error) {
        console.error('Error fetching event details:', error);
      } finally {
        setIsLoadingEvent(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  // Auto-refresh every 5 minutes (as per documentation)
  useEffect(() => {
    const interval = setInterval(() => {
      // Refetch event details to get latest predict_result
      if (eventId && eventId !== "demo") {
        eventAPI.getEvent(eventId).then((response) => {
          const event = response.data.data || response.data;
          setEventDetails(event);
          setPredictResult(event.predict_result || event.predictResult || null);
          setForecastResult(event.forecast_result || event.forecastResult || null);
        }).catch((error) => {
          console.error('Error auto-refreshing event data:', error);
        });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [eventId]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (eventId && eventId !== "demo") {
        const response = await eventAPI.getEvent(eventId);
        const event = response.data.data || response.data;
        setEventDetails(event);
        setPredictResult(event.predict_result || event.predictResult || null);
        setForecastResult(event.forecast_result || event.forecastResult || null);
      }
    } catch (error) {
      console.error('Error manually refreshing event data:', error);
    } finally {
    setIsRefreshing(false);
    }
  };

  // Generate and download post-mortem report
  const handleGeneratePostMortem = async () => {
    if (!eventId || eventId === "demo") return;
    
    setIsGeneratingPostMortem(true);
    try {
      console.log('📄 Generating post-mortem report for event:', eventId);
      
      const response = await eventAPI.generatePostMortemReport(eventId);
      const reportResult = response.data.data;
      
      console.log('✅ Post-mortem report generated successfully:', reportResult);
      
      // Download the file
      if (reportResult.reportUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = reportResult.reportUrl;
        link.download = reportResult.filename || 'postmortem-report.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✅ Post-mortem report downloaded: ${reportResult.filename}`);
      }
    } catch (error: any) {
      console.error('❌ Error generating post-mortem report:', error);
      alert(error.response?.data?.message || error.message || 'Failed to generate post-mortem report');
    } finally {
      setIsGeneratingPostMortem(false);
    }
  };

  // Download QR code as image
  const handleDownloadQR = () => {
    const svg = document.getElementById('live-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `event-qr-${eventId}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const activeEvent: any = eventDetails || currentEvent || { name: "Event", capacity: 0, date: new Date().toISOString(), venue: "" };

  // Prepare chart data for EACH GATE showing only live predictions (using A, B, C, D structure)
  const gateComparisonCharts = useMemo(() => {
    if (!predictResult) {
      console.log('⚠️ Cannot create charts - missing predict_result');
      return null;
    }

    console.log('🔍 Full Predict Result:', predictResult);

    const charts: any = {};
    
    // NEW STRUCTURE: Gates are labeled as A, B, C, D directly
    const predictGateKeys = Object.keys(predictResult).filter(key => 
      ['A', 'B', 'C', 'D'].includes(key) && predictResult[key]?.timeFrames
    );
    
    if (predictGateKeys.length === 0) {
      console.warn('⚠️ No gate keys (A, B, C, D) found in predict_result');
      return null;
    }

    console.log('📊 Processing', predictGateKeys.length, 'gates with time-series data:', predictGateKeys);

    // Process each gate (A, B, C, D)
    predictGateKeys.forEach((gateKey) => {
      const gateName = `Gate ${gateKey}`;
      const gateData = predictResult[gateKey];
      
      console.log(`📊 Processing ${gateName}`, gateData);

      // Get predict time frames from the gate key
      const predictTimeFrames = gateData.timeFrames || [];

      console.log(`📊 ${gateName} - Predict frames:`, predictTimeFrames.length);

      // Skip if there's no predict data
      if (predictTimeFrames.length === 0) {
        console.warn(`⚠️ No data for ${gateName}`);
        return;
      }

      // Process predict/live time-series data points (ensure non-negative)
      // Convert UTC to Malaysia/Kuala Lumpur timezone (UTC+8)
      const timeFrames = predictTimeFrames.map((p: any) => {
        const actualValue = p.actual ?? p.predicted ?? p.congestion ?? p.density ?? 0;
        // Handle both ISO format and space-separated format
        const timestamp = p.timestamp.includes('T') ? p.timestamp : p.timestamp.replace(' ', 'T');
        const utcTimestamp = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
        const displayTime = new Date(utcTimestamp).toLocaleTimeString('en-MY', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kuala_Lumpur'
        });
        
        return {
          timestamp: displayTime,
          rawTimestamp: utcTimestamp,
          actual: Math.max(0, actualValue),
        };
      });

      // Sort by timestamp
      timeFrames.sort((a: any, b: any) => {
        const timeA = new Date(a.rawTimestamp).getTime();
        const timeB = new Date(b.rawTimestamp).getTime();
        return timeA - timeB;
      });

      const capacity = gateData.capacity || 1100;
      
      // Get latest actual count for current status
      const latestPredict = predictTimeFrames[predictTimeFrames.length - 1];
      const currentCount = latestPredict?.actual ?? 0;
      const currentRisk = latestPredict?.riskScore ?? 0;
      const riskLevel = currentRisk >= 0.7 ? 'High' : currentRisk >= 0.4 ? 'Medium' : 'Low';

      charts[gateName] = {
        capacity: capacity,
        zone: `Zone ${gateKey}`,
        gateId: gateKey,
        currentData: { 
          current_people_count: currentCount, 
          risk_level: riskLevel,
          risk_score: currentRisk,
        },
        labels: timeFrames.map((d: any) => d.timestamp),
        datasets: [
          {
            label: 'Live Crowd Density',
            data: timeFrames.map((d: any) => d.actual),
            borderColor: 'rgb(234, 67, 53)',
            backgroundColor: 'rgba(234, 67, 53, 0.15)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 1.5,
            pointHoverRadius: 5,
            pointBackgroundColor: 'rgb(234, 67, 53)',
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointHoverBackgroundColor: 'rgb(234, 67, 53)',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            spanGaps: true,
            borderDash: [],
          },
        ],
      };

      console.log(`✅ ${gateName} chart created with ${timeFrames.length} data points`);
    });

    console.log('📊 Total charts created:', Object.keys(charts).length);
    return Object.keys(charts).length > 0 ? charts : null;
  }, [predictResult]);

  // 🚨 Incident Analysis: Extract and organize incidents by gate (A, B, C, D structure)
  const incidentAnalysis = useMemo(() => {
    if (!predictResult) return null;

    const gateData: any = {};

    // Process each gate (A, B, C, D)
    const gateKeys = Object.keys(predictResult).filter(key => 
      ['A', 'B', 'C', 'D'].includes(key) && predictResult[key]?.timeFrames
    );

    if (gateKeys.length === 0) return null;

    gateKeys.forEach((gateKey) => {
      const gateName = `Gate ${gateKey}`;
      const gateInfo = predictResult[gateKey];
      const zone = `Zone ${gateKey}`;

      // Initialize gate data
      gateData[gateName] = {
        capacity: gateInfo.capacity || 1100,
        zone: zone,
        timeFrames: []
      };

      // Process all time frames for this gate
      const timeFrames = gateInfo.timeFrames || [];
      
      timeFrames.forEach((frame: any) => {
        // Handle both ISO format and space-separated format
        const timestamp = frame.timestamp.includes('T') ? frame.timestamp : frame.timestamp.replace(' ', 'T');
        const utcTimestamp = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
        const displayTimestamp = new Date(utcTimestamp).toLocaleString('en-MY', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kuala_Lumpur'
      });

        // Filter incidents (skip low probability and "No incidents")
        const incidents = frame.possibleIncidents?.filter((incident: any) => 
        incident.incident_id !== 0 && 
        incident.incident_name !== "No incidents" && 
        incident.probability > 0.05
      ) || [];

        // Determine risk level based on risk score
        const riskScore = frame.riskScore ?? 0;
        const riskLevel = riskScore >= 0.7 ? 'High' : riskScore >= 0.4 ? 'Medium' : 'Low';
        
        // Determine congestion level based on actual vs capacity
        const actualCount = frame.actual ?? 0;
        const congestionPercent = (actualCount / gateInfo.capacity) * 100;
        const congestionLevel = congestionPercent >= 80 ? 'High' : congestionPercent >= 50 ? 'Medium' : 'Low';

        gateData[gateName].timeFrames.push({
          timestamp: displayTimestamp,
          rawTimestamp: utcTimestamp,
          riskLevel: riskLevel,
          riskScore: riskScore,
          congestionLevel: congestionLevel,
          actualCount: Math.max(0, actualCount),
          incidents: incidents.sort((a: any, b: any) => b.probability - a.probability),
          hasIncidents: incidents.length > 0
        });
      });

      // Sort time frames by timestamp (newest first)
      gateData[gateName].timeFrames.sort((a: any, b: any) => 
        new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime()
      );
    });

    // Calculate totals by risk level
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;

    Object.values(gateData).forEach((gate: any) => {
      gate.timeFrames.forEach((frame: any) => {
        if (frame.riskLevel === 'High') totalHigh += frame.incidents.length;
        else if (frame.riskLevel === 'Medium') totalMedium += frame.incidents.length;
        else if (frame.riskLevel === 'Low') totalLow += frame.incidents.length;
      });
    });

    return {
      byGate: gateData,
      gates: Object.keys(gateData).sort(),
      totals: {
        high: totalHigh,
        medium: totalMedium,
        low: totalLow,
        all: totalHigh + totalMedium + totalLow
      }
    };
  }, [predictResult]);

  // 📊 Live Status Metrics for each gate
  const gateStatusMetrics = useMemo(() => {
    if (!gateComparisonCharts || !predictResult) return null;

    const metrics: any = {};

    Object.entries(gateComparisonCharts).forEach(([gateName, chartData]: [string, any]) => {
      const currentData = chartData.currentData;
      const datasets = chartData.datasets;
      const liveData = datasets[0]?.data || [];

      // Calculate average crowd density over all time frames
      const validData = liveData.filter((d: any) => d !== null && d !== undefined);
      const avgDensity = validData.length > 0 
        ? validData.reduce((sum: number, val: number) => sum + val, 0) / validData.length 
        : 0;

      // Calculate peak crowd density
      const peakDensity = Math.max(...validData, 0);

        metrics[gateName] = {
        avgDensity: avgDensity.toFixed(0),
        peakDensity: peakDensity.toFixed(0),
        dataPoints: validData.length,
          currentRisk: currentData?.risk_level || 'Unknown',
          currentCount: currentData?.current_people_count || 0,
        };
    });

    return Object.keys(metrics).length > 0 ? metrics : null;
  }, [gateComparisonCharts, predictResult]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'Live Crowd Density Monitoring',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            return value !== null ? `${context.dataset.label}: ${Math.round(value)} people` : '';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Crowd Density (people)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time (5-minute intervals)',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 20, // Show max 20 labels to avoid overcrowding
        },
        grid: {
          display: false,
        },
      },
    },
  };

  if (isLoadingEvent || isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Spinner size="lg" className="mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading live event…</h2>
          <p className="text-gray-600">Preparing live congestion view.</p>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No event selected</h2>
          <p className="text-gray-600 mb-6">Open an event first, or pass an eventId via URL/query/state.</p>
          <div className="space-x-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            <Button onClick={() => navigate("/new-event")}>Create New Event</Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if predict_result is null (live model data not available)
  if (!predictResult && !isLoadingEvent) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{activeEvent?.name || "On-going Event"}</h1>
            <p className="mt-2 text-gray-600">Live Event Monitoring</p>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Live Prediction Data Not Available
            </h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              The live prediction model data is not yet available for this event. 
              Real-time crowd density predictions and monitoring will appear here once predictions are generated.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex flex-col items-center">
                <span className="font-medium text-gray-900">Event Date</span>
                <span>{activeEvent?.dateStart ? new Date(activeEvent.dateStart).toLocaleDateString() : "—"}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium text-gray-900">Event Time</span>
                <span>{activeEvent?.dateStart ? new Date(activeEvent.dateStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-medium text-gray-900">Venue</span>
                <span>{activeEvent?.venue || activeEvent?.venueLocation?.name || "—"}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Debug: Log state before rendering
  console.log('🎯 OnGoingEvent Render State:', {
    hasPredictResult: !!predictResult,
    hasForecastResult: !!forecastResult,
    hasGateComparisonCharts: !!gateComparisonCharts,
    gateChartsCount: gateComparisonCharts ? Object.keys(gateComparisonCharts).length : 0,
    isLoadingEvent,
    eventId
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{activeEvent?.name || "On-going Event"}</h1>
          <p className="mt-2 text-gray-600 flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-600" /> Live congestion monitoring
            <span className="text-xs text-gray-500">• Auto-refresh every 5 min</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={handleGeneratePostMortem}
            disabled={isGeneratingPostMortem}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <FileDown className={`h-4 w-4 ${isGeneratingPostMortem ? 'animate-pulse' : ''}`} />
            {isGeneratingPostMortem ? 'Generating...' : 'Export Post-Mortem Report'}
          </Button>
          <Button
            onClick={() => setShowQRModal(true)}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <QrCode className="h-4 w-4" />
            Generate Live QR
          </Button>
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Event in progress</span>
          </div>
        </div>
      </div>

      {/* Live Prediction Charts by Gate */}
      {gateComparisonCharts && Object.keys(gateComparisonCharts).length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Live Crowd Density by Gate</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-gray-600">Live Predictions</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(gateComparisonCharts).map(([gateName, chartData]: [string, any]) => {
              const metrics = gateStatusMetrics?.[gateName];
              const currentData = chartData.currentData;
              
              // Risk level badge color
              const riskColor = 
                currentData?.risk_level === 'High' ? 'bg-red-500' :
                currentData?.risk_level === 'Medium' ? 'bg-yellow-500' :
                'bg-green-500';
              
              return (
                <Card key={gateName} className="bg-gradient-to-b from-white to-blue-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-gray-700" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{gateName}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${riskColor}`}>
                            {currentData?.risk_level || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <span>{chartData.zone}</span>
                          <span>•</span>
                          <span>Capacity: {chartData.capacity}</span>
                          <span>•</span>
                          <span>Current: {Math.max(0, currentData?.current_people_count ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64">
                    <Line 
                      data={{
                        labels: chartData.labels,
                        datasets: chartData.datasets
                      }} 
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          title: {
                            display: false,
                          },
                        },
                      }} 
                    />
                  </div>
                  
                  {/* Live Status Metrics for this gate */}
                  {metrics && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-900 mb-1">Crowd Density Statistics</p>
                            <p className="text-xs text-gray-600">
                              Based on {metrics.dataPoints} live data points
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-600">{metrics.avgDensity}</p>
                              <p className="text-xs text-gray-600">Avg People</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-red-600">{metrics.peakDensity}</p>
                              <p className="text-xs text-gray-600">Peak</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Current Status Indicator */}
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-xs">
                        <span className="text-gray-600">Current Status:</span>
                        <span className={`font-medium ${
                          metrics.currentRisk === 'High' ? 'text-red-600' :
                          metrics.currentRisk === 'Medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {metrics.currentRisk === 'High' ? '🔴' : metrics.currentRisk === 'Medium' ? '🟡' : '🟢'} 
                          {' '}{metrics.currentCount} people • {metrics.currentRisk} Risk
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">💡 Insight:</span> Each chart displays real-time live crowd density 
              predictions for individual gates. Monitor the trends and current risk levels to identify potential 
              congestion issues and take proactive measures at specific entry points.
            </p>
          </div>
        </div>
      )}

      {/* Incident Predictions - Organized by Gate */}
      {incidentAnalysis && (
        <Card className="bg-gradient-to-b from-white to-amber-50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-gray-900">Predicted Incident Analysis by Gate</h2>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-gray-600">{incidentAnalysis.totals.high} High Risk</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="text-gray-600">{incidentAnalysis.totals.medium} Medium</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600">{incidentAnalysis.totals.low} Low</span>
              </div>
            </div>
          </div>

          {/* No incidents message */}
          {incidentAnalysis.totals.all === 0 ? (
            <div className="p-8 bg-green-50 border-2 border-green-200 rounded-lg text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">No Incidents Predicted</h3>
              <p className="text-sm text-green-700">
                All gates are operating normally with no predicted incidents at this time.
              </p>
            </div>
          ) : (
            <>
          {/* Gates Tabs/Sections */}
          {incidentAnalysis.gates.map((gateName: string) => {
            const gateInfo = incidentAnalysis.byGate[gateName];
            // Show all gates, even if no time frames
            if (!gateInfo) return null;
            
            const isExpanded = expandedGates.has(gateName);
            const toggleGate = () => {
              const newExpanded = new Set(expandedGates);
              if (isExpanded) {
                newExpanded.delete(gateName);
              } else {
                newExpanded.add(gateName);
              }
              setExpandedGates(newExpanded);
            };

            // Get risk summary for this gate
            const riskSummary = {
              high: gateInfo.timeFrames?.filter((f: any) => f.riskLevel === 'High' && f.hasIncidents).length || 0,
              medium: gateInfo.timeFrames?.filter((f: any) => f.riskLevel === 'Medium' && f.hasIncidents).length || 0,
              low: gateInfo.timeFrames?.filter((f: any) => f.riskLevel === 'Low' && f.hasIncidents).length || 0,
            };

            // Get latest time frame for preview
            const latestFrame = gateInfo.timeFrames?.[0];
            const hasAnyIncidents = gateInfo.timeFrames?.some((f: any) => f.hasIncidents) || false;

            return (
              <div key={gateName} className="mb-4 last:mb-0">
                {/* Gate Header - Clickable */}
                <button
                  onClick={toggleGate}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border-2 border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <DoorOpen className="h-5 w-5 text-gray-700" />
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-gray-900">{gateName}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">
                          Capacity: {gateInfo.capacity} people
                        </span>
                        <span className="text-sm text-gray-600">•</span>
                        <span className="text-sm text-gray-600">
                          {gateInfo.timeFrames?.length || 0} time periods
                        </span>
                        {hasAnyIncidents ? (
                          riskSummary.high > 0 && (
                            <>
                              <span className="text-sm text-gray-600">•</span>
                              <span className="text-sm font-medium text-red-600">
                                {riskSummary.high} High Risk
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm font-medium text-green-600">
                              No incidents
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isExpanded && latestFrame && (
                      <div className="text-right mr-4">
                        <p className="text-xs text-gray-500">Latest</p>
                        <p className="text-sm font-medium text-gray-900">{latestFrame.timestamp}</p>
                        <p className={`text-xs font-semibold ${
                          latestFrame.riskLevel === 'High' ? 'text-red-600' :
                          latestFrame.riskLevel === 'Medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {latestFrame.riskLevel} Risk • {Math.max(0, latestFrame.actualCount ?? 0)}/{gateInfo.capacity} people
                        </p>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                </button>

                {/* Timeline of incidents for this gate - Collapsible */}
                {isExpanded && (
                  <div className="mt-4 space-y-4 pl-4">
                  {(() => {
                    // Filter to only show frames that have incidents
                    const displayFrames = gateInfo.timeFrames?.filter((frame: any) => {
                      // Only show frames with incidents
                      return frame.hasIncidents && frame.incidents && frame.incidents.length > 0;
                    }) || [];

                    if (displayFrames.length === 0) {
                      return (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                          <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-green-900">No incidents predicted for this gate</p>
                          <p className="text-xs text-green-700 mt-1">All time periods are clear with no predicted incidents</p>
                        </div>
                      );
                    }

                    return displayFrames.map((frame: any, frameIdx: number) => {
                    // Determine frame color based on risk level
                    const frameColor = 
                      frame.riskLevel === 'High' ? 'red' :
                      frame.riskLevel === 'Medium' ? 'yellow' : 'green';
                    
                    const bgClass = 
                      frameColor === 'red' ? 'bg-red-50 border-red-200' :
                      frameColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-green-50 border-green-200';

                    return (
                      <div key={frameIdx} className={`p-4 rounded-lg border ${bgClass}`}>
                        {/* Time Frame Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-900">
                              🕐 {frame.timestamp}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              frameColor === 'red' ? 'bg-red-200 text-red-800' :
                              frameColor === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-green-200 text-green-800'
                            }`}>
                              {frame.riskLevel} Risk
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Crowd:</span> {Math.max(0, frame.actualCount ?? 0)}/{gateInfo.capacity} 
                            <span className={`ml-2 font-semibold ${
                              frame.congestionLevel === 'High' ? 'text-red-600' :
                              frame.congestionLevel === 'Medium' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              ({frame.congestionLevel})
                            </span>
                          </div>
                        </div>

                        {/* Incidents List */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {frame.incidents.map((incident: any, incidentIdx: number) => (
                            <div 
                              key={incidentIdx} 
                              className={`p-2 rounded border ${
                                frameColor === 'red' ? 'bg-white border-red-300' :
                                frameColor === 'yellow' ? 'bg-white border-yellow-300' :
                                'bg-white border-green-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-medium text-gray-900 flex-1">
                                  {incident.incident_name}
                                </p>
                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                                  incident.probability >= 0.8 ? 'bg-red-600 text-white' :
                                  incident.probability >= 0.5 ? 'bg-orange-500 text-white' :
                                  incident.probability >= 0.3 ? 'bg-yellow-400 text-gray-900' :
                                  'bg-gray-300 text-gray-700'
                                }`}>
                                  {(incident.probability * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            ))}
                          </div>
                      </div>
                    );
                    });
                  })()}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">⚠️ Note:</span> These are AI-predicted potential incidents based on crowd density patterns and historical data. 
              Probabilities above 50% require immediate attention and proactive measures.
            </p>
          </div>
            </>
          )}
        </Card>
      )}

      {/* Summary */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-600">{zones.length || "—"}</div>
            <div className="text-sm text-gray-600">Active Zones</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-cyan-50 to-cyan-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.blue }}>{avgCongestion}%</div>
            <div className="text-sm text-gray-600">Avg Congestion</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-rose-50 to-rose-100">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS.red }}>{maxZone ? maxZone.congestion.toFixed(2) : 0}%</div>
            <div className="text-sm text-gray-600">{maxZone ? `Peak Zone (${maxZone.name})` : "Peak Zone"}</div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {new Date().toLocaleTimeString('en-MY', { 
                hour: "2-digit", 
                minute: "2-digit",
                timeZone: 'Asia/Kuala_Lumpur'
              })}
            </div>
            <div className="text-sm text-gray-600">Malaysia Time (MYT)</div>
          </div>
        </Card>
      </div> */}

      {/* QR Code Modal */}
      {showQRModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQRModal(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <QrCode className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Event QR Code</h2>
              <p className="text-sm text-gray-600">
                Scan this QR code to view live event updates and congestion information
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6 bg-white p-6 rounded-xl border-2 border-gray-200">
              <QRCodeSVG
                id="live-qr-code"
                value={`${window.location.origin}/qrCodeAttachments?eventId=${eventId}`}
                size={256}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            {/* Event Info */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Event Details</h3>
              <div className="space-y-1 text-xs text-gray-700">
                <p><span className="font-medium">Name:</span> {activeEvent?.name || 'Event'}</p>
                <p><span className="font-medium">Venue:</span> {activeEvent?.venue || activeEvent?.venueLocation?.name || '—'}</p>
                <p><span className="font-medium">Date:</span> {activeEvent?.dateStart ? new Date(activeEvent.dateStart).toLocaleDateString() : '—'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleDownloadQR}
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download QR
              </Button>
              <Button
                onClick={() => setShowQRModal(false)}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OngoingEvent;
