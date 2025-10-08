import React from "react";
import { Wrench, ExternalLink } from "lucide-react";

export const ViewBoxFixerCTA: React.FC = () => {
  return (
    <a
      href="/viewbox-fixer.html"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-2 rounded-lg font-medium text-sm transition-colors duration-200 border border-orange-300"
    >
      <Wrench className="h-4 w-4" />
      Fix ViewBox
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};
