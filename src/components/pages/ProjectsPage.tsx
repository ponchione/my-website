import projectsData from "@/data/projects.json";
import { ProjectListing } from "@/components/ProjectListing.tsx";
import type { PersonalProject } from "@/types";
import { useDocumentTitle } from '@/hooks/use-document-title';

const typedProjectsData: PersonalProject[] = projectsData as PersonalProject[];

export function ProjectsPage() {
    useDocumentTitle('Projects — Mitchell Ponchione');

    return (
        <div className="mt-6">
            <header className="space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-[-0.025em]">Projects</h1>
                <p className="text-muted-foreground">
                    A collection of personal and side projects I'm currently working on or have planned.
                </p>
            </header>
            <div className="space-y-4">
                {typedProjectsData.map((project) => (
                    <ProjectListing key={project.id} project={project} />
                ))}
            </div>
        </div>
    );
}
