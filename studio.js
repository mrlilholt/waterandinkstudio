import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.WATER_AND_INK_SUPABASE;
const authPanel = document.querySelector('#auth-panel');
const uploadPanel = document.querySelector('#upload-panel');
const managePanel = document.querySelector('#manage-panel');
const artworkList = document.querySelector('#studio-artwork-list');
const authStatus = document.querySelector('#auth-status');
const uploadStatus = document.querySelector('#upload-status');
const signOut = document.querySelector('#sign-out');

const setStatus = (element, message, type = '') => {
  element.textContent = message;
  element.className = `studio-status ${type}`;
};

const priceDefaults = {
  '8.5 × 11 in': 42,
  'Approx. 18 × 18 in': 55,
  '18 × 36 in (3 ft banner)': 132,
  '18 × 48 in (4 ft banner)': 207,
  '18 × 60 in (5 ft banner)': 257,
  '18 × 72 in (6 ft banner)': 307,
};

if (!config?.url || !config?.anonKey) {
  setStatus(authStatus, 'Studio setup is not connected yet. Add the Supabase project settings to supabase-config.js.', 'error');
} else {
  const supabase = createClient(config.url, config.anonKey);
  const { data: { session } } = await supabase.auth.getSession();

  const showUpload = (user) => {
    const isOwner = user?.email?.toLowerCase() === 'waterandinkstudio@gmail.com';
    authPanel.hidden = isOwner;
    uploadPanel.hidden = !isOwner;
    managePanel.hidden = !isOwner;
    signOut.hidden = !isOwner;
    if (user && !isOwner) setStatus(authStatus, 'This Google account is not authorized for studio uploads.', 'error');
    if (isOwner) loadArtworks();
  };

  showUpload(session?.user);

  document.querySelector('#google-sign-in').addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (error) setStatus(authStatus, error.message, 'error');
  });

  signOut.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showUpload(null);
  });

  document.querySelector('#size-option').addEventListener('change', (event) => {
    const defaultPrice = priceDefaults[event.currentTarget.value];
    if (defaultPrice !== undefined) document.querySelector('#artwork-price').value = defaultPrice.toFixed(2);
  });

  const makePriceEditor = (artwork) => {
    const form = document.createElement('form');
    form.className = 'studio-price-editor';
    const title = document.createElement('strong');
    title.textContent = artwork.title;
    const size = document.createElement('span');
    size.textContent = artwork.size_option || 'Custom size';
    const price = document.createElement('input');
    price.type = 'number';
    price.min = '0';
    price.step = '0.01';
    price.value = ((artwork.price_cents ?? 0) / 100).toFixed(2);
    price.setAttribute('aria-label', `Price for ${artwork.title}`);
    const save = document.createElement('button');
    save.className = 'button button-light';
    save.type = 'submit';
    save.textContent = 'Save price';
    form.append(title, size, price, save);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      save.textContent = 'Saving…';
      const priceCents = Math.round(Number(price.value) * 100);
      const { error } = await supabase.from('artworks').update({ price_cents: priceCents }).eq('id', artwork.id);
      save.textContent = error ? 'Try again' : 'Saved';
    });
    return form;
  };

  async function loadArtworks() {
    const { data, error } = await supabase.from('artworks').select('id,title,size_option,price_cents,created_at').order('created_at', { ascending: false });
    if (error) return;
    artworkList.replaceChildren(...data.map(makePriceEditor));
    if (!data.length) artworkList.textContent = 'Your uploaded artwork will appear here.';
  }

  document.querySelector('#artwork-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const image = data.get('image');
    if (!(image instanceof File) || !image.size) return;

    const safeName = image.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
    const path = `${Date.now()}-${safeName}`;
    setStatus(uploadStatus, 'Uploading image…');
    const { error: uploadError } = await supabase.storage.from('artwork-images').upload(path, image, {
      cacheControl: '31536000',
      contentType: image.type,
      upsert: false,
    });
    if (uploadError) return setStatus(uploadStatus, uploadError.message, 'error');

    let stripePaymentUrl = data.get('stripe_payment_url').trim() || null;
    const etsyUrl = data.get('etsy_url').trim() || null;
    if (!stripePaymentUrl && !etsyUrl && data.get('is_published') === 'on') {
      setStatus(uploadStatus, 'Creating one-of-one Stripe checkout…');
      const { data: { session } } = await supabase.auth.getSession();
      const imageUrl = `${config.url}/storage/v1/object/public/artwork-images/${path}`;
      const checkoutResponse = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          title: data.get('title').trim(),
          description: data.get('description').trim(),
          imageUrl,
          priceCents: Math.round(Number(data.get('price')) * 100),
        }),
      });
      const checkout = await checkoutResponse.json();
      if (!checkoutResponse.ok) return setStatus(uploadStatus, checkout.error || 'Stripe checkout could not be created.', 'error');
      stripePaymentUrl = checkout.checkoutUrl;
    }

    const { error: artworkError } = await supabase.from('artworks').insert({
      title: data.get('title').trim(),
      description: data.get('description').trim() || null,
      size_option: data.get('size_option'),
      price_cents: Math.round(Number(data.get('price')) * 100),
      availability: data.get('availability'),
      etsy_url: etsyUrl,
      stripe_payment_url: stripePaymentUrl,
      image_path: path,
      new_arrival: data.get('new_arrival') === 'on',
      is_published: data.get('is_published') === 'on',
    });
    if (artworkError) return setStatus(uploadStatus, artworkError.message, 'error');

    form.reset();
    form.elements.new_arrival.checked = true;
    form.elements.is_published.checked = true;
    setStatus(uploadStatus, 'Artwork published. It is now live in your collection.', 'success');
    loadArtworks();
  });
}
