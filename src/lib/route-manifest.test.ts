import { describe, expect, it } from 'vitest';
import { buildKnownRoutePaths } from '@/lib/route-manifest';

describe('buildKnownRoutePaths', () => {
  it('includes every static route and blog post route', () => {
    const paths = buildKnownRoutePaths(['software_goes_to_zero']);

    expect(paths).toContain('/');
    expect(paths).toContain('/work-history');
    expect(paths).toContain('/projects');
    expect(paths).toContain('/blog');
    expect(paths).toContain('/blog/software_goes_to_zero');
  });
});
