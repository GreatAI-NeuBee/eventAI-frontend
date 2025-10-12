import React, { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Users, QrCode, ArrowDownToLine, X, Phone, Smartphone, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { eventAPI } from '../api/apiClient';
import PWAInstallBanner from '../components/common/PWAInstallBanner';
import NotificationBellButton from '../components/common/NotificationBellButton';

// ========== TYPES ==========
interface EventData {
  eventName: string;
  venue: string;
  date: string;
}

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  size: string;
  url: string;
  uploadedAt: string;
}

interface CongestionArea {
  id: string;
  name: string;
  peopleCount: number; // total (inside + waiting)
  congestion: 'Low' | 'Moderate' | 'High' | 'Overcrowded';
  lastUpdated: string;
  mapImage?: string;
  maleToilets?: number;   // number of stalls for male side
  femaleToilets?: number; // number of stalls for female side
  capacity?: number;      // total comfortable capacity for the zone (5-15)
  maleInside?: number;    // people currently inside male side (in area/stalls)
  femaleInside?: number;  // people currently inside female side
  maleWaiting?: number;   // people waiting for male side
  femaleWaiting?: number; // people waiting for female side
}

// ========== UTILS ==========
const getCongestionColor = (status: string) => {
  switch (status) {
    case 'Low': return 'bg-green-100 text-green-700';
    case 'Moderate': return 'bg-yellow-100 text-yellow-700';
    case 'High': return 'bg-orange-100 text-orange-700';
    case 'Overcrowded': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const CongestionBar: React.FC<{ level: CongestionArea['congestion'] }> = ({ level }) => {
  const widths = { Low: 25, Moderate: 50, High: 75, Overcrowded: 100 };
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${widths[level]}%` }}
        transition={{ duration: 0.6 }}
        className={`h-full ${level === 'Low'
          ? 'bg-green-500'
          : level === 'Moderate'
            ? 'bg-yellow-500'
            : level === 'High'
              ? 'bg-orange-500'
              : 'bg-red-600'
          }`}
      />
    </div>
  );
};

// ========== COMPONENTS ==========
const EventInfoCard: React.FC<{ data: EventData }> = ({ data }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <QrCode className="h-5 w-5 text-indigo-500" />
      Event Information
    </h2>
    <div className="space-y-3 text-sm">
      <InfoRow label="Event Name" value={data.eventName} />
      <InfoRow label="Venue" value={data.venue} />
      <InfoRow label="Date" value={data.date} />
    </div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex justify-between items-start">
    <span className="text-gray-600 font-medium">{label}:</span>
    <span className={`text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

// Mobile Setup Guide Component
const MobileSetupGuide: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    if (isIOS) {
      setDeviceType('ios');
    } else if (isAndroid) {
      setDeviceType('android');
    } else {
      setDeviceType('other');
    }

    // Check if notifications are supported
    const notificationsSupported = 'Notification' in window && 'serviceWorker' in navigator;
    const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost';
    
    // Show guide if on mobile and notifications aren't properly set up
    const isMobile = isIOS || isAndroid;
    const needsSetup = isMobile && (!notificationsSupported || !isSecureContext);
    
    setIsVisible(needsSetup);
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Smartphone className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Enable Notifications on Your Phone
          </h3>
          
          {deviceType === 'ios' && (
            <div className="text-sm text-blue-800 space-y-2">
              <p className="font-medium">📱 iOS Setup (2 steps):</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Tap the <strong>Share</strong> button (square with arrow) in Safari</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Open the app from your home screen</li>
                <li>Tap the notification button to enable alerts</li>
              </ol>
              <p className="mt-2 text-xs bg-blue-100 border border-blue-200 rounded p-2">
                💡 <strong>Note:</strong> iOS only supports notifications for apps installed to home screen
              </p>
            </div>
          )}
          
          {deviceType === 'android' && (
            <div className="text-sm text-blue-800 space-y-2">
              <p className="font-medium">🤖 Android Setup:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Tap the <strong>menu</strong> (three dots) in Chrome</li>
                <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                <li>Open the app from your home screen</li>
                <li>Tap the notification button to enable alerts</li>
              </ol>
              {!window.isSecureContext && (
                <p className="mt-2 text-xs bg-amber-100 border border-amber-200 rounded p-2">
                  ⚠️ <strong>HTTPS Required:</strong> Access this page via HTTPS to enable notifications
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => setIsVisible(false)}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Live congestion panel + modal
const CongestionPanel: React.FC<{ data: CongestionArea[] }> = ({ data }) => {
  const [selectedToilet, setSelectedToilet] = useState<CongestionArea | null>(null);

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Live Congestion Overview
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {data.map((area) => {
            const isToilet = area.name.toLowerCase().includes('toilet');
            return (
              <motion.div
                key={area.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-900">{area.name}</h3>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${getCongestionColor(
                      area.congestion
                    )}`}
                  >
                    {area.congestion}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{area.peopleCount.toLocaleString()} people</span>
                  </div>
                  <span>{area.lastUpdated}</span>
                </div>

                <CongestionBar level={area.congestion} />

                {isToilet && (
                  <div className="mt-2 flex gap-2">
                    <div className="text-xs text-gray-600">
                      🚹 {area.maleInside ?? 0} in · {area.maleWaiting ?? 0} waiting
                    </div>
                    <div className="text-xs text-gray-600">•</div>
                    <div className="text-xs text-gray-600">
                      🚺 {area.femaleInside ?? 0} in · {area.femaleWaiting ?? 0} waiting
                    </div>
                  </div>
                )}

                {isToilet && (
                  <button
                    onClick={() => setSelectedToilet(area)}
                    className="mt-2 w-full text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    View Toilet Details →
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* === Modal Dialog for Toilet Details === */}
      {selectedToilet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedToilet(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white w-full max-w-md rounded-2xl shadow-lg border border-gray-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedToilet(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              🚻 {selectedToilet.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Current congestion: <span className="font-semibold">{selectedToilet.congestion}</span>
              {' '}• {selectedToilet.peopleCount}/{selectedToilet.capacity} total
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {/* Male section */}
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex flex-col items-center w-full">
                <span className="text-xl">🚹</span>
                <p className="font-medium text-gray-800 mt-1">Male Toilets</p>
                <p className="text-gray-700 font-semibold">
                  {selectedToilet.maleInside ?? 0} / {(selectedToilet.maleToilets ?? 0)} using
                </p>
                {selectedToilet.maleWaiting && selectedToilet.maleWaiting > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedToilet.maleWaiting} waiting
                  </p>
                )}

                {(() => {
                  const totalMaleCap = selectedToilet.maleToilets ?? 1;
                  const percent = Math.min(100, Math.round(((selectedToilet.maleInside ?? 0) / totalMaleCap) * 100));
                  const barColor =
                    percent < 40 ? 'bg-green-500' :
                      percent < 70 ? 'bg-yellow-500' :
                        percent < 85 ? 'bg-orange-500' : 'bg-red-600';
                  return (
                    <>
                      <div className="w-full h-2 bg-blue-100 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${percent}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{percent}% occupancy</p>
                    </>
                  );
                })()}
              </div>

              {/* Female section */}
              <div className="bg-pink-50 border border-pink-100 p-3 rounded-lg flex flex-col items-center w-full">
                <span className="text-xl">🚺</span>
                <p className="font-medium text-gray-800 mt-1">Female Toilets</p>
                <p className="text-gray-700 font-semibold">
                  {selectedToilet.femaleInside ?? 0} / {(selectedToilet.femaleToilets ?? 0)} using
                </p>
                {selectedToilet.femaleWaiting && selectedToilet.femaleWaiting > 0 && (
                  <p className="text-xs text-pink-600 mt-1">
                    {selectedToilet.femaleWaiting} waiting
                  </p>
                )}

                {(() => {
                  const totalFemaleCap = selectedToilet.femaleToilets ?? 1;
                  const percent = Math.min(100, Math.round(((selectedToilet.femaleInside ?? 0) / totalFemaleCap) * 100));
                  const barColor =
                    percent < 40 ? 'bg-green-500' :
                      percent < 70 ? 'bg-yellow-500' :
                        percent < 85 ? 'bg-orange-500' : 'bg-red-600';
                  return (
                    <>
                      <div className="w-full h-2 bg-pink-100 rounded-full mt-2 overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${percent}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{percent}% occupancy</p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 🚦 Nearest suggestion */}
            {['High', 'Overcrowded'].includes(selectedToilet.congestion) && (() => {
              const alternatives = data
                .filter((d) => d.name !== selectedToilet.name && d.name.toLowerCase().includes('toilet'))
                .filter((d) => ['Low', 'Moderate'].includes(d.congestion));
              if (alternatives.length === 0) return null;
              const nearest = alternatives[Math.floor(Math.random() * alternatives.length)];

              return (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
                  ⚠️ This toilet is quite crowded. You may go to <span className="font-semibold">{nearest.name}</span> instead (currently <span className="font-semibold">{nearest.congestion}</span>).
                </div>
              );
            })()}
          </motion.div>
        </div>
      )}
    </>
  );
};

const QuickGuidelines: React.FC = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
      <FileText className="h-5 w-5 text-indigo-500" />
      Quick Safety Guidelines
    </h2>

    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
      <li>Check congestion level before heading to crowded areas.</li>
      <li>If <span className="text-red-600 font-semibold">Overcrowded</span>, use alternate gates or restrooms.</li>
      <li>Follow on-site signage and staff direction.</li>
      <li>Stay hydrated; water stations near each restroom.</li>
      <li>Report emergencies via the info desk or hotline.</li>
    </ul>

  </div>
);

const AttachmentsList: React.FC<{ attachments: Attachment[] }> = ({ attachments }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents & Floorplans</h2>
    <div className="grid gap-3">
      {attachments.map((file) => (
        <motion.a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.01 }}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{file.size} • Uploaded {file.uploadedAt}</p>
            </div>
          </div>
          <ArrowDownToLine className="h-5 w-5 text-indigo-500" />
        </motion.a>
      ))}
    </div>
  </div>
);

// ========== MAIN ==========
const UserEventView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [congestion, setCongestion] = useState<CongestionArea[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEmergencyCallActive, setIsEmergencyCallActive] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Helper random int
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Function to simulate dynamic crowd updates (realistic version)
  const generateCrowdData = (): CongestionArea[] => {
    const allAreas = [
      { name: 'Gate A', type: 'gate' },
      { name: 'Gate B', type: 'gate' },
      { name: 'Gate C', type: 'gate' },
      { name: 'Gate D', type: 'gate' },
      { name: 'Gate E', type: 'gate' },
      { name: 'Toilet Zone A', type: 'toilet' },
      { name: 'Toilet Zone B', type: 'toilet' },
      { name: 'Toilet Zone C', type: 'toilet' },
    ];

    // Randomly select 3–5 open gates
    const openGates = allAreas
      .filter((a) => a.type === 'gate')
      .sort(() => Math.random() - 0.5)
      .slice(0, rand(3, 5)); // 3–5 open gates

    const toilets = allAreas.filter((a) => a.type === 'toilet');

    const visibleAreas = [...openGates, ...toilets];

    return visibleAreas.map((area, idx) => {
      // default fields
      let peopleCount = 0;
      let congestion: CongestionArea['congestion'] = 'Low';
      let maleToilets: number | undefined;
      let femaleToilets: number | undefined;
      let capacity: number | undefined;
      let maleInside: number | undefined;
      let femaleInside: number | undefined;
      let maleWaiting: number | undefined;
      let femaleWaiting: number | undefined;

      if (area.type === 'gate') {
        // Gates: large crowds (unchanged)
        peopleCount = Math.floor(Math.random() * 400) + 50; // 50–450
        capacity = 400;
        if (peopleCount < 100) congestion = 'Low';
        else if (peopleCount < 200) congestion = 'Moderate';
        else if (peopleCount < 350) congestion = 'High';
        else congestion = 'Overcrowded';
      }

      else {
        // Toilets: consistent, realistic breakdown
        maleToilets = rand(1, 4);   // number of male stalls (1–4)
        femaleToilets = rand(1, 5); // number of female stalls (1–5)
        const baseStalls = maleToilets + femaleToilets;

        // total capacity per zone (5–15) but at least baseStalls
        capacity = baseStalls;

        // how many people currently inside the toilet area (0..capacity)
        const peopleInside = rand(0, capacity);

        // split inside by stall ratio (proportional)
        const maleShare = Math.round((peopleInside * (maleToilets / baseStalls)));
        maleInside = Math.min(maleShare, peopleInside); // guard
        femaleInside = peopleInside - maleInside;

        // waiting appears only when inside is near capacity (>=80% of capacity)
        const waitingTotal = peopleInside >= Math.floor(capacity * 0.8) ? rand(1, 4) : 0;
        // split waiting by stalls proportion
        maleWaiting = Math.round((waitingTotal * (maleToilets / baseStalls)));
        femaleWaiting = waitingTotal - maleWaiting;

        peopleCount = peopleInside + waitingTotal;

        // congestion by usage ratio (peopleInside vs capacity)
        const usage = (peopleInside / capacity) * 100;
        if (usage < 40) congestion = 'Low';
        else if (usage < 65) congestion = 'Moderate';
        else if (usage < 85) congestion = 'High';
        else congestion = 'Overcrowded';
      }

      return {
        id: `${idx}`,
        name: area.name,
        peopleCount,
        congestion,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        maleToilets,
        femaleToilets,
        capacity,
        maleInside,
        femaleInside,
        maleWaiting,
        femaleWaiting,
      } as CongestionArea;
    });
  };

  // Send push notification function (demo only)
  const handleSendPushNotification = async () => {
    if (!eventId || !event) {
      return;
    }

    try {
      setIsSendingNotification(true);
      
      console.log('📤 Sending push notification for event:', eventId);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: eventId,
          title: '🎉 Event Update',
          body: `Gates will open in 30 minutes for ${event.eventName}!`,
          requireInteraction: false,
          data: {
            type: 'event_update',
            eventId: eventId,
            url: `/qrCodeAttachments?eventId=${eventId}`
          }
        }),
      });

      if (response.ok) {
        console.log('✅ Push notification sent successfully');
      } else {
        console.log('⚠️ Push notification send failed:', response.status);
      }
    } catch (error) {
      // Silent error for demo purposes
      console.log('⚠️ Push notification error:', error);
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Emergency call function
  const handleEmergencyCall = async () => {
    if (!event) {
      alert('Event data not available. Please try again later.');
      return;
    }

    try {
      setIsEmergencyCallActive(true);
      
      console.log('🚨 Emergency call initiated for:', event.eventName);

      // Prepare event details for the webhook
      const eventName = encodeURIComponent(event.eventName);
      const eventLocation = encodeURIComponent(event.venue);
      const webhookUrl = `https://eventbuddy-api.munymunyhom.tech/n8n/webhook/emergency-help?event_name=${eventName}&event_location=${eventLocation}`;

      console.log('📞 Calling emergency webhook:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: eventId,
          eventName: event.eventName,
          eventLocation: event.venue,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        console.log('✅ Emergency call webhook triggered successfully');
        alert('🚨 Emergency call initiated! Help is on the way. Please stay calm and follow any instructions from event staff.');
      } else {
        throw new Error(`Webhook call failed with status: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Emergency call failed:', error);
      alert('⚠️ Unable to initiate emergency call. Please contact event staff directly or call local emergency services.');
    } finally {
      setIsEmergencyCallActive(false);
    }
  };

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        setError('No event ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log('📥 QRCodeAttachments - Fetching event data for:', eventId);
        
        const response = await eventAPI.getEvent(eventId);
        const eventData = response.data.data || response.data;
        
        console.log('📥 QRCodeAttachments - Event data received:', eventData);

        // Set real event data from backend
        setEvent({
          eventName: eventData.name || 'Event',
          venue: eventData.venue || eventData.venueLocation?.name || 'Venue',
          date: eventData.date_of_event_start 
            ? new Date(eventData.date_of_event_start).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
        });

        setError(null);
      } catch (err: any) {
        console.error('❌ Error fetching event data:', err);
        setError(err.message || 'Failed to load event data');
        // Set fallback data if fetch fails
        setEvent({
          eventName: 'Event (Offline Mode)',
          venue: 'Venue Information Unavailable',
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();

    // Initial mock data for congestion
    setCongestion(generateCrowdData());

    // Mock attachments data (kept as mock for now)
    setAttachments([
      {
        id: '1',
        name: 'Event_Safety_Guidelines.pdf',
        type: 'pdf',
        size: '1.5 MB',
        url: 'https://example.com/files/event-guidelines.pdf',
        uploadedAt: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
      },
    ]);

    // Auto-refresh congestion data every 5 minutes (simulated)
    const interval = setInterval(() => setCongestion(generateCrowdData()), 300000); // 5 mins
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 font-medium">Loading event data...</p>
        </div>
      </div>
    );
  }

  // Error state (but still show the page with fallback data)
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'Unable to load event data. Please check the QR code or try again later.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSendPushNotification}
              disabled={isSendingNotification}
              className={`text-2xl font-bold text-left transition-all duration-200 ${
                isSendingNotification 
                  ? 'text-gray-400 cursor-wait' 
                  : 'text-gray-900 hover:text-indigo-600 cursor-pointer'
              }`}
              title="Click to send demo push notification"
            >
              {event.eventName}
              {isSendingNotification && (
                <span className="ml-2 text-xs text-indigo-600 font-normal">
                  📤 Sending notification...
                </span>
              )}
            </button>
            <p className="text-sm text-gray-600">{event.venue} • {event.date}</p>
            {error && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
                ⚠️ Some data may be limited or unavailable
              </p>
            )}
          </div>
          
          {/* Action Buttons */}
          {eventId && (
            <div className="flex items-center gap-3">
              {/* Emergency Call Button */}
              <motion.button
                onClick={handleEmergencyCall}
                disabled={isEmergencyCallActive}
                whileHover={{ scale: isEmergencyCallActive ? 1 : 1.05 }}
                whileTap={{ scale: isEmergencyCallActive ? 1 : 0.95 }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200
                  ${isEmergencyCallActive 
                    ? 'bg-red-300 text-red-700 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                  }
                `}
              >
                <Phone className={`h-4 w-4 ${isEmergencyCallActive ? 'animate-pulse' : ''}`} />
                {isEmergencyCallActive ? 'Calling...' : 'Emergency Help'}
              </motion.button>

              {/* Notification Bell Button */}
              <NotificationBellButton 
                eventId={eventId}
                onSubscribed={() => {
                  console.log('✅ User subscribed to notifications for event:', eventId);
                }}
              />
            </div>
          )}
        </div>
      </header>


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Mobile Setup Guide */}
        <MobileSetupGuide />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EventInfoCard data={event} />
          <QuickGuidelines />
        </div>

        <div>
          <CongestionPanel data={congestion} />
        </div>

        <div>
          <AttachmentsList attachments={attachments} />
        </div>
      </main>

      <footer className="text-center text-xs text-gray-500 py-6">
        Data auto-refreshes every 5 minutes • Stay alert and safe 💡
      </footer>

      {/* PWA Install Banner */}
      <PWAInstallBanner 
        onRequestNotificationPermission={() => {
          console.log('📱 User enabled notifications for event:', eventId);
          // You can send the push subscription to your backend here
        }}
      />
    </div>
  );
};

export default UserEventView;
