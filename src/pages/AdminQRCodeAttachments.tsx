import React, { useState } from 'react';
import { QrCode, Download, FileText, Image, Film, Music, Archive } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'audio' | 'other';
  size: string;
  url: string;
  uploadedAt: string;
}

const AdminQRCodeAttachments: React.FC = () => {
  // Dummy data for testing
  const [eventData] = useState({
    eventId: 'evt_sample_123',
    eventName: 'Annual Tech Conference 2025',
    venue: 'Convention Center Hall A',
    date: '2025-10-15',
  });

  const [attachments] = useState<Attachment[]>([
    {
      id: '1',
      name: 'Event_Floor_Plan.pdf',
      type: 'pdf',
      size: '2.4 MB',
      url: 'https://example.com/files/floor-plan.pdf',
      uploadedAt: '2025-10-01 14:30',
    },
    {
      id: '2',
      name: 'Safety_Guidelines.pdf',
      type: 'pdf',
      size: '1.8 MB',
      url: 'https://example.com/files/safety-guidelines.pdf',
      uploadedAt: '2025-10-01 14:32',
    },
    {
      id: '3',
      name: 'Event_Banner.png',
      type: 'image',
      size: '3.2 MB',
      url: 'https://example.com/files/banner.png',
      uploadedAt: '2025-10-01 15:00',
    },
    {
      id: '4',
      name: 'Promotional_Video.mp4',
      type: 'video',
      size: '45.6 MB',
      url: 'https://example.com/files/promo.mp4',
      uploadedAt: '2025-10-02 09:15',
    },
  ]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-blue-500" />;
      case 'video':
        return <Film className="h-5 w-5 text-purple-500" />;
      case 'audio':
        return <Music className="h-5 w-5 text-green-500" />;
      default:
        return <Archive className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleDownload = (attachment: Attachment) => {
    // Simulate download
    console.log('Downloading:', attachment.name);
    window.open(attachment.url, '_blank');
  };

  // Generate QR code URL for this page
  const pageUrl = window.location.href;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <QrCode className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Event Attachments</h1>
              <p className="text-sm text-gray-600">Access event documents and files</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Event Name:</span>
                  <span className="text-sm text-gray-900 font-medium text-right">{eventData.eventName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Venue:</span>
                  <span className="text-sm text-gray-900 text-right">{eventData.venue}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Date:</span>
                  <span className="text-sm text-gray-900">{eventData.date}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Event ID:</span>
                  <span className="text-sm text-gray-900 font-mono">{eventData.eventId}</span>
                </div>
              </div>
            </div>

            {/* Attachments List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Files ({attachments.length})</h2>
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getFileIcon(attachment.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attachment.size} • Uploaded {attachment.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="flex-shrink-0 ml-4 p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Download file"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QR Code Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Share This Page</h2>
              
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white border-2 border-gray-300 rounded-lg">
                  <QRCodeSVG
                    value={pageUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center mb-4">
                Scan this QR code to access event attachments on your mobile device
              </p>

              {/* URL Display */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-1">Page URL:</p>
                <p className="text-xs text-gray-900 break-all font-mono">
                  {pageUrl}
                </p>
              </div>

              {/* Download QR Code Button */}
              <button
                onClick={() => {
                  // Download QR code as SVG
                  const svg = document.querySelector('svg');
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new window.Image();
                    
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                      const pngFile = canvas.toDataURL('image/png');
                      
                      const downloadLink = document.createElement('a');
                      downloadLink.download = `qr-code-${eventData.eventId}.png`;
                      downloadLink.href = pngFile;
                      downloadLink.click();
                    };
                    
                    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                  }
                }}
                className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download QR Code
              </button>

              {/* Info Box */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <span className="font-medium">ℹ️ Note:</span> No login required to access this page. Share the QR code or URL with event attendees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQRCodeAttachments;

