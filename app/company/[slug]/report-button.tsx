'use client';

import { useState, useTransition } from 'react';
import { reportComment } from '../../actions';

export default function ReportButton({ commentId }: { commentId: string }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <p className="small muted" style={{ margin: '6px 0 0' }}>Thanks, we&apos;ll review it.</p>;
  return (
    <button
      className="linkbtn"
      disabled={pending}
      onClick={() => {
        const reason = window.prompt('What’s wrong with this comment? (optional)') ?? '';
        start(async () => {
          const r = await reportComment(commentId, reason);
          if (r.ok) setDone(true);
        });
      }}
    >
      Report this
    </button>
  );
}
