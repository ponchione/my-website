import {Separator} from "@/components/ui/separator";

export function AboutPage() {
    return (
        <section className={"mt-8"}>
            <div className="space-y-4 text-muted-foreground">
                <p>
                    I'm Mitchell, a senior software engineer who loves the craft of building. For over eight years, I've applied that passion to modernizing critical systems in the insurance, banking, and government sectors — untangling legacy code, architecting data platforms, and most recently, building AI-augmented development systems that change how engineering work actually gets done.
                </p>
                <Separator />
                <p>
                    These days I spend most of my time at the intersection of software architecture and AI tooling. I build systems that orchestrate AI agents, design RAG pipelines, and figure out how to take a small concept and ship it like a big one. The craft has evolved, but the core is the same — I want to build things that work well and matter to the people using them.
                </p>

                <Separator />

                <p>
                    First and foremost, I'm a husband and father to a growing family of five. That role has taught me invaluable lessons in patience and long-term planning. But the engineer in me still needs an outlet, which I find in building experimental projects with Go, competing in action shooting sports, or playing grand strategy games with friends. And when I need a complete reset, I find it in the focus and simplicity of rucking outdoors.
                </p>
            </div>
        </section>
    );
}
