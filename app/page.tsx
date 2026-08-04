'use client';

import { useRef } from 'react';

export default function HomePage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  function injectPatch() {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc || doc.getElementById('v20-scenario-patch')) return;

    const script = doc.createElement('script');
    script.id = 'v20-scenario-patch';
    script.src = '/v20-scenario-patch.js?v=cgt-explain-2';
    doc.body.appendChild(script);
  }

  return (
    <iframe
      ref={iframeRef}
      src="/move_budget_checker_v20.html"
      title="이사계획 세후 예산 판단 대시보드 v20"
      onLoad={injectPatch}
      style={{
        width: '100%',
        minHeight: '100vh',
        height: '100dvh',
        border: 0,
        display: 'block',
        background: '#f1f5f9',
      }}
    />
  );
}
