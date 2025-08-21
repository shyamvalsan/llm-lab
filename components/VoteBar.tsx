'use client';
import { useState } from 'react';
import { sendVote } from '@/lib/vote';

type ModelRef = { provider: string; id: string };

function anonId() {
  let id = localStorage.getItem('anon_id');
  if (!id) {
    id = Math.random().toString(36).slice(2);
    localStorage.setItem('anon_id', id);
  }
  return id;
}

export default function VoteBar({
  models,
  meta,
}: {
  models: ModelRef[];
  meta?: any;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function vote(modelId: string | 'tie') {
    if (sending) return;
    setPicked(modelId);
    setSending(true);
    try {
      await sendVote({
        type: 'compare_vote',
        anon_id: anonId(),
        choice: modelId,
        models,
        meta,
        timestamp: new Date().toISOString(),
        source: 'oss_v8.0',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card p-4 flex flex-wrap items-center gap-2">
      <div className="small mr-2">Pick the best output:</div>
      {models.map((m) => {
        const id = `${m.provider}:${m.id}`;
        const active = picked === id;
        return (
          <button
            key={id}
            className="button"
            onClick={() => vote(id)}
            disabled={!!picked}
            aria-pressed={active}
            title={`${m.provider} / ${m.id}`}
          >
            {m.provider}/{m.id}
          </button>
        );
      })}
      <span className="small mx-2">or</span>
      <button
        className="button"
        onClick={() => vote('tie')}
        disabled={!!picked}
        title="No clear winner"
      >
        Tie
      </button>
      {picked && (
        <span className="small ml-2">
          {sending ? 'Recording vote…' : 'Thanks! Vote recorded.'}
        </span>
      )}
    </div>
  );
}

