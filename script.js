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
const newArrivalsGrid = document.querySelector('#new-arrivals-grid');
let baseCollectionWorks = [];
let publishedRemoteWorks = [];
let legacyCheckoutByNumber = {};
let legacySettingsByNumber = {};
const newArrivals = [
  { number: 131, title: 'Large Winter Tree No. 001', image: 'assets/new-arrivals/large-winter-tree-001.png', description: '18 × 48 in (4 ft banner)', priceCents: 20700, new_arrival: true },
  { number: 132, title: 'Large Tree No. 001', image: 'assets/new-arrivals/large-tree-001.png', description: '18 × 48 in (4 ft banner)', priceCents: 20700, new_arrival: true },
  { number: 133, title: 'Long Bird No. 001', image: 'assets/new-arrivals/long-bird-001.png', description: '18 × 48 in (4 ft banner)', priceCents: 20700, new_arrival: true },
  { number: 134, title: 'Large Tree No. 002', image: 'assets/new-arrivals/large-tree-002.png', description: '18 × 48 in (4 ft banner)', priceCents: 20700, new_arrival: true },
  { number: 135, title: 'Large Tree No. 003', image: 'assets/new-arrivals/large-tree-003.png', description: '18 × 48 in (4 ft banner)', priceCents: 20700, new_arrival: true },
  { number: 136, title: 'Study On Stillness 4 Panels (recycled paper - large)', image: 'assets/new-arrivals/study-on-stillness-4-panels.png', description: 'Approx. 12 × 14 in each · four-panel set', priceCents: 15700, new_arrival: true },
  { number: 137, title: 'Growth Enso (recycled paper - large)', image: 'assets/new-arrivals/growth-enso.png', description: '18 × 36 in (3 ft banner)', priceCents: 13200, new_arrival: true },
];
const etsyOriginals = new Set([4, 77, 95, 109, 117]);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));
const formatPrice = (priceCents) => Number.isInteger(priceCents) ? `$${(priceCents / 100).toFixed(2).replace(/\.00$/, '')}` : '';

