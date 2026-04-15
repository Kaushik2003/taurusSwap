'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';

interface AnimationEmbedProps {
  src: string;
  title: string;
  caption: string;
  tsxSource?: string;
}

export default function AnimationEmbed({
  src,
  title,
  caption,
  tsxSource,
}: AnimationEmbedProps) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="animation-card">
      <div className="animation-card-title">{title}</div>
      <video autoPlay muted loop playsInline>
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="animation-card-caption">{caption}</div>

      {tsxSource && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowSource(!showSource)}
            className="flex items-center gap-2 text-sm font-semibold text-dark-green hover:underline"
          >
            <Code className="w-4 h-4" />
            {showSource ? 'Hide' : 'View'} .tsx source
            {showSource ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSource && (
            <pre className="mt-3 text-xs leading-relaxed">
              <code>{tsxSource}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
