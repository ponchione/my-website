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

const typedPostsData: PostMeta[] = postsData as PostMeta[];

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function BlogCard({ post }: { post: PostMeta }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="hover:underline">
                    <Link to={`/blog/${post.slug}`}>
                        {post.title}
                    </Link>
                </CardTitle>
                <CardDescription>{formatDate(post.date)}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <p>{post.excerpt}</p>

                <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function BlogPage() {
    const sortedPosts = [...typedPostsData].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div className="space-y-6 mt-6">
            <p className="text-muted-foreground">
                Thoughts, tutorials, and reflections on software engineering and technology.
            </p>
            {sortedPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
            ))}
        </div>
    );
}
