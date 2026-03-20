import type { Post } from '@/types';
import { parseFrontmatter } from '@/lib/frontmatter';
import { getReadingTime } from '@/lib/reading-time';

const postFiles = import.meta.glob('/src/data/posts/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>;

export type BlogPost = Post & {
    readingTime: string;
};

export function formatPostDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

function getSlugFromPath(path: string): string {
    return path.split('/').pop()?.replace(/\.md$/, '') ?? path;
}

function parsePost(path: string, raw: string): BlogPost {
    const { data, content } = parseFrontmatter(raw);

    return {
        slug: getSlugFromPath(path),
        title: String(data.title ?? ''),
        date: String(data.date ?? ''),
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        excerpt: String(data.excerpt ?? ''),
        content,
        readingTime: getReadingTime(content),
    };
}

const allPosts = Object.entries(postFiles)
    .map(([path, raw]) => parsePost(path, raw))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getAllPosts(): BlogPost[] {
    return allPosts;
}

export function getPostBySlug(slug: string): BlogPost | null {
    return allPosts.find((post) => post.slug === slug) ?? null;
}
