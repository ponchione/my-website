import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatPostDate, getAllPosts, type BlogPost } from '@/lib/posts';

function BlogListItem({ post }: { post: BlogPost }) {
    return (
        <Link to={`/blog/${post.slug}`} className="group block">
            <div className="flex items-start justify-between gap-4 py-4 motion-safe:transition-colors motion-safe:duration-150">
                <div className="min-w-0 space-y-1">
                    <div className="font-semibold leading-snug group-hover:underline">
                        {post.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span>{formatPostDate(post.date)}</span>
                        <span>&middot;</span>
                        <span>{post.readingTime}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                    </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground motion-safe:transition-all motion-safe:duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
        </Link>
    );
}

export function BlogPage() {
    useDocumentTitle('Blog — Mitchell Ponchione');

    const sortedPosts = getAllPosts();

    return (
        <div className="mt-6">
            <header className="space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-[-0.025em]">Blog</h1>
                <p className="text-muted-foreground">
                    I don't expect anyone to ever read these.
                </p>
            </header>
            <div className="divide-y divide-border">
                {sortedPosts.map((post) => (
                    <BlogListItem key={post.slug} post={post} />
                ))}
            </div>
        </div>
    );
}