const renderCollectionWorks = (grid, works) => {
  if (!grid) return;
  grid.innerHTML = works.map(({ number, title, image, images = [], description = '', priceCents = null, checkoutUrl = '', etsyUrl = '', availability = 'available' }, index) => {
    const isEtsyWork = Boolean(etsyUrl) || etsyOriginals.has(number);
    const isSold = availability === 'sold';
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImage = escapeHtml(image);
    const safeImages = escapeHtml(JSON.stringify([image, ...images]));
    const safeCheckoutUrl = escapeHtml(checkoutUrl);
    const safeEtsyUrl = escapeHtml(etsyUrl || 'https://www.etsy.com/shop/WATERandINKSTUDIOArt');
    const price = formatPrice(priceCents);
    const purchaseActions = isSold
      ? '<span class="collection-sold">Sold</span>'
      : isEtsyWork
      ? `<a class="collection-shop-link" href="${safeEtsyUrl}" target="_blank" rel="noreferrer">Featured on Etsy ↗</a>`
      : `${safeCheckoutUrl ? `<a class="collection-shop-link collection-buy-link" href="${safeCheckoutUrl}" target="_blank" rel="noreferrer">Buy now ↗</a>` : ''}<button class="inquiry-trigger" type="button" data-artwork-title="${safeTitle}">Purchase inquiry</button>`;
    return `
    <article class="collection-work${isEtsyWork ? ' collection-work-featured' : ''}">
      <button class="artwork-preview" type="button" data-artwork-title="${safeTitle}" data-artwork-image="${safeImage}" data-artwork-images="${safeImages}" data-artwork-description="${safeDescription}" data-artwork-price="${price}" data-checkout-url="${safeCheckoutUrl}" aria-label="View larger image of ${safeTitle}">
        <img src="${safeImage}" alt="${safeTitle} — original Water & Ink Studio artwork" ${index < 8 ? '' : 'loading="lazy"'} />
      </button>
      <div class="collection-work-meta"><h3>${safeTitle}</h3><p>Original${price ? ` · ${price}` : ''}</p>${purchaseActions}</div>
    </article>
  `;
  }).join('');
};
const withLegacyCheckouts = (works) => works.map((work) => ({
  ...work,
  title: legacySettingsByNumber[work.number]?.title ?? work.title,
  description: legacySettingsByNumber[work.number]?.description ?? work.description,
  image: legacySettingsByNumber[work.number]?.image_url ?? work.image,
  images: legacySettingsByNumber[work.number]?.additional_images ?? work.images ?? [],
  priceCents: legacySettingsByNumber[work.number]?.price_cents ?? work.priceCents,
  availability: legacySettingsByNumber[work.number]?.availability ?? work.availability ?? 'available',
  etsyUrl: legacySettingsByNumber[work.number]?.etsy_url ?? work.etsyUrl,
  is_published: legacySettingsByNumber[work.number]?.is_published ?? work.is_published ?? true,
  new_arrival: legacySettingsByNumber[work.number]?.new_arrival ?? work.new_arrival ?? false,
  checkoutUrl: (legacySettingsByNumber[work.number]?.availability ?? work.availability) === 'sold' ? '' : (legacyCheckoutByNumber[work.number]?.stripe_payment_url || work.checkoutUrl || ''),
}));
const renderArtworkCatalog = () => {
  const remoteNewArrivals = publishedRemoteWorks.filter((artwork) => artwork.new_arrival);
  const legacyWorks = withLegacyCheckouts([...newArrivals, ...baseCollectionWorks]).filter((artwork) => artwork.is_published !== false);
  renderCollectionWorks(newArrivalsGrid, [...remoteNewArrivals, ...legacyWorks.filter((artwork) => artwork.new_arrival)]);
  renderCollectionWorks(collectionGrid, [...publishedRemoteWorks, ...legacyWorks]);
};
const workTitles = {
  4: 'Rising Water No. 001', 6: 'Stone Watchtower No. 001', 7: 'Cliff Walker No. 001',
  8: 'Pine & Stone No. 001', 9: 'Enso No. 001', 10: 'Pine & Stone No. 002',
  11: 'River Serpent No. 001', 12: 'Cliff Walker No. 002', 13: 'Pine & Stone No. 003',
  14: 'Wandering Path No. 001', 15: 'Magic Experiment No. 001', 16: 'Mountain Mist No. 001',
  17: 'Pine & Stone No. 004', 18: 'Pine & River Rocks No. 001', 19: 'River Serpent No. 002',
  20: 'Pine & Stone No. 005', 21: 'Pine & Stone No. 006', 22: 'Red Sun No. 001',
  23: 'Botanical Study No. 001', 24: 'Botanical Study No. 002', 25: 'Pine & Stone No. 007',
  26: 'Bamboo Study No. 001', 28: 'Figure Study No. 001',
  29: 'Bamboo Study No. 002', 30: 'Bridging Gap No. 001', 31: 'Botanical Study No. 003',
  32: 'Mountain Mist No. 002', 33: 'Bamboo Study No. 003',
  35: 'Mountain Mist No. 003', 36: 'Botanical Study No. 004', 37: 'Bamboo Study No. 004',
  38: 'Sword Bearer No. 001', 39: 'Enso No. 002', 40: 'Path Ripples No. 001',
  41: 'Rainy Contemplation No. 001', 42: 'Color Study No. 001', 43: 'Pine & Stone No. 010',
  44: 'Red Sun No. 002', 45: 'Pine & Stone No. 011', 46: 'Quiet Shore No. 003',
  47: 'Bamboo Study No. 005', 48: 'Shrimp No. 001', 49: 'Enso No. 004',
  50: 'Ice Cream No. 001', 51: 'Red Sun No. 003', 52: 'The Three Seekers No. 001',
  53: 'Bamboo Study No. 008', 54: 'Bridge Study No. 001', 55: 'Great Wave No. 001',
  56: 'Cloud Study No. 001', 57: 'Fisher at Sea No. 001', 58: 'Mountain Mist No. 004',
  59: 'Stone Mountain No. 001', 60: 'Enso No. 005', 61: 'Mountain Mist No. 005',
  62: 'Rushing Water No. 001', 63: 'Enso No. 006', 64: 'Enso No. 007',
  65: 'River Serpent No. 003', 66: 'Untitled Original No. 066', 67: 'Calligraphy Study No. 001',
  68: 'Two Trees, Two Panels', 69: 'Calligraphy Study No. 002', 70: 'Bamboo Study No. 009',
  71: 'Ink Totem No. 001', 72: 'Starting the Path No. 001', 73: 'Enso No. 008',
  74: 'Enso No. 009', 75: 'Edge No. 001', 76: 'Untitled Original No. 076',
  77: 'Enso No. 010', 78: 'Red Sun No. 004', 79: 'Mountain Mist No. 007',
  80: 'Octopus No. 001', 81: 'Ink Cloud No. 001', 82: 'Origami Study No. 001',
  83: 'Origami Study No. 002', 84: 'Pine & Stone No. 012', 85: 'Enso No. 011',
  86: 'Untitled Original No. 086', 87: 'Bird Study No. 001', 88: 'Architectural Study No. 001',
  89: 'Architectural Study No. 002', 90: 'Architectural Study No. 003', 91: 'Architectural Study No. 004',
  92: 'Architectural Study No. 005', 93: 'Pine & Stone No. 013', 94: 'Village Color No. 001',
  95: 'Bird Study No. 005', 96: 'Untitled Original No. 096', 97: 'Market Study No. 001',
  98: 'Box Study No. 001', 99: 'Mushroom Study No. 004', 100: 'Wave Enso No. 002',
  101: 'Enso No. 012', 102: 'Bamboo Study No. 010', 103: 'Path Walker No. 002',
  104: 'Bird Study No. 002', 105: 'Mushroom Study No. 001', 106: 'Untitled Original No. 106',
  107: 'Mushroom Study No. 002', 108: 'Yokai Study No. 001', 109: 'Bird Study No. 003',
  110: 'Blossom Tree No. 002', 111: 'Mushroom Study No. 003', 112: 'Mountain Mist No. 008',
  113: 'Daruma No. 001', 114: 'Octopus No. 002', 115: 'Rushing Water No. 002',
  116: 'Cradled Log No. 001',
};
const staticArtworkUpdates = {
  15: { priceCents: 13200 },
  23: { priceCents: 5500 },
  24: { priceCents: 5500 },
  40: { priceCents: 13200 },
  49: { priceCents: 5500 },
  52: { priceCents: 8200 },
  60: { priceCents: 13200 },
  63: { priceCents: 13200 },
  64: { priceCents: 13200 },
  65: { priceCents: 5500 },
  73: { priceCents: 13200 },
  74: { priceCents: 13200 },
  77: { priceCents: 13200 },
  85: { priceCents: 13200 },
  100: { description: '18 × 36 in (3 ft banner)', priceCents: 18200 },
  103: { priceCents: 13200 },
  117: { priceCents: 13200 },
  118: { availability: 'sold' },
  120: { priceCents: 5500 },
  122: { priceCents: 8200 },
  124: { priceCents: 5500 },
  127: { priceCents: 5500 },
  128: { priceCents: 5500 },
};
const portraitOriginals = new Set([
  1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 48, 49, 50, 51, 52, 53, 54, 55, 58, 59, 60, 63, 64, 65,
  118, 119, 120, 121, 122, 123, 124, 127, 128, 129, 130,
]);
const bannerOriginals = new Set([14, 30, 57, 61, 62]);
const guessedArtworkPricing = (number) => {
  if (bannerOriginals.has(number)) return { description: '18 × 36 in (3 ft banner)', priceCents: 13200 };
  if (portraitOriginals.has(number)) return { description: '8.5 × 11 in', priceCents: 4200 };
  return { description: 'Approx. 18 × 18 in', priceCents: 5500 };
};

