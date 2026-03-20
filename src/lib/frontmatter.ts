/**
 * Browser-safe frontmatter parser. Splits markdown on `---` delimiters
 * and parses the YAML frontmatter into a plain object.
 *
 * CONSTRAINTS — this parser handles only:
 * - Simple key: value pairs (string values)
 * - Flat arrays using `- item` syntax
 *
 * It does NOT support and will silently produce wrong results for:
 * - Values containing colons (e.g., excerpt: "AI: A New Era")
 * - Multi-line strings or YAML block scalars (| or >)
 * - Nested objects
 * - Inline flow syntax (e.g., tags: [AI, Business])
 *
 * Keep frontmatter fields simple. If richer YAML is ever needed,
 * replace this with the `gray-matter` npm package.
 */
export function parseFrontmatter(raw: string): { data: Record<string, unknown>; content: string } {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) {
        return { data: {}, content: raw };
    }

    const [, yamlBlock, content] = match;
    const data: Record<string, unknown> = {};

    let currentKey = '';
    let inArray = false;

    for (const line of yamlBlock.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (inArray && trimmed.startsWith('- ')) {
            const arr = data[currentKey] as unknown[];
            arr.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
            continue;
        }

        inArray = false;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;

        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();

        if (value === '') {
            data[key] = [];
            currentKey = key;
            inArray = true;
        } else {
            data[key] = value.replace(/^["']|["']$/g, '');
        }
    }

    return { data, content };
}
