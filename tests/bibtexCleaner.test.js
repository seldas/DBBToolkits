import { describe, expect, it } from 'vitest';
import { cleanBibTeX, wrapCapitalizedTitleWords } from '../src/writing/bibtexCleaner.js';

describe('bibtexCleaner', () => {
    it('wraps capitalized acronyms and proper nouns in titles while skipping stop words', () => {
        const title = 'A Survey of CNN and GPT-3 for Medical Imaging in IEEE';
        const wrapped = wrapCapitalizedTitleWords(title);
        expect(wrapped).toBe('A {Survey} of {CNN} and {GPT-3} for {Medical} {Imaging} in {IEEE}');
    });

    it('strips abstract, keywords, and extra fields while preserving DOI', () => {
        const raw = `
@article{smith2024,
  title = {Deep Learning for MRI},
  author = {Smith, Jane},
  journal = {Nature Methods},
  abstract = {Long abstract text.},
  keywords = {MRI, CNN},
  url = {https://example.com},
  file = {/tmp/paper.pdf},
  doi = {10.1038/s41592-024-0001}
}`;
        const cleaned = cleanBibTeX(raw, {
            stripAbstract: true,
            stripKeywords: true,
            stripExtras: true,
            keepDoi: true,
            wrapTitles: true,
            dedup: false,
        });

        expect(cleaned).not.toContain('abstract');
        expect(cleaned).not.toContain('keywords');
        expect(cleaned).not.toContain('url =');
        expect(cleaned).not.toContain('file =');
        expect(cleaned).toContain('doi = {10.1038/s41592-024-0001}');
        expect(cleaned).toContain('{MRI}');
    });

    it('deduplicates entries by DOI, title, or citation key', () => {
        const raw = `
@article{k1,
  title = {Attention Is All You Need},
  doi = {https://doi.org/10.5555/1234}
}
@inproceedings{k2,
  title = {Attention Is All You Need},
  doi = {10.5555/1234}
}
@article{k1,
  title = {Different Paper Same Key}
}`;
        const cleaned = cleanBibTeX(raw, { dedup: true });
        expect(cleaned.match(/@/g)?.length).toBe(1);
        expect(cleaned).toContain('@article{k1,');
    });

    it('preserves @string and @preamble blocks', () => {
        const raw = `@string{icml = "ICML"}\n@article{a1, title={Test}}`;
        const cleaned = cleanBibTeX(raw, { dedup: true });
        expect(cleaned).toContain('@string{icml = "ICML"}');
        expect(cleaned).toContain('@article{a1,');
    });
});
