'use client';

import { useRef } from 'react';

export default function HomePage() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  function injectPatch() {
    const iframe = iframeRef.current;
    const iframeDoc = iframe?.contentDocument;
    const iframeBody = iframeDoc?.body;
    if (!iframeDoc || !iframeBody) return;

    const appendTargetPriceHardSync = () => {
      if (iframeDoc.getElementById('target-price-hard-sync')) return;
      const syncScript = iframeDoc.createElement('script');
      syncScript.id = 'target-price-hard-sync';
      syncScript.src = '/target-price-hard-sync.js?v=target-price-fix-1';
      iframeBody.appendChild(syncScript);
    };

    const appendFinalUiPatch = () => {
      const existingFinal = iframeDoc.getElementById('final-ui-patch');
      if (existingFinal) {
        appendTargetPriceHardSync();
        return;
      }

      const finalScript = iframeDoc.createElement('script');
      finalScript.id = 'final-ui-patch';
      finalScript.src = '/final-ui-patch.js?v=target-result-sync-1';
      finalScript.onload = appendTargetPriceHardSync;
      iframeBody.appendChild(finalScript);
    };

    if (iframeDoc.getElementById('v20-scenario-patch')) {
      appendFinalUiPatch();
      return;
    }

    const script = iframeDoc.createElement('script');
    script.id = 'v20-scenario-patch';
    script.src = '/v20-scenario-patch.js?v=cgt-explain-2';
    script.onload = appendFinalUiPatch;
    iframeBody.appendChild(script);
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
