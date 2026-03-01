import { useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AboutPage } from './pages/AboutPage';
import { WorkHistoryPage } from './pages/WorkHistoryPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SkillsPage } from './pages/SkillsPage';
import { BlogPage } from './pages/BlogPage';
import { PostPage } from './pages/PostPage';

const pageVariants = {
    initial: {
        opacity: 0,
        y: 8,
    },
    animate: {
        opacity: 1,
        y: 0,
    },
    exit: {
        opacity: 0,
        y: -8,
    },
};

const pageTransition = {
    duration: 0.25,
    ease: 'easeInOut' as const,
};

export function AnimatedOutlet() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
            >
                <Routes location={location}>
                    <Route path="/" element={<AboutPage />} />
                    <Route path="/work-history" element={<WorkHistoryPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/skills" element={<SkillsPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<PostPage />} />
                </Routes>
            </motion.div>
        </AnimatePresence>
    );
}
