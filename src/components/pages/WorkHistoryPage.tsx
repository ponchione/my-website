import resumeData from "@/data/resume.json";
import { WorkListing } from "@/components/WorkListing.tsx";
import type { Resume } from '@/types';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx';
import { useDocumentTitle } from '@/hooks/use-document-title';

const typedResumeData: Resume = resumeData;

export function WorkHistoryPage() {
    useDocumentTitle('Work History — Mitchell Ponchione');

    const { experience, education } = typedResumeData;

    return (
        <div className="mt-6">
            <header className="space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-[-0.025em]">Work History</h1>
            </header>

            <div className="space-y-4">
                {experience.map((job, index) => (
                    <WorkListing key={job.id} job={job} initialExpanded={index === 0} />
                ))}
            </div>

            <div className="space-y-3 pt-8">
                <p className="text-sm font-medium text-muted-foreground">Education</p>
                <Card className="border-t-2 border-t-foreground/5">
                    <CardHeader>
                        <CardTitle>
                            <a
                                href={education.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                {education.school}
                            </a>
                        </CardTitle>
                        <CardDescription>
                            {education.level} in {education.degree}
                        </CardDescription>
                        <CardDescription>{education.year}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
