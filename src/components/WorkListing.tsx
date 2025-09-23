import type { WorkExperience } from "@/types";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card.tsx";
import {Badge} from "@/components/ui/badge";

type WorkListingProps = {
    job: WorkExperience
}

export function WorkListing({ job }: WorkListingProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="hover:underline">
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                        {job.company}
                    </a>
                </CardTitle>
                <CardDescription>{job.title}</CardDescription>
                <CardDescription>{job.startDate} - {job.endDate} &middot; {job.location}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <ul className="list-disc pl-4 space-y-1">
                    {job.responsibilities?.map((point, index) => (
                        <li key={index}>{point}</li>
                    ))}
                </ul>

                {job.projects && job.projects.length > 0 && (
                    <div>
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
                    </div>
                )}

                <div className={"mt-4"}>
                    <h4 className={"text-sm font-semibold mb-2 text-primary/70"}>Technologies Used:</h4>
                    <div className="flex flex-wrap gap-2">
                        {job.skills?.map((skill, index) => (
                            <Badge key={index} variant={"secondary"}>{skill}</Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}