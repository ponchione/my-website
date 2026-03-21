import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import InitialsIcon from '@/components/icons/InitialsIcon';
import GithubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import MailIcon from '@/components/icons/MailIcon';
import CopyrightIcon from '@/components/icons/CopyrightIcon';

const activeClasses = 'bg-accent text-accent-foreground dark:bg-accent/50';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const { pathname } = useLocation();

    const isActive = (path: string) => {
        if (path === '/blog') {
            return pathname === '/blog' || pathname.startsWith('/blog/');
        }
        return pathname === path;
    };

    return (
        <div className="flex flex-col gap-2">
            <Button variant="ghost" asChild className={cn("w-full justify-start motion-safe:transition-colors motion-safe:duration-150", isActive('/') && activeClasses)}>
                <NavLink to="/" onClick={onNavigate}>
                    About
                </NavLink>
            </Button>
            <Button variant="ghost" asChild className={cn("w-full justify-start motion-safe:transition-colors motion-safe:duration-150", isActive('/work-history') && activeClasses)}>
                <NavLink to="/work-history" onClick={onNavigate}>
                    Work History
                </NavLink>
            </Button>
            <Button variant="ghost" asChild className={cn("w-full justify-start motion-safe:transition-colors motion-safe:duration-150", isActive('/projects') && activeClasses)}>
                <NavLink to="/projects" onClick={onNavigate}>
                    Projects
                </NavLink>
            </Button>
            <Button variant="ghost" asChild className={cn("w-full justify-start motion-safe:transition-colors motion-safe:duration-150", isActive('/blog') && activeClasses)}>
                <NavLink to="/blog" onClick={onNavigate}>
                    Blog
                </NavLink>
            </Button>
        </div>
    );
}

function SocialLinks() {
    return (
        <div className="flex space-x-1">
            <a
                href="https://github.com/ponchione"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
            >
                <Button variant="ghost" size="icon" className="motion-safe:transition-transform motion-safe:duration-150 hover:scale-105">
                    <GithubIcon className="h-5 w-5" />
                </Button>
            </a>
            <a
                href="https://www.linkedin.com/in/mitchell-ponchione/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
            >
                <Button variant="ghost" size="icon" className="motion-safe:transition-transform motion-safe:duration-150 hover:scale-105">
                    <LinkedInIcon className="h-5 w-5" />
                </Button>
            </a>
            <a href="mailto:mitchell.ponchione@gmail.com" aria-label="Email">
                <Button variant="ghost" size="icon" className="motion-safe:transition-transform motion-safe:duration-150 hover:scale-105">
                    <MailIcon className="h-5 w-5" />
                </Button>
            </a>
        </div>
    );
}

function Copyright() {
    return (
        <div className="flex space-x-2 text-sm text-muted-foreground px-2 pb-2">
            <CopyrightIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{new Date().getFullYear()} Mitchell Ponchione</span>
        </div>
    );
}

function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" disabled aria-label="Toggle theme">
                <Sun className="h-5 w-5" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
            ) : (
                <Moon className="h-5 w-5" />
            )}
        </Button>
    );
}

export function MobileHeader() {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

    // Close the sheet when the viewport transitions to desktop
    useEffect(() => {
        if (!isMobile) {
            setOpen(false);
        }
    }, [isMobile]);

    return (
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3">
            <div className="flex items-center gap-3">
                <InitialsIcon />
                <span className="text-lg font-bold tracking-tight text-primary">
                    Mitchell Ponchione
                </span>
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(true)}
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </Button>
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <nav className="flex-1 px-4">
                        <NavLinks onNavigate={() => setOpen(false)} />
                    </nav>
                    <SheetFooter>
                        <Separator />
                        <div className="flex items-center justify-between px-2">
                            <SocialLinks />
                            <ThemeToggle />
                        </div>
                        <Copyright />
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </header>
    );
}

export function MobileFooter() {
    return (
        <footer className="md:hidden border-t py-4">
            <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                    <SocialLinks />
                    <ThemeToggle />
                </div>
                <Copyright />
            </div>
        </footer>
    );
}

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
                        Software Engineer · AI Systems
                    </p>
                </div>

                {/* Navigation links */}
                <NavLinks />
            </div>

            {/* Social links and copyright */}
            <div className="flex flex-col gap-3">
                <Separator />
                <div className="flex items-center justify-between px-2">
                    <SocialLinks />
                    <ThemeToggle />
                </div>
                <Copyright />
            </div>
        </nav>
    );
}
