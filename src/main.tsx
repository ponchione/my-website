import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.tsx'
import {BrowserRouter} from "react-router-dom";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <ThemeProvider attribute="class" defaultTheme="dark">
          <BrowserRouter>
              <App />
          </BrowserRouter>
      </ThemeProvider>
  </StrictMode>,
)
