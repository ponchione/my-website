import resumeData from "@/data/resume.json";
import { WorkListing } from "@/components/WorkListing.tsx";
import type { Resume } from '@/types';

const typedResumeData: Resume = resumeData;

export function WorkHistoryPage() {
    return (
        <div className="space-y-6 mt-6">
            {typedResumeData.experience.map((job) => (
                <WorkListing key={job.id} job={job} />
            ))}
        </div>
    );
}