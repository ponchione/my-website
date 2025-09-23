export interface IconProps {
    className?: string;
}

export type Resume = {
    experience: WorkExperience[];
    education: Education;
}

export type WorkExperience = {
    id: number;
    company: string;
    location: string;
    url: string;
    title: string;
    startDate: string;
    endDate: string;
    projects?: Project[];
    responsibilities?: string[];
}

export type Project = {
    id: number;
    project: string;
    responsibilities: string[];
}

export type Education = {
    id: number;
    school: string;
    url: string;
    level: string;
    degree: string;
    year: number;
}