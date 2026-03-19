import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.tsx'
import {BrowserRouter} from "react-router-dom";
import { ScrollToTop } from './components/ScrollToTop.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="dark">
          <BrowserRouter>
              <ScrollToTop />
              <App />
          </BrowserRouter>
      </ThemeProvider>
  </StrictMode>,
)
