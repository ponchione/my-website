import { Link } from 'react-router-dom';
import postsData from "@/data/posts/index.json";
import type { PostMeta } from '@/types';
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

const typedPostsData: PostMeta[] = postsData as PostMeta[];

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

function BlogCard({ post }: { post: PostMeta }) {
    return (
        <Link to={`/blog/${post.slug}`} className="block group">
            <Card className="transition-colors hover:bg-accent/50">
                <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                    <CardDescription>{formatDate(post.date)}</CardDescription>
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

    const sortedPosts = [...typedPostsData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="space-y-6 mt-6">
            <p className="text-muted-foreground">
                Thoughts and reflections on software engineering and technology.
            </p>
            {sortedPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
            ))}
        </div>
    );
}
