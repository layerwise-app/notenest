// Built-in page covers: Notion-style solid colors and gradients. A page's
// `cover` is `gradient:<id>`, or an image URL.

export const COVER_GRADIENTS: { id: string; css: string }[] = [
  { id: 'sunrise', css: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
  { id: 'lagoon', css: 'linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)' },
  { id: 'meadow', css: 'linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)' },
  { id: 'dusk', css: 'linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%)' },
  { id: 'ember', css: 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'night', css: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  { id: 'paper', css: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' },
  { id: 'peach', css: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { id: 'aurora', css: 'linear-gradient(120deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'ocean', css: 'linear-gradient(160deg, #0093e9 0%, #80d0c7 100%)' },
  { id: 'red', css: '#e16259' },
  { id: 'yellow', css: '#f5c242' },
  { id: 'blue', css: '#337ea9' },
  { id: 'green', css: '#448361' },
  { id: 'beige', css: '#e9e5e3' },
  { id: 'ink', css: '#2f3437' }
];

export function coverStyle(cover: string | null): { background?: string; image?: string } {
  if (!cover) return {};
  if (cover.startsWith('gradient:')) {
    const preset = COVER_GRADIENTS.find((item) => item.id === cover.slice(9));
    return { background: preset?.css ?? COVER_GRADIENTS[0].css };
  }
  return /^(https?:\/\/|\/api\/files\/)/.test(cover) ? { image: cover } : {};
}

export const randomCover = () => `gradient:${COVER_GRADIENTS[Math.floor(Math.random() * 10)].id}`;
