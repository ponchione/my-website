import projectsData from "@/data/projects.json";
import { ProjectListing } from "@/components/ProjectListing.tsx";
import type { PersonalProject } from "@/types";
import { useDocumentTitle } from '@/hooks/use-document-title';

const typedProjectsData: PersonalProject[] = projectsData as PersonalProject[];

export function ProjectsPage() {
    useDocumentTitle('Projects — Mitchell Ponchione');

    return (
        <div className="space-y-6 mt-6">
            <p className="text-muted-foreground">
                A collection of personal and side projects I'm currently working on or have planned.
            </p>
            {typedProjectsData.map((project) => (
                <ProjectListing key={project.id} project={project} />
            ))}
        </div>
    );
}
