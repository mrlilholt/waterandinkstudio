import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.WATER_AND_INK_SUPABASE;
const ownerEmail = 'waterandinkstudio@gmail.com';
const etsyNumbers = new Set([4, 77, 95, 109, 117]);
const authPanel = document.querySelector('#auth-panel');
const storePanel = document.querySelector('#store-panel');
const authStatus = document.querySelector('#auth-status');
const storeStatus = document.querySelector('#store-status');
const summary = document.querySelector('#store-summary');
const generate = document.querySelector('#generate-links');
const signOut = document.querySelector('#sign-out');
const catalogSource = document.querySelector('#catalog-source');

const setStatus = (element, message, type = '') => {
  element.textContent = message;
  element.className = `studio-status ${type}`;
};

if (!config?.url || !config?.anonKey) {
  setStatus(authStatus, 'Studio setup is not connected yet.', 'error');
} else {
  const supabase = createClient(config.url, config.anonKey);
  let ownerSession = null;
  let pendingWorks = [];

  const getCatalogWorks = () => catalogSource.contentWindow?.WATER_AND_INK_STATIC_ARTWORKS || [];

  const waitForCatalog = () => new Promise((resolve) => {
    if (getCatalogWorks().length) return resolve();
    catalogSource.addEventListener('load', resolve, { once: true });
  });

  const loadStore = async () => {
    await waitForCatalog();
    const works = getCatalogWorks();
    if (!works.length) {
      setStatus(storeStatus, 'Catalog data is still loading. Please refresh this page.', 'error');
      return;
    }
    const { data: links, error } = await supabase
      .from('legacy_artwork_links')
      .select('legacy_number');
    if (error) {
      setStatus(storeStatus, 'The store-links database table is not ready yet. Run the new Supabase migration first.', 'error');
      return;
    }
    const linkedNumbers = new Set((links || []).map((link) => String(link.legacy_number)));
    pendingWorks = works.filter((work) => (
      !etsyNumbers.has(work.number)
      && Number.isInteger(work.priceCents)
      && work.priceCents > 0
      && !linkedNumbers.has(String(work.number))
    ));
    const linkedCount = linkedNumbers.size;
    summary.textContent = pendingWorks.length
      ? `${pendingWorks.length} original${pendingWorks.length === 1 ? '' : 's'} are ready for Stripe checkout. ${linkedCount} already have a checkout link.`
      : `Every eligible original has a checkout link. ${linkedCount} links are ready.`;
    generate.disabled = pendingWorks.length === 0;
  };

  const showStore = async (user) => {
    const isOwner = user?.email?.toLowerCase() === ownerEmail;
    authPanel.hidden = isOwner;
    storePanel.hidden = !isOwner;
    signOut.hidden = !isOwner;
    ownerSession = isOwner ? user : null;
    if (user && !isOwner) setStatus(authStatus, 'This Google account is not authorized for store setup.', 'error');
    if (isOwner) await loadStore();
  };

  const { data: { session } } = await supabase.auth.getSession();
  await showStore(session?.user);

  document.querySelector('#google-sign-in').addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } });
    if (error) setStatus(authStatus, error.message, 'error');
  });

  signOut.addEventListener('click', async () => {
    await supabase.auth.signOut();
    await showStore(null);
  });

  generate.addEventListener('click', async () => {
    if (!ownerSession || !pendingWorks.length) return;
    const count = pendingWorks.length;
    if (!window.confirm(`Create ${count} Stripe products and one-time payment links now? This cannot be undone automatically.`)) return;
    generate.disabled = true;
    let created = 0;
    let failed = 0;
    const sourceUrl = window.location.origin;
    const { data: { session: activeSession } } = await supabase.auth.getSession();
    for (const work of pendingWorks) {
      setStatus(storeStatus, `Creating checkout ${created + failed + 1} of ${count}…`);
      try {
        const response = await fetch('/api/create-payment-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeSession?.access_token || ''}` },
          body: JSON.stringify({
            title: work.title,
            description: `${work.description || 'Original artwork'} · Water & Ink Studio`,
            imageUrl: new URL(work.image, sourceUrl).href,
            priceCents: work.priceCents,
            artworkId: `legacy-${work.number}`,
          }),
        });
        const checkout = await response.json();
        if (!response.ok) throw new Error(checkout.error || 'Stripe checkout could not be created.');
        const { error } = await supabase.from('legacy_artwork_links').upsert({
          legacy_number: String(work.number),
          title: work.title,
          price_cents: work.priceCents,
          stripe_payment_url: checkout.checkoutUrl,
          stripe_product_id: checkout.stripeProductId,
          stripe_payment_link_id: checkout.stripePaymentLinkId,
        });
        if (error) throw error;
        created += 1;
      } catch (error) {
        failed += 1;
        console.error(`Checkout creation failed for ${work.title}`, error);
      }
    }
    setStatus(storeStatus, failed
      ? `${created} links created. ${failed} did not complete; use the button again to retry only those.`
      : `${created} Stripe checkout links created. They are now live on the collection.`, failed ? 'error' : 'success');
    await loadStore();
  });
}
