import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, DoorOpen, RefreshCw, TrendingUp, Calendar, ChevronDown, ChevronUp, FileDown, QrCode, X, Download, Camera, CameraOff, AlertCircle } from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import { useEventStore } from "../store/eventStore";
import { eventAPI } from "../api/apiClient";
import { Line } from 'react-chartjs-2';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
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

// CCTV Component for each gate with WebSocket Integration
interface CCTVFeedProps {
  gateId: string;
  gateName: string;
  isFirstGate: boolean;
  eventId: string;
}

interface FallDetectionAlert {
  sessionId: string;
  eventId: string;
  detection: {
    confidence: number;
    detections: any[];
    boundingBox: any;
    aspectRatio: number;
    frameIndex: number;
    timestamp: number;
  };
  alert: {
    title: string;
    message: string;
    severity: string;
    timestamp: number;
  };
}

const CCTVFeed: React.FC<CCTVFeedProps> = ({ gateName, isFirstGate, eventId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [staticImageUrl, setStaticImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState<boolean>(false);
  
  // WebSocket state
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [fallAlerts, setFallAlerts] = useState<FallDetectionAlert[]>([]);
  
  // Configuration
  const config = {
    frameRate: 10, // FPS
    quality: 0.75, // JPEG quality
    maxWidth: 640,
    maxHeight: 480,
    serverUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  };

  // Generate random image URL for non-first gates
  const generateRandomImageUrl = () => {
    const randomNumber = Math.floor(Math.random() * 13) + 1; // 1-13
    return `https://vkaongvemnzkvvvxgduk.supabase.co/storage/v1/object/public/congestion_image/congested${randomNumber}.jpg`;
  };

  // Initialize WebSocket connection for first gate
  useEffect(() => {
    if (!isFirstGate) {
      // Generate random image for other gates
      setStaticImageUrl(generateRandomImageUrl());
      return;
    }

    // Initialize Socket.IO connection for first gate
    console.log('🔌 Initializing Socket.IO connection...');
    const socket = io(config.serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('✅ Connected to fall detection server, Socket ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setSocketConnected(false);
      console.log('🔌 Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    // Stream events
    socket.on('stream_started', (data) => {
      console.log('🎥 Stream started:', data);
      setSessionId(data.sessionId);
    });

    socket.on('stream_stopped', (data) => {
      console.log('⏹️ Stream stopped:', data);
      setSessionId(null);
      setFrameCount(0);
    });

    socket.on('stream_error', (error) => {
      console.error('❌ Stream error:', error);
      setCameraError(error.message);
    });

    // Fall detection event
    socket.on('fall_detected', (data: FallDetectionAlert) => {
      console.log('🚨 FALL DETECTED!', data);
      handleFallDetection(data);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up Socket.IO connection...');
      if (frameIntervalRef.current) {
        clearTimeout(frameIntervalRef.current);
      }
      socket.disconnect();
    };
  }, [isFirstGate]);

  // Sync stream with video element
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log('📹 Setting video srcObject with stream:', stream);
      console.log('📹 Video element ready:', videoRef.current);
      console.log('📹 Stream active:', stream.active);
      console.log('📹 Stream tracks:', stream.getTracks());
      
      videoRef.current.srcObject = stream;
      
      // Try to play the video explicitly
      videoRef.current.play().catch((error) => {
        console.error('❌ Error playing video:', error);
      });

      // Set canvas dimensions to match video
      if (canvasRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
    }
  }, [stream]);

  // Frame capture and sending logic
  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !sessionId || !socketRef.current?.connected) {
      return;
    }

    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) return;

      // Draw current video frame to canvas
      context.drawImage(
        videoRef.current,
        0, 0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      // Convert canvas to base64 JPEG
      const frameData = canvasRef.current.toDataURL('image/jpeg', config.quality);
      const base64Data = frameData.split(',')[1]; // Remove data:image/jpeg;base64, prefix

      // Send frame to server
      socketRef.current.emit('video_frame', {
        sessionId: sessionId,
        frameData: base64Data,
        timestamp: Date.now(),
        frameIndex: frameCount
      });

      setFrameCount(prev => prev + 1);
      console.log(`📹 Frame ${frameCount} sent to server`);

    } catch (error) {
      console.error('❌ Error capturing frame:', error);
    }

    // Schedule next frame capture
    const frameInterval = 1000 / config.frameRate;
    frameIntervalRef.current = setTimeout(captureAndSendFrame, frameInterval);
  };

  // Fall detection handler
  const handleFallDetection = (data: FallDetectionAlert) => {
    console.log('🚨 Processing fall detection alert:', data);
    
    // Add to alerts list
    setFallAlerts(prev => [...prev, data]);
    
    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(data.alert.title, {
        body: data.alert.message,
        icon: '/logo.png',
        tag: 'fall-detection',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      } as NotificationOptions);
    }

    // Play alert sound
    playAlertSound();

    // Auto-remove alert after 30 seconds
    setTimeout(() => {
      setFallAlerts(prev => prev.filter(alert => alert !== data));
    }, 30000);
  };

  // Play alert sound
  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  };

  // Start camera for first gate
  const startCamera = async () => {
    setIsLoadingCamera(true);
    setCameraError(null);
    setFallAlerts([]); // Clear previous alerts

    try {
      if (!socketConnected) {
        throw new Error('Not connected to fall detection server');
      }

      console.log('📹 Requesting camera access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: config.maxWidth },
          height: { ideal: config.maxHeight },
          frameRate: { ideal: config.frameRate },
          facingMode: 'user'
        } 
      });
      
      console.log('✅ Camera access granted!');
      console.log('📹 Media stream obtained:', mediaStream);
      
      // Set stream state
      setStream(mediaStream);

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
        }
      });

      // Set canvas dimensions
      if (canvasRef.current && videoRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }

      // Start streaming session with server
      socketRef.current?.emit('start_video_stream', {
        eventId: eventId,
        config: {
          frameRate: config.frameRate,
          quality: config.quality,
          maxWidth: config.maxWidth,
          maxHeight: config.maxHeight,
          requireAck: false
        }
      });

      // Start frame capture loop
      setTimeout(captureAndSendFrame, 1000 / config.frameRate);

      console.log('✅ Camera streaming started with fall detection');
      
    } catch (error: any) {
      console.error('❌ Error starting camera:', error);
      
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else if (error.name === 'NotReadableError') {
        setCameraError('Camera is already in use by another application.');
      } else {
        setCameraError(`Unable to access camera: ${error.message}`);
      }
    } finally {
      setIsLoadingCamera(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    console.log('⏹️ Stopping camera and video stream...');
    
    // Stop frame capture
    if (frameIntervalRef.current) {
      clearTimeout(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Notify server to stop stream
    if (socketRef.current && sessionId) {
      socketRef.current.emit('stop_video_stream', {
        sessionId: sessionId
      });
    }

    // Reset state
    setSessionId(null);
    setFrameCount(0);
    setFallAlerts([]);
    
    console.log('✅ Camera stopped');
  };

  // Refresh static image for non-first gates
  const refreshImage = () => {
    setStaticImageUrl(generateRandomImageUrl());
    setImageError(false);
  };

            return (
    <div className="bg-black rounded-lg overflow-hidden border-2 border-gray-300">
      {/* Hidden Canvas for Frame Capture */}
      {isFirstGate && <canvas ref={canvasRef} className="hidden" />}
      
      {/* Fall Detection Alerts */}
      {isFirstGate && fallAlerts.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-10 p-2 space-y-2">
          {fallAlerts.map((alert, index) => (
            <div
              key={index}
              className="bg-red-600 text-white p-3 rounded-lg shadow-lg border-2 border-red-800 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-5 w-5" />
                    <h3 className="font-bold text-sm">{alert.alert.title}</h3>
                  </div>
                  <p className="text-xs">{alert.alert.message}</p>
                  <p className="text-xs mt-1 opacity-90">
                    Confidence: {alert.detection.confidence.toFixed(1)}%
                  </p>
                </div>
                <button
                  onClick={() => setFallAlerts(prev => prev.filter((_, i) => i !== index))}
                  className="text-white hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* CCTV Header */}
      <div className="bg-gray-900 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            (isFirstGate && stream && socketConnected) || (!isFirstGate && !imageError)
              ? 'bg-red-500 animate-pulse'
              : 'bg-gray-500'
          }`}></div>
          <span className="text-white text-xs font-medium">
            📹 CCTV - {gateName}
            {isFirstGate && socketConnected && (
              <span className="ml-2 text-green-400 text-xs">● AI Fall Detection</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isFirstGate && (
            <>
              {stream ? (
                <>
                  <button
                    onClick={stopCamera}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Stop Camera"
                  >
                    <CameraOff className="h-4 w-4" />
                  </button>
                  {sessionId && (
                    <span className="text-gray-400 text-xs">
                      {frameCount} frames
                    </span>
                  )}
                </>
              ) : (
                <button
                  onClick={startCamera}
                  disabled={isLoadingCamera || !socketConnected}
                  className="text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                  title={socketConnected ? "Start Camera" : "Connecting to server..."}
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {!isFirstGate && (
            <button
              onClick={refreshImage}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              title="Refresh Feed"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <span className="text-gray-400 text-xs">
            {new Date().toLocaleTimeString('en-MY', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              timeZone: 'Asia/Kuala_Lumpur'
            })}
          </span>
        </div>
      </div>

      {/* CCTV Content */}
      <div className="relative h-48 bg-gray-900 flex items-center justify-center">
        {isFirstGate ? (
          // Live camera feed for first gate
          <>
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => {
                  console.log('📹 Video metadata loaded');
                  if (videoRef.current) {
                    console.log('📹 Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
                    videoRef.current.play().catch(err => console.error('❌ Play error:', err));
                  }
                }}
                onCanPlay={() => console.log('📹 Video can play')}
                onPlay={() => console.log('📹 Video playing')}
                onError={(e) => console.error('❌ Video element error:', e)}
              />
            ) : (
              <div className="text-center p-4">
                {isLoadingCamera ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    <p className="text-white text-sm">Starting camera...</p>
                  </div>
                ) : cameraError ? (
                  <div className="flex flex-col items-center gap-2 text-red-400">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-xs text-center max-w-xs">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    >
                      Try Again
                    </button>
            </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Camera className="h-8 w-8" />
                    <p className="text-sm">Live Camera Feed</p>
                    <button
                      onClick={startCamera}
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Start Camera
                    </button>
            </div>
                )}
          </div>
            )}
          </>
        ) : (
          // Static congestion image for other gates
          <div className="w-full h-full relative">
            {imageError ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="text-sm mb-2">Failed to load feed</p>
                <button
                  onClick={refreshImage}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                >
                  Retry
                </button>
            </div>
            ) : (
              <img
                src={staticImageUrl}
                alt={`CCTV footage for ${gateName}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            )}
            
            {/* Overlay timestamp and gate info */}
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
              Live Feed - {gateName}
            </div>
          </div>
        )}

        {/* Connection status indicator */}
        <div className="absolute top-2 right-2">
          <div className={`w-3 h-3 rounded-full ${
            (isFirstGate && stream) || (!isFirstGate && !imageError) 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}></div>
        </div>
      </div>
    </div>
  );
};

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
            {Object.entries(gateComparisonCharts).map(([gateName, chartData]: [string, any], index) => {
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
                  
                  {/* CCTV Feed Component */}
                  <div className="mt-4">
                    <CCTVFeed 
                      gateId={chartData.gateId}
                      gateName={gateName}
                      isFirstGate={index === 0} // First gate gets camera access
                      eventId={eventId}
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
