import { Link } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatPostDate, getAllPosts, type BlogPost } from '@/lib/posts';

function BlogCard({ post }: { post: BlogPost }) {
    return (
        <Link to={`/blog/${post.slug}`} className="block group">
            <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{formatPostDate(post.date)}</span>
                        <span className="hidden sm:inline">&middot;</span>
                        <span>{post.readingTime}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p>{post.excerpt}</p>

                    <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                    </div>

                    <div className="flex justify-end text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        <span className="inline-flex items-center gap-1">
                            Read
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export function BlogPage() {
    useDocumentTitle('Blog — Mitchell Ponchione');

    const sortedPosts = getAllPosts();

    return (
        <div className="space-y-6 mt-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
                <p className="text-muted-foreground">
                    Thoughts and reflections on software engineering and technology.
                </p>
            </header>
            {sortedPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
            ))}
        </div>
    );
}
