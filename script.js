const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('nav');

toggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', isOpen);
  toggle.textContent = isOpen ? 'Close' : 'Menu';
});

document.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = 'Menu';
}));

document.querySelector('#year').textContent = new Date().getFullYear();

const collectionGrid = document.querySelector('#collection-grid');
const workTitles = {
  4: 'Rising Water No. 001', 6: 'Stone Watchtower No. 001', 7: 'Cliff Walker No. 001',
  8: 'Pine & Stone No. 001', 9: 'Enso No. 001', 10: 'Pine & Stone No. 002',
  11: 'River Serpent No. 001', 12: 'Cliff Walker No. 002', 13: 'Pine & Stone No. 003',
  14: 'Water Ripples No. 001', 15: 'Quiet Shore No. 001', 16: 'Mountain Mist No. 001',
  17: 'Pine & Stone No. 004', 18: 'Mountain Tiger No. 001', 19: 'River Serpent No. 002',
  20: 'Pine & Stone No. 005', 21: 'Pine & Stone No. 006', 22: 'Red Sun No. 001',
  23: 'Botanical Study No. 001', 24: 'Botanical Study No. 002', 25: 'Pine & Stone No. 007',
  26: 'Bamboo Study No. 001', 27: 'Spring Shore No. 001', 28: 'Figure Study No. 001',
  29: 'Bamboo Study No. 002', 30: 'Quiet Shore No. 002', 31: 'Botanical Study No. 003',
  32: 'Mountain Mist No. 002', 33: 'Bamboo Study No. 003', 34: 'Blossom Tree No. 001',
  35: 'Mountain Mist No. 003', 36: 'Botanical Study No. 004', 37: 'Bamboo Study No. 004',
  38: 'Pine & Stone No. 008', 39: 'Enso No. 002', 40: 'Water Ripples No. 002',
  41: 'Pine & Stone No. 009', 42: 'Color Study No. 001', 43: 'Pine & Stone No. 010',
  44: 'Red Sun No. 002', 45: 'Pine & Stone No. 011', 46: 'Quiet Shore No. 003',
  47: 'Bamboo Study No. 005', 48: 'Enso No. 003', 49: 'Enso No. 004',
  50: 'Bamboo Study No. 006', 51: 'Red Sun No. 003', 52: 'Bamboo Study No. 007',
  53: 'Bamboo Study No. 008', 54: 'Bridge Study No. 001', 55: 'Great Wave No. 001',
  56: 'Cloud Study No. 001', 57: 'Ink Village No. 001', 58: 'Mountain Mist No. 004',
  59: 'Stone Mountain No. 001', 60: 'Enso No. 005', 61: 'Mountain Mist No. 005',
  62: 'Rushing Water No. 001', 63: 'Enso No. 006', 64: 'Enso No. 007',
  65: 'River Serpent No. 003', 66: 'Untitled Original No. 066', 67: 'Calligraphy Study No. 001',
  68: 'Mountain Mist No. 006', 69: 'Calligraphy Study No. 002', 70: 'Bamboo Study No. 009',
  71: 'Ink Totem No. 001', 72: 'Landscape Panels No. 001', 73: 'Enso No. 008',
  74: 'Enso No. 009', 75: 'Quiet Shore No. 004', 76: 'Untitled Original No. 076',
  77: 'Enso No. 010', 78: 'Red Sun No. 004', 79: 'Mountain Mist No. 007',
  80: 'Octopus No. 001', 81: 'Ink Cloud No. 001', 82: 'Quiet Shore No. 005',
  83: 'Cliff Walker No. 003', 84: 'Pine & Stone No. 012', 85: 'Enso No. 011',
  86: 'Untitled Original No. 086', 87: 'Bird Study No. 001', 88: 'Architectural Study No. 001',
  89: 'Architectural Study No. 002', 90: 'Architectural Study No. 003', 91: 'Architectural Study No. 004',
  92: 'Architectural Study No. 005', 93: 'Cliff Walker No. 004', 94: 'Village Color No. 001',
  95: 'Brush Study No. 001', 96: 'Untitled Original No. 096', 97: 'Market Study No. 001',
  98: 'Box Study No. 001', 99: 'Quiet Shore No. 006', 100: 'Blue Wave No. 001',
  101: 'Enso No. 012', 102: 'Bamboo Study No. 010', 103: 'River Serpent No. 004',
  104: 'Bird Study No. 002', 105: 'Mushroom Study No. 001', 106: 'Untitled Original No. 106',
  107: 'Mushroom Study No. 002', 108: 'Red Sun No. 005', 109: 'Bird Study No. 003',
  110: 'Blossom Tree No. 002', 111: 'Mushroom Study No. 003', 112: 'Mountain Mist No. 008',
  113: 'Daruma No. 001', 114: 'Octopus No. 002', 115: 'Rushing Water No. 002',
  116: 'Cradled Log No. 001',
};

if (collectionGrid) {
  const namedOriginals = {
    116: { title: 'Cradled Log', image: 'assets/collection/cradled-log.jpg' },
  };

  const excludedOriginals = new Set([1, 2, 3, 5, 66, 76, 86, 96, 106]);
  const collectionWorks = Array.from({ length: 116 }, (_, index) => index + 1)
    .filter((number) => !excludedOriginals.has(number))
    .map((number) => {
    const title = workTitles[number] ?? `Untitled Original No. ${String(number).padStart(3, '0')}`;
    const extension = number <= 115 ? 'png' : 'jpg';
    const image = `assets/collection/original-${String(number).padStart(3, '0')}.${extension}`;
    return namedOriginals[number] ?? { title, image };
    });

  collectionGrid.innerHTML = collectionWorks.map(({ title, image }, index) => `
    <article class="collection-work">
      <a href="https://www.etsy.com/shop/WATERandINKSTUDIOArt" target="_blank" rel="noreferrer" aria-label="View ${title} in the Etsy shop">
        <img src="${image}" alt="${title} — original Water & Ink Studio artwork" ${index < 8 ? '' : 'loading="lazy"'} />
        <div class="collection-work-meta"><h3>${title}</h3><p>Original · Etsy shop</p></div>
      </a>
    </article>
  `).join('');
}
