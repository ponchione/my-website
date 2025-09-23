import { Routes, Route } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { AboutPage } from './components/pages/AboutPage';
import { WorkHistoryPage } from './components/pages/WorkHistoryPage';
import {SideNav} from "@/components/SideNav.tsx";

function App() {
  return (
      <div className={"container mx-auto max-w-5xl"}>
          <div className={"flex gap-12"}>
              <aside className={"sticky top-0 h-screen flex-shrink-0 py-16 sm:py-24"}>
                  <SideNav />
              </aside>
              <div className={"flex flex-1 flex-col py-16 sm:py-24 min-h-screen"}>
                  <Header />
                  <main className={"flex-1"}>
                      <Routes>
                          <Route path="/" element={<AboutPage />} />
                          <Route path="/work-history" element={<WorkHistoryPage />} />
                      </Routes>
                  </main>
                  <Footer />
              </div>
          </div>
      </div>
  )
}

export default App