if (collectionGrid) {
  const namedOriginals = {
    116: { title: 'Cradled Log', image: 'assets/collection/cradled-log.jpg' },
    117: { title: 'Bamboo Study No. 015', image: 'assets/collection/bamboo-study-015.png' },
    118: { title: 'Mountain Mist No. 009', image: 'assets/collection/mountain-mist-009.png' },
    119: { title: 'Pine & Stone No. 014', image: 'assets/collection/pine-and-stone-014.png' },
    120: { title: 'Tokyo Ramen No. 001', image: 'assets/collection/tokyo-ramen-001.png' },
    121: { title: 'Enso No. 013', image: 'assets/collection/enso-013.png' },
    122: { title: 'Three Peaks No. 001', image: 'assets/collection/three-peaks-001.png' },
    123: { title: 'Mountain Mist No. 010', image: 'assets/collection/mountain-mist-010.png' },
    124: { title: 'Osaka Fish Market No. 001', image: 'assets/collection/osaka-fish-market-001.png' },
    125: { title: 'Pine & Stone No. 015', image: 'assets/collection/pine-and-stone-015.png' },
    126: { title: 'Tokyo Corner Market No. 001', image: 'assets/collection/tokyo-corner-market-001.png' },
    127: { title: 'Steamed Bun Stand No. 001', image: 'assets/collection/steamed-bun-stand-001.png' },
    128: { title: 'Enso No. 014', image: 'assets/collection/enso-014.png' },
    129: { title: 'Study in Stillness', image: 'assets/collection/study-in-stillness.png' },
    130: { title: 'Enso No. 15 “Growth”', image: 'assets/collection/enso-015-growth.png' },
  };

  const excludedOriginals = new Set([1, 2, 3, 5, 27, 34, 66, 76, 86, 96, 106, 129, 130]);
  const collectionWorks = Array.from({ length: 130 }, (_, index) => index + 1)
    .filter((number) => !excludedOriginals.has(number))
    .map((number) => {
    const title = workTitles[number] ?? `Untitled Original No. ${String(number).padStart(3, '0')}`;
    const extension = number <= 115 ? 'png' : 'jpg';
    const image = `assets/collection/original-${String(number).padStart(3, '0')}.${extension}`;
    return { number, ...(namedOriginals[number] ?? { title, image }), ...guessedArtworkPricing(number), ...(staticArtworkUpdates[number] ?? {}) };
  })
    .sort((a, b) => Number(etsyOriginals.has(b.number)) - Number(etsyOriginals.has(a.number)));

  baseCollectionWorks = collectionWorks;
  // Used by the owner-only store setup page to create checkout links for the
  // existing catalog. This is public catalog information, never credentials.
  window.WATER_AND_INK_STATIC_ARTWORKS = [...newArrivals, ...baseCollectionWorks];
  renderArtworkCatalog();
}

