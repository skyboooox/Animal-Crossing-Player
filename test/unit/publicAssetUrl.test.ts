import { describe, expect, it } from 'vitest';
import { getPublicAssetUrl } from '../../src/L4_Atom/utils/publicAssetUrl';

describe('public asset URL resolution', () => {
  it('prefixes root-relative public assets with the deployment base', () => {
    expect(getPublicAssetUrl('/assets/icons/nook1.svg', '/preview/')).toBe('/preview/assets/icons/nook1.svg');
  });

  it('keeps external URLs unchanged', () => {
    expect(getPublicAssetUrl('https://example.com/icon.svg', '/preview/')).toBe('https://example.com/icon.svg');
  });
});
