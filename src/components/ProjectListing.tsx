import type { PersonalProject } from "@/types";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge";

type ProjectListingProps = {
    project: PersonalProject;
}

function StatusBadge({ status }: { status: PersonalProject["status"] }) {
    const styles: Record<PersonalProject["status"], string> = {
        "In Progress": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        "Planned": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
        "Complete": "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
        "V1": "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20",
    };

    return (
        <Badge className={styles[status]}>
            {status}
        </Badge>
    );
}

export function ProjectListing({ project }: ProjectListingProps) {
    return (
        <Card className="border-t-2 border-t-foreground/5 motion-safe:transition-all motion-safe:duration-200 hover:shadow-sm hover:border-foreground/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {project.github_url ? (
                        <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                        >
                            {project.name}
                        </a>
                    ) : (
                        project.name
                    )}
                    <StatusBadge status={project.status} />
                </CardTitle>
                <CardDescription>{project.description}</CardDescription>
            </CardHeader>

            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Last updated: {project.updated}
                </p>

                <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                </div>

                {project.github_url && (
                    <div className="mt-4">
                        <a
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            github.com/{project.github_url.replace("https://github.com/", "")}
                        </a>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
