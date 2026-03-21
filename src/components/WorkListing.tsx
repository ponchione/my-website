import type { WorkExperience } from "@/types";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

type WorkListingProps = {
    job: WorkExperience;
    initialExpanded?: boolean;
}

const motionTransition = {
    duration: 0.2,
    ease: 'easeInOut' as const,
};

export function WorkListing({ job, initialExpanded = false }: WorkListingProps) {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const prefersReducedMotion = useReducedMotion();
    const transition = prefersReducedMotion ? { duration: 0 } : motionTransition;

    const toggleExpanded = () => {
        setIsExpanded((value) => !value);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleExpanded();
        }
    };

    return (
        <Card className="overflow-hidden gap-0 py-0 border-t-2 border-t-foreground/5">
            <CardHeader
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={toggleExpanded}
                onKeyDown={handleKeyDown}
                className="cursor-pointer rounded-none px-6 py-6 motion-safe:transition-all motion-safe:duration-200 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <CardTitle className="hover:underline">
                    <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {job.company}
                    </a>
                </CardTitle>
                <CardDescription>{job.title}</CardDescription>
                <CardDescription>{job.startDate} - {job.endDate} &middot; {job.location}</CardDescription>
                <CardAction>
                    <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={transition}
                        className="flex text-muted-foreground"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </motion.span>
                </CardAction>
            </CardHeader>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={transition}
                        className="overflow-hidden"
                    >
                        <CardContent className="space-y-4 px-6 pb-6">
                            <ul className="list-disc pl-4 space-y-1">
                                {job.responsibilities?.map((point, index) => (
                                    <li key={index}>{point}</li>
                                ))}
                            </ul>

                            {job.projects && job.projects.length > 0 && (
                                <div className="space-y-4">
                                    {job.projects.map((project) => (
                                        <div key={project.id}>
                                            <h5 className="font-semibold text-primary/90">{project.project}</h5>
                                            <ul className="list-disc pl-4 space-y-1 mt-1">
                                                {project.responsibilities.map((resp, index) => (
                                                    <li key={index}>{resp}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4">
                                <h4 className="text-sm font-semibold mb-2 text-primary/70">Technologies Used:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {job.skills?.map((skill, index) => (
                                        <Badge key={index} variant="secondary">{skill}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
