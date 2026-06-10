import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const url = process.env.QARENA_LOCAL_URL || 'http://localhost:5173/';
const viewports = [
  { name: 'desktop-1440', width: 1440, height: 1024 },
  { name: 'laptop-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);

    const res = await page.evaluate(() => {
      const issues = [];
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // horizontal scroll
      const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const hasHorizontalScroll = docWidth > vw + 1; // tolerance
      if (hasHorizontalScroll) issues.push('Horizontal scroll detected: document width ' + docWidth + ' > viewport ' + vw);

      // check for elements spilling right beyond viewport
      const overflowEls = [];
      const all = Array.from(document.querySelectorAll('body *'));
      for (const el of all) {
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 1) {
          // ignore offscreen elements like fixed overlays off-right
          if (rect.left <= vw) overflowEls.push({ tag: el.tagName, class: el.className, right: rect.right });
        }
      }
      if (overflowEls.length) issues.push('Elements overflow right: ' + JSON.stringify(overflowEls.slice(0, 10)));

      // buttons overlap: find visible buttons in preview areas and check intersections
      const buttonSelectors = Array.from(document.querySelectorAll('button, a'))
        .filter((el) => {
          const s = window.getComputedStyle(el);
          return s.visibility !== 'hidden' && s.display !== 'none' && el.getBoundingClientRect().width > 20 && el.getBoundingClientRect().height > 10;
        });
      const overlaps = [];
      function intersect(a, b) {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      }
      for (let i = 0; i < buttonSelectors.length; i++) {
        for (let j = i + 1; j < buttonSelectors.length; j++) {
          const ra = buttonSelectors[i].getBoundingClientRect();
          const rb = buttonSelectors[j].getBoundingClientRect();
          if (intersect(ra, rb)) {
            overlaps.push({ a: buttonSelectors[i].innerText.slice(0, 20), b: buttonSelectors[j].innerText.slice(0, 20) });
          }
        }
      }
      if (overlaps.length) issues.push('Button overlaps: ' + JSON.stringify(overlaps.slice(0, 10)));

      // check table broken layout: any table cell wider than viewport
      const tables = Array.from(document.querySelectorAll('table'));
      const tableIssues = [];
      for (const t of tables) {
        const rect = t.getBoundingClientRect();
        if (rect.width > vw + 1) tableIssues.push({ width: rect.width, html: t.outerHTML.slice(0, 200) });
      }
      if (tableIssues.length) issues.push('Table width > viewport: ' + JSON.stringify(tableIssues.slice(0, 3)));

      // check for forbidden strings in DOM text
      const pageText = document.body.innerText || '';
      const forbidden = ['question_text', 'question_text_raw', 'sample_questions', 'related_questions', 'score_breakdown', 'full prediction report', 'PDF', 'generated_answer', 'answer'];
      const foundForbidden = forbidden.filter((f) => pageText.includes(f));
      if (foundForbidden.length) issues.push('Forbidden text found: ' + foundForbidden.join(', '));

      // check locked preview presence
      const locked = Array.from(document.querySelectorAll('body *')).some((el) => (el.innerText || '').toLowerCase().includes('register to unlock') || (el.innerText || '').toLowerCase().includes('preview locked'));
      if (!locked) issues.push('Locked preview text not found (expected "Register to unlock" or similar)');

      return { hasHorizontalScroll, issues, viewport: { vw, vh }, numButtons: buttonSelectors.length };
    });

    results.push({ viewport: vp.name, ...res });
  }

  await browser.close();
  const out = path.resolve(process.cwd(), 'screenshots', 'qa-results.json');
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  console.log('Saved QA results to', out);
})();
