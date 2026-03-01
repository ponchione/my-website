import skillsData from "@/data/skills.json";
import { Badge } from "@/components/ui/badge";
import type { SkillsData } from "@/types";

const typedSkillsData: SkillsData = skillsData as SkillsData;

export function SkillsPage() {
    return (
        <div className="space-y-6 mt-6">
            <p className="text-muted-foreground">
                Technologies and tools I work with across the full stack.
            </p>
            {typedSkillsData.categories.map((category) => (
                <div key={category.name} className="space-y-3">
                    <h2 className="text-lg font-semibold">{category.name}</h2>
                    <div className="flex flex-wrap gap-2">
                        {category.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
