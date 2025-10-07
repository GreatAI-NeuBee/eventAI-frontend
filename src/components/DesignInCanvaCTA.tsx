import React from "react";
import { ExternalLink, Palette } from "lucide-react";

export const DesignInCanvaCTA: React.FC = () => {
  return (
    <a
      href="/design-in-canva.html"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg"
    >
      <Palette className="h-4 w-4" />
      Design in Canva
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

