import {Separator} from "@/components/ui/separator";

export function AboutPage() {
    return (
        <section className={"mt-8"}>
            <div className="space-y-4 text-muted-foreground">
                <p>
                    I'm Mitchell, a senior full-stack engineer who loves the craft of building.
                    For over eight years, I’ve applied that passion to modernizing critical systems in the insurance,
                    banking, and government sectors, specializing in untangling legacy code and architecting new data
                    platforms.
                </p>
                <Separator />
                <p>
                    While I enjoy the technical challenge, the real reward is seeing the software I build make
                    a tangible, positive impact for the people who rely on it every day.
                </p>

                <Separator />

                <p>
                    First and foremost, I'm a husband and father to a growing family of (soon to be) five.
                    That role has taught me invaluable lessons in patience and long-term planning.
                    But the engineer in me still needs an outlet, which I find in building experimental projects
                    with Go, or playing grand strategy games with friends. And when I need a complete reset, I find
                    it in the focus and simplicity of rucking outdoors.
                </p>
            </div>
        </section>
    );
}
