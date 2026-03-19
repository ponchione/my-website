import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatPostDate, getAllPosts, getPostBySlug } from '@/lib/posts';
import './PostPage.css';

export function PostPage() {
    const { slug } = useParams<{ slug: string }>();
    const allPosts = getAllPosts();
    const post = slug ? getPostBySlug(slug) : null;
    const currentIndex = post ? allPosts.findIndex((entry) => entry.slug === post.slug) : -1;
    const previousPost = currentIndex >= 0 ? allPosts[currentIndex + 1] ?? null : null;
    const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
    const title = post ? `${post.title} — Mitchell Ponchione` : 'Not Found — Mitchell Ponchione';

    useDocumentTitle(title);

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
                <p className="text-muted-foreground">
                    {formatPostDate(post.date)} &middot; {post.readingTime}
                </p>
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

            <div className="flex justify-between gap-6 border-t pt-6">
                <div className="min-w-0 flex-1">
                    {previousPost ? (
                        <Link
                            to={`/blog/${previousPost.slug}`}
                            className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <span className="block">← Previous Post</span>
                            <span className="mt-1 block font-medium text-foreground">{previousPost.title}</span>
                        </Link>
                    ) : null}
                </div>
                <div className="min-w-0 flex-1 text-right">
                    {nextPost ? (
                        <Link
                            to={`/blog/${nextPost.slug}`}
                            className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <span className="block">Next Post →</span>
                            <span className="mt-1 block font-medium text-foreground">{nextPost.title}</span>
                        </Link>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
