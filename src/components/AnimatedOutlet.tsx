import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })));
const WorkHistoryPage = lazy(() =>
    import('./pages/WorkHistoryPage').then((module) => ({ default: module.WorkHistoryPage })),
);
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then((module) => ({ default: module.BlogPage })));
const PostPage = lazy(() => import('./pages/PostPage').then((module) => ({ default: module.PostPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

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

function RouteFallback() {
    return <div className="mt-6 text-sm text-muted-foreground">Loading...</div>;
}

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
                <Suspense fallback={<RouteFallback />}>
                    <Routes location={location}>
                        <Route path="/" element={<AboutPage />} />
                        <Route path="/work-history" element={<WorkHistoryPage />} />
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/:slug" element={<PostPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </motion.div>
        </AnimatePresence>
    );
}
