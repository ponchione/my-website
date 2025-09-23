import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import InitialsIcon from '@/components/icons/InitialsIcon';


export function SideNav() {
    return (
        <nav className="flex w-50 flex-col gap-4">
            <NavLink to="/" className="group">
                <div className="flex items-center gap-3 p-2 transition-colors rounded-md">
                    <InitialsIcon />
                </div>
            </NavLink>
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
            </div>
        </nav>
    );
}