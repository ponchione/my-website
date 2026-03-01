import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import InitialsIcon from '@/components/icons/InitialsIcon';
import GithubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import MailIcon from '@/components/icons/MailIcon';
import CopyrightIcon from '@/components/icons/CopyrightIcon';


export function SideNav() {
    return (
        <nav className="flex w-50 flex-col justify-between h-full">
            <div className="flex flex-col gap-4">
                {/* Identity section */}
                <NavLink to="/" className="group">
                    <div className="flex items-center gap-3 p-2 transition-colors rounded-md">
                        <InitialsIcon />
                    </div>
                </NavLink>
                <div className="flex flex-col px-2">
                    <h1 className="text-lg font-bold tracking-tight text-primary">
                        Mitchell Ponchione
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Senior Full-Stack Engineer
                    </p>
                </div>

                {/* Navigation links */}
                <div className="flex flex-col gap-2">
                    <Button variant="ghost" asChild className={"w-full justify-start"}>
                        <NavLink to={"/"}>
                            About
                        </NavLink>
                    </Button>
                    <Button variant="ghost" asChild className={"w-full justify-start"}>
                        <NavLink to={"/work-history"}>
                            Work History
                        </NavLink>
                    </Button>
                    <Button variant="ghost" asChild className={"w-full justify-start"}>
                        <NavLink to={"/projects"}>
                            Projects
                        </NavLink>
                    </Button>
                    <Button variant="ghost" asChild className={"w-full justify-start"}>
                        <NavLink to={"/skills"}>
                            Skills
                        </NavLink>
                    </Button>
                </div>
            </div>

            {/* Social links and copyright */}
            <div className="flex flex-col gap-3">
                <Separator />
                <div className="flex space-x-1">
                    <a
                        href={"https://github.com/ponchione"}
                        target={"_blank"}
                        rel="noopener noreferrer"
                    >
                        <Button variant={"ghost"} size={"icon"}>
                            <GithubIcon className={"h-5 w-5"} />
                        </Button>
                    </a>
                    <a
                        href={"https://www.linkedin.com/in/mitchell-ponchione/"}
                        target={"_blank"}
                        rel="noopener noreferrer"
                    >
                        <Button variant={"ghost"} size={"icon"}>
                            <LinkedInIcon className={"h-5 w-5"} />
                        </Button>
                    </a>
                    <a
                        href={"mailto:placeholder@example.com"}
                    >
                        <Button variant={"ghost"} size={"icon"}>
                            <MailIcon className={"h-5 w-5"} />
                        </Button>
                    </a>
                </div>
                <div className="flex space-x-2 text-sm text-muted-foreground px-2 pb-2">
                    <CopyrightIcon className={"h-4 w-4 flex-shrink-0 mt-0.5"} />
                    <span>2025 Mitchell Ponchione</span>
                </div>
            </div>
        </nav>
    );
}
