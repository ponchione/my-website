import { useState, useEffect } from 'react';
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

const reducedMotionVariants = {
    initial: {
        opacity: 1,
        y: 0,
    },
    animate: {
        opacity: 1,
        y: 0,
    },
    exit: {
        opacity: 1,
        y: 0,
    },
};

const pageTransition = {
    duration: 0.25,
    ease: 'easeInOut' as const,
};

const reducedMotionTransition = {
    duration: 0,
};

export function AnimatedOutlet() {
    const location = useLocation();
    const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => {
            setPrefersReducedMotion(mql.matches);
        };
        mql.addEventListener('change', onChange);
        setPrefersReducedMotion(mql.matches);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    const variants = prefersReducedMotion ? reducedMotionVariants : pageVariants;
    const transition = prefersReducedMotion ? reducedMotionTransition : pageTransition;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={location.pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
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