window.addEventListener('studio-artworks-ready', ({ detail: artworks }) => {
  if (!Array.isArray(artworks)) return;
  publishedRemoteWorks = artworks.map((artwork) => ({
    number: artwork.id,
    title: artwork.title,
    image: artwork.imageUrl,
    description: artwork.description,
    priceCents: artwork.price_cents,
    checkoutUrl: artwork.stripe_payment_url,
    etsyUrl: artwork.etsy_url,
  }));
  renderArtworkCatalog();
});

window.addEventListener('legacy-store-links-ready', ({ detail: links }) => {
  legacyCheckoutByNumber = Object.fromEntries(links.map((link) => [link.legacy_number, link]));
  renderArtworkCatalog();
});

window.addEventListener('legacy-artwork-settings-ready', ({ detail: settings }) => {
  legacySettingsByNumber = Object.fromEntries(settings.map((setting) => [setting.legacy_number, setting]));
  renderArtworkCatalog();
});

const inquiryDialog = document.querySelector('#inquiry-dialog');
const inquiryForm = document.querySelector('#inquiry-form');
const artworkDialog = document.querySelector('#artwork-dialog');

const openInquiry = (artworkTitle) => {
  inquiryDialog.querySelector('#inquiry-artwork').textContent = artworkTitle;
  inquiryForm.elements.artwork.value = artworkTitle;
  inquiryDialog.showModal();
};

document.addEventListener('click', (event) => {
  const inquiryTrigger = event.target.closest('.inquiry-trigger');
  if (inquiryTrigger) {
    openInquiry(inquiryTrigger.dataset.artworkTitle);
    return;
  }
  const preview = event.target.closest('.artwork-preview');
  if (!preview) return;
  const { artworkTitle, artworkImage, artworkDescription, artworkPrice, checkoutUrl } = preview.dataset;
  let artworkImages = [artworkImage];
  try { artworkImages = JSON.parse(preview.dataset.artworkImages || '[]').filter(Boolean); } catch { /* primary image remains */ }
  artworkDialog.querySelector('#artwork-preview-image').src = artworkImage;
  artworkDialog.querySelector('#artwork-preview-image').alt = artworkTitle;
  const thumbnails = artworkDialog.querySelector('#artwork-preview-thumbnails');
  thumbnails.replaceChildren(...artworkImages.map((image, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `View image ${index + 1}`);
    const thumb = document.createElement('img'); thumb.src = image; thumb.alt = ''; button.append(thumb);
    button.addEventListener('click', () => { artworkDialog.querySelector('#artwork-preview-image').src = image; }); return button;
  }));
  artworkDialog.querySelector('#artwork-preview-title').textContent = artworkTitle;
  artworkDialog.querySelector('#artwork-preview-description').textContent = artworkDescription;
  artworkDialog.querySelector('#artwork-preview-price').textContent = artworkPrice;
  artworkDialog.querySelector('#artwork-preview-inquiry').dataset.artworkTitle = artworkTitle;
  const buyButton = artworkDialog.querySelector('#artwork-preview-buy');
  buyButton.href = checkoutUrl || '#';
  buyButton.hidden = !checkoutUrl;
  artworkDialog.showModal();
});

document.querySelector('#artwork-preview-inquiry')?.addEventListener('click', (event) => {
  artworkDialog.close();
  openInquiry(event.currentTarget.dataset.artworkTitle);
});

inquiryForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(inquiryForm);
  const subject = `Purchase inquiry: ${data.get('artwork')}`;
  const body = `Artwork: ${data.get('artwork')}\nName: ${data.get('name')}\nEmail: ${data.get('email')}\n\nMessage:\n${data.get('message')}`;
  window.location.href = `mailto:waterandinkstudio@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  inquiryDialog.close();
});
