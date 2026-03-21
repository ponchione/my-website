import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
                <h1 className="text-3xl font-bold tracking-[-0.025em]">{post.title}</h1>
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

            <div className="space-y-6">
                <Separator />
                <nav className="flex justify-between gap-6">
                    <div className="min-w-0 flex-1">
                        {previousPost ? (
                            <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                    <ArrowLeft className="h-4 w-4" />
                                    Previous Post
                                </span>
                                <Link
                                    to={`/blog/${previousPost.slug}`}
                                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {previousPost.title}
                                </Link>
                            </div>
                        ) : null}
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                        {nextPost ? (
                            <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                    Next Post
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                                <Link
                                    to={`/blog/${nextPost.slug}`}
                                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {nextPost.title}
                                </Link>
                            </div>
                        ) : null}
                    </div>
                </nav>
            </div>
        </div>
    );
}
