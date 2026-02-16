import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { DemoRoleProvider } from './demoRole';
import { appTheme } from './theme/theme';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <DemoRoleProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DemoRoleProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
