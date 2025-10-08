import React from "react";
import { Image, ExternalLink } from "lucide-react";

export const PNGToSVGCTA: React.FC = () => {
  return (
    <a
      href="/png-to-svg-converter.html"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg font-medium text-sm transition-colors duration-200 border border-green-300"
    >
      <Image className="h-4 w-4" />
      PNG to SVG
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};
