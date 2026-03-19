import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function NotFoundPage() {
    useDocumentTitle('Not Found — Mitchell Ponchione');

    return (
        <div className="mt-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
            <p className="text-muted-foreground">
                The page you were looking for does not exist or has moved.
            </p>
            <Link to="/" className="inline-flex text-sm hover:underline">
                Return home
            </Link>
        </div>
    );
}
