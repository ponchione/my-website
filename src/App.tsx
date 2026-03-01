import { Routes, Route } from 'react-router-dom';
import { AboutPage } from './components/pages/AboutPage';
import { WorkHistoryPage } from './components/pages/WorkHistoryPage';
import { ProjectsPage } from './components/pages/ProjectsPage';
import { SkillsPage } from './components/pages/SkillsPage';
import { BlogPage } from './components/pages/BlogPage';
import { SideNav, MobileHeader, MobileFooter } from "@/components/SideNav.tsx";

function App() {
  return (
      <div className="container mx-auto max-w-5xl">
          <MobileHeader />
          <div className="flex gap-12">
              <aside className="sticky top-0 h-screen flex-shrink-0 py-16 sm:py-24 hidden md:flex">
                  <SideNav />
              </aside>
              <div className="flex flex-1 flex-col min-h-screen py-8 md:py-16 lg:py-24 px-4 md:px-0">
                  <main className="flex-1">
                      <Routes>
                          <Route path="/" element={<AboutPage />} />
                          <Route path="/work-history" element={<WorkHistoryPage />} />
                          <Route path="/projects" element={<ProjectsPage />} />
                          <Route path="/skills" element={<SkillsPage />} />
                          <Route path="/blog" element={<BlogPage />} />
                          <Route path="/blog/:slug" element={<BlogPage />} />
                      </Routes>
                  </main>
              </div>
          </div>
          <MobileFooter />
      </div>
  )
}

export default App
