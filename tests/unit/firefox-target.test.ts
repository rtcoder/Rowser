import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Firefox build target', () => {
  it('exposes package scripts for building, packaging, and remote-code checks', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['build:firefox']).toBe(
      'tsc --noEmit && vite build --config extension/firefox/vite.config.ts'
    );
    expect(packageJson.scripts['package:firefox']).toBe(
      'sh scripts/package-extension.sh firefox'
    );
    expect(packageJson.scripts['verify:no-remote-code:firefox']).toBe(
      'sh scripts/verify-no-remote-code.sh firefox'
    );
  });

  it('uses a Firefox-compatible manifest without Chromium-only DNR permissions', () => {
    const manifest = JSON.parse(
      readFileSync('extension/firefox/public/manifest.json', 'utf8')
    ) as {
      manifest_version: number;
      background: { scripts?: string[]; service_worker?: string };
      browser_specific_settings?: { gecko?: { id?: string; data_collection_permissions?: unknown } };
      permissions?: string[];
      content_security_policy?: { extension_pages?: string };
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background.scripts).toEqual(['background.js']);
    expect(manifest.background.service_worker).toBeUndefined();
    expect(manifest.permissions).not.toContain('declarativeNetRequest');
    expect(manifest.browser_specific_settings?.gecko?.id).toBe('@rowser');
    expect(manifest.browser_specific_settings?.gecko?.data_collection_permissions).toEqual({
      required: ['none']
    });
    expect(manifest.content_security_policy?.extension_pages).toContain("'wasm-unsafe-eval'");
  });
});
