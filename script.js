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
const collectionSeries = [
  'Rising Water', 'Red Sun', 'Cliff Walker', 'Mountain Mist',
  'Pine & Stone', 'Enso Current', 'Bamboo Study', 'Quiet Shore',
  'Lantern Path', 'Mushroom Study', 'Small Wonders', 'Ink Horizon',
];

if (collectionGrid) {
  const collectionWorks = Array.from({ length: 131 }, (_, index) => {
    const title = `${collectionSeries[index % collectionSeries.length]} No. ${String(index + 1).padStart(3, '0')}`;
    const extension = index < 115 ? 'png' : 'jpg';
    const image = `assets/collection/original-${String(index + 1).padStart(3, '0')}.${extension}`;
    return { title, image };
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
