import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { parseFrontmatter } from '@/lib/frontmatter';
import './PostPage.css';

const postFiles = import.meta.glob('/src/data/posts/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

function getPost(slug: string) {
    const key = `/src/data/posts/${slug}.md`;
    const raw = postFiles[key];
    if (!raw) return null;

    const { data, content } = parseFrontmatter(raw);
    return {
        title: data.title as string,
        date: data.date as string,
        tags: (data.tags ?? []) as string[],
        content,
    };
}

export function PostPage() {
    const { slug } = useParams<{ slug: string }>();

    if (!slug) {
        return (
            <div className="space-y-4 mt-6">
                <p className="text-muted-foreground">Post not found.</p>
                <Link to="/blog" className="inline-flex items-center gap-1 text-sm hover:underline">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Blog
                </Link>
            </div>
        );
    }

    const post = getPost(slug);

    if (!post) {
        return (
            <div className="space-y-4 mt-6">
                <p className="text-muted-foreground">Post not found.</p>
                <Link to="/blog" className="inline-flex items-center gap-1 text-sm hover:underline">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Blog
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-6">
            <Link
                to="/blog"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
            </Link>

            <header className="space-y-3">
                <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
                <p className="text-muted-foreground">{formatDate(post.date)}</p>
                <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                </div>
            </header>

            <div className="post-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.content}
                </ReactMarkdown>
            </div>
        </div>
    );
}
