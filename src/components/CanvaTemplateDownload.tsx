import React from "react";
import { Download, FileText } from "lucide-react";

export const CanvaTemplateDownload: React.FC = () => {
  const handleDownload = () => {
    // Create a link to download the template
    const link = document.createElement('a');
    link.href = '/canva-venue-template.svg';
    link.download = 'venue-layout-template.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium text-sm transition-colors duration-200 border border-gray-300"
    >
      <FileText className="h-4 w-4" />
      Download Template
      <Download className="h-3 w-3" />
    </button>
  );
};
