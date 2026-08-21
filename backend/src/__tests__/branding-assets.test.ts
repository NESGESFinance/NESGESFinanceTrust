import fs from 'node:fs';
import path from 'node:path';

describe('branding assets', () => {
  const repositoryRoot = path.resolve(__dirname, '../../..');
  const readmePath = path.join(repositoryRoot, 'README.md');
  const brandingGuidePath = path.join(repositoryRoot, 'docs', 'BRANDING.md');
  const manifestPath = path.join(repositoryRoot, 'assets', 'manifest.json');
  const ecosystemLogoPath = path.join(repositoryRoot, 'assets', 'logos', 'NESGESFinance_Logo.jpg');
  const bitcoinLogoPath = path.join(repositoryRoot, 'assets', 'logos', 'NGF-BTC-AM.jpg');

  it('publica los dos logos oficiales en assets/logos', () => {
    expect(fs.existsSync(ecosystemLogoPath)).toBe(true);
    expect(fs.existsSync(bitcoinLogoPath)).toBe(true);
  });

  it('documenta el branding en README y guía dedicada', () => {
    const readme = fs.readFileSync(readmePath, 'utf8');
    const brandingGuide = fs.readFileSync(brandingGuidePath, 'utf8');

    expect(readme).toContain('## 🎨 Branding y Logotipos');
    expect(readme).toContain('assets/logos/NESGESFinance_Logo.jpg');
    expect(readme).toContain('assets/logos/NGF-BTC-AM.jpg');
    expect(readme).toContain('docs/BRANDING.md');

    expect(brandingGuide).toContain('NESGESFinance Blue');
    expect(brandingGuide).toContain('Bitcoin Orange');
    expect(brandingGuide).toContain('Accent Green');
  });

  it('expone metadatos consistentes en el manifest de assets', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      logos: Array<{ id: string; path: string; format: string }>;
      palette: Record<string, string>;
    };

    expect(manifest.logos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'nesgesfinance-ecosystem',
          path: 'assets/logos/NESGESFinance_Logo.jpg',
          format: 'jpg',
        }),
        expect.objectContaining({
          id: 'ngf-btc-am',
          path: 'assets/logos/NGF-BTC-AM.jpg',
          format: 'jpg',
        }),
      ]),
    );

    expect(manifest.palette).toMatchObject({
      'NESGESFinance Blue': '#0B3C8A',
      'Bitcoin Orange': '#F7931A',
      'Accent Green': '#2EAF6D',
    });
  });
});
