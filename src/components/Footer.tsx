import { Button } from '@/components/ui/button';
import GithubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import FacebookIcon from '@/components/icons/FacebookIcon';
import CopyrightIcon from '@/components/icons/CopyrightIcon';

export function Footer() {
    return (
        <footer className={"mt-16 flex items-center justify-between"}>
            <div className={"flex space-x-2 text-sm text-muted-foreground"}>
                <CopyrightIcon className={"h-5 w-5"}/>
                <span>2025 Mitchell Ponchione</span>
            </div>
            <div className={"flex space-x-1"}>
                <a
                    href={"https://github.com/ponchione"}
                    target={"_blank"}
                    rel="noopener noreferrer"
                >
                    <Button variant={"ghost"} size={"icon"}>
                        <GithubIcon className={"h-5 w-5"}/>
                    </Button>
                </a>
                <a
                    href={"https://www.linkedin.com/in/mitchell-ponchione/"}
                    target={"_blank"}
                    rel="noopener noreferrer"
                >
                    <Button variant={"ghost"} size={"icon"}>
                        <LinkedInIcon className={"h-5 w-5"}/>
                    </Button>
                </a>
                <a
                    href={"https://www.facebook.com/ponchione"}
                    target={"_blank"}
                    rel="noopener noreferrer"
                >
                    <Button variant={"ghost"} size={"icon"}>
                        <FacebookIcon className={"h-5 w-5"}/>
                    </Button>
                </a>
            </div>
        </footer>
    );
}