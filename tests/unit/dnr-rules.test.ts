import { describe, expect, it } from 'vitest';
import { buildDocumentRedirectRules } from '../../extension/chrome/src/background/dnr-rules';

describe('buildDocumentRedirectRules', () => {
  it('redirects CSV and TSV document responses to the viewer with the original URL in the hash', () => {
    const rules = buildDocumentRedirectRules('chrome-extension://abc/viewer.html');

    expect(rules).toHaveLength(4);
    expect(rules[0]).toMatchObject({
      action: {
        type: 'redirect',
        redirect: {
          regexSubstitution: 'chrome-extension://abc/viewer.html#\\0'
        }
      },
      condition: {
        regexFilter: '^https?://.*\\.csv([?#].*)?$',
        isUrlFilterCaseSensitive: false,
        resourceTypes: ['main_frame']
      }
    });
  });

  it('excludes attachment responses from every redirect rule', () => {
    const rules = buildDocumentRedirectRules('chrome-extension://abc/viewer.html');

    expect(
      rules.every((rule) =>
        rule.condition.excludedResponseHeaders?.some(
          (header) =>
            header.header === 'content-disposition' &&
            header.values?.includes('*attachment*')
        )
      )
    ).toBe(true);
  });
});
