import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function NotFoundPage() {
    useDocumentTitle('Not Found — Mitchell Ponchione');

    return (
        <div className="mt-16 space-y-6">
            <h1 className="text-4xl font-bold tracking-tight">404</h1>
            <p className="text-muted-foreground text-lg">
                This page doesn't exist — but the rest of the site does.
            </p>
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground motion-safe:transition-colors motion-safe:duration-150"
            >
                <ArrowLeft className="h-4 w-4" />
                Back home
            </Link>
        </div>
    );
}
