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
        <div className="space-y-6 mt-6">
            {experience.map((job, index) => (
                <WorkListing key={job.id} job={job} initialExpanded={index === 0} />
            ))}

            <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-muted-foreground">Education</p>
                <Card>
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
