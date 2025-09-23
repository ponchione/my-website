import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import InitialsIcon from '@/components/icons/InitialsIcon';
import { cn } from '@/lib/utils';

const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        "w-full justify-start",
        isActive
    );

export function SideNav() {
    return (
        <nav className="flex w-50 flex-col gap-4">
            <NavLink to="/" className="group">
                <div className="flex items-center gap-3 p-2 transition-colors rounded-md">
                    <InitialsIcon />
                </div>
            </NavLink>
            <div className="flex flex-col gap-2">
                <NavLink to="/">
                    {({ isActive }) => (
                        <Button variant="ghost" className={getNavLinkClass({ isActive })}>
                            About
                        </Button>
                    )}
                </NavLink>
                {/*<NavLink to="/projects">*/}
                {/*    {({ isActive }) => (*/}
                {/*        <Button variant="ghost" className={getNavLinkClass({ isActive })}>*/}
                {/*            Projects*/}
                {/*        </Button>*/}
                {/*    )}*/}
                {/*</NavLink>*/}
                <NavLink to="/work-history">
                    {({ isActive }) => (
                        <Button variant="ghost" className={getNavLinkClass({ isActive })}>
                            Work History
                        </Button>
                    )}
                </NavLink>
            </div>
        </nav>
    );
}