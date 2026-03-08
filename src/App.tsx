import { SideNav, MobileHeader, MobileFooter } from "@/components/SideNav.tsx";
import { AnimatedOutlet } from "@/components/AnimatedOutlet.tsx";
import { Analytics } from "@vercel/analytics/react";

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
                      <AnimatedOutlet />
                  </main>
              </div>
          </div>
          <MobileFooter />
          <Analytics />
      </div>
  )
}

export default App
