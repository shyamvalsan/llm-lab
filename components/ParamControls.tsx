'use client';
import React, { useState } from 'react';

export type Params = {
  temperature?: number;   // 0–2
  top_p?: number;         // 0–1 (not wired to calls yet)
  n?: number;             // only shown if provided
  max_tokens?: number;    // (not wired yet)
};

export default function ParamControls({
  params,
  setParams,
}: {
  params: Params;
  setParams: (p: Params) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const t = params.temperature ?? 1.0;
  const n = params.n;

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition"
        >
          <span className="text-xs">{expanded ? '▼' : '▶'}</span>
          Advanced Settings
          <span className="small opacity-70 ml-2">Temperature: {t}</span>
        </button>
      </div>
      
      {expanded && (
        <div className="grid gap-4 md:grid-cols-2 pt-2">
          {/* Temperature */}
          <label className="text-sm">
            <div className="small mb-1">
              Temperature <span className="small opacity-70">(0–2)</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                className="flex-1"
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={t}
                onChange={(e) =>
                  setParams({ ...params, temperature: Number(e.target.value) })
                }
              />
              <input
                className="input w-20"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={t}
                onChange={(e) =>
                  setParams({ ...params, temperature: Number(e.target.value) })
                }
              />
            </div>
          </label>

          {/* N (shown only if caller supplied it) */}
          {typeof n !== 'undefined' && (
            <label className="text-sm">
              <div className="small mb-1">N (samples)</div>
              <input
                className="input w-28"
                type="number"
                min={1}
                max={100}
                step={1}
                value={n}
                onChange={(e) =>
                  setParams({ ...params, n: Math.max(1, Number(e.target.value)) })
                }
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

