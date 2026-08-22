/**
 * Validaciones enfocadas del branding visual del frontend.
 *
 * Verifica la integración de los logotipos oficiales y la paleta corporativa
 * principal en las páginas estáticas de la plataforma.
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const frontendDir = path.join(repoRoot, 'frontend');

function readFrontendFile(...segments: string[]): string {
  return fs.readFileSync(path.join(frontendDir, ...segments), 'utf8');
}

describe('frontend branding refresh', () => {
  it('expone los logotipos oficiales dentro de los assets del frontend', () => {
    const brandLogoPath = path.join(frontendDir, 'assets/img/NESGESFinance_Logo.jpg');
    const bitcoinAssetPath = path.join(frontendDir, 'assets/img/NGF-BTC-AM.png');

    expect(fs.existsSync(brandLogoPath)).toBe(true);
    expect(fs.existsSync(bitcoinAssetPath)).toBe(true);
    expect(fs.statSync(brandLogoPath).size).toBeLessThanOrEqual(100 * 1024);
    expect(fs.statSync(bitcoinAssetPath).size).toBeLessThanOrEqual(300 * 1024);
  });

  it('define la paleta corporativa oficial en el tema global', () => {
    const css = readFrontendFile('assets/css/main.css');

    expect(css).toContain('--color-fondo: #0F172A;');
    expect(css).toContain('--color-superficie: #1A2D4D;');
    expect(css).toContain('--color-azul: #0B3C8A;');
    expect(css).toContain('--color-naranja: #F7931A;');
    expect(css).toContain('--color-verde: #2EAF6D;');
    expect(css).toContain('--gradiente-marca: linear-gradient(135deg, var(--color-azul) 0%, var(--color-azul-brillo) 48%, var(--color-naranja) 100%);');
    expect(css).toContain('.btn,');
    expect(css).toContain('.boton {');
  });

  it('usa el logotipo institucional en la navegación y el activo NGF-BTC-AM en páginas Bitcoin/RWA', () => {
    const navPages = [
      'index.html',
      'institucional.html',
      'dashboard1.html',
      'dashboard2.html',
      'explorer.html',
      'rwa-marketplace.html',
      'proyectos.html',
    ];

    for (const page of navPages) {
      const html = readFrontendFile(page);
      expect(html).toContain('meta name="theme-color" content="#0F172A"');
      expect(html).toContain('src="assets/img/NESGESFinance_Logo.jpg"');
    }

    const bitcoinPages = [
      'index.html',
      'institucional.html',
      'dashboard1.html',
      'dashboard2.html',
      'explorer.html',
      'rwa-marketplace.html',
      'proyectos.html',
      'dashboard-unificado.html',
    ];

    for (const page of bitcoinPages) {
      expect(readFrontendFile(page)).toContain('NGF-BTC-AM');
    }
  });
});
