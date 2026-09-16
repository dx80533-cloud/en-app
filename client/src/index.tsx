import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';


import RoutesComponent from './app.tsx';
import './index.css';
import { createPortal } from 'react-dom';
import { Toaster } from '@client/src/components/ui/sonner';

const CLIENT_BASE_PATH = '/';

const MainApp = () => {
  return (
    <BrowserRouter basename={CLIENT_BASE_PATH}>
      <ErrorBoundary
        fallbackRender={({ error }: { error: unknown }) => (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>頁面發生錯誤</h2>
            <p style={{ color: '#666' }}>{error instanceof Error ? error.message : '未知錯誤'}</p>
          </div>
        )}
      >
        <RoutesComponent />
        {createPortal(<Toaster />, document.body)}
      </ErrorBoundary>
    </BrowserRouter>
  );
};

createRoot(document.getElementById('root')!).render(<MainApp />);
