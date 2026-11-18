import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.WATER_AND_INK_SUPABASE;
const authPanel = document.querySelector('#auth-panel');
const uploadPanel = document.querySelector('#upload-panel');
const managePanel = document.querySelector('#manage-panel');
const artworkList = document.querySelector('#studio-artwork-list');
const authStatus = document.querySelector('#auth-status');
const uploadStatus = document.querySelector('#upload-status');
const signOut = document.querySelector('#sign-out');
const catalogSource = document.querySelector('#catalog-source');
const etsyNumbers = new Set([4, 77, 95, 109, 117]);
const catalogEditor = document.querySelector('#catalog-editor');
const editorStatus = document.querySelector('#editor-status');
let catalogItems = [];
let selectedArtwork = null;
const legacyExtras = [
  { number: 4, title: 'Rising Water No. 001', priceCents: 4200 },
  { number: 77, title: 'Enso No. 010', priceCents: 13200 },
  { number: 95, title: 'Bird Study No. 005', priceCents: 4200 },
  { number: 109, title: 'Bird Study No. 003', priceCents: 4200 },
  { number: 117, title: 'Bamboo Study No. 015', priceCents: 13200 },
  { number: 118, title: 'Mountain Mist No. 009', priceCents: 4200, availability: 'sold' },
];
const legacyImage = (number) => {
  const special = {
    117: 'assets/collection/bamboo-study-015.png', 118: 'assets/collection/mountain-mist-009.png',
    131: 'assets/new-arrivals/large-winter-tree-001.png', 132: 'assets/new-arrivals/large-tree-001.png',
    133: 'assets/new-arrivals/long-bird-001.png', 134: 'assets/new-arrivals/large-tree-002.png',
    135: 'assets/new-arrivals/large-tree-003.png', 136: 'assets/new-arrivals/study-on-stillness-4-panels.png',
    137: 'assets/new-arrivals/growth-enso.png',
  };
  return special[number] || `assets/collection/original-${String(number).padStart(3, '0')}.png`;
};

const setStatus = (element, message, type = '') => {
  element.textContent = message;
  element.className = `studio-status ${type}`;
};

// Keep the visible order as the source of truth for both forms.
const storageImageUrl = (path) => `${config.url}/storage/v1/object/public/artwork-images/${path}`;
function imageOrderPicker(input, container) {
  let items = [];
  const release = () => items.forEach((item) => { if (item.file) URL.revokeObjectURL(item.url); });
  const render = () => {
    container.replaceChildren();
    items.forEach((item, index) => {
      const card = document.createElement('li');
      const preview = document.createElement('img');
      preview.src = item.url;
      preview.alt = item.file?.name || `Listing photo ${index + 1}`;
      const caption = document.createElement('p');
      caption.textContent = index === 0 ? 'Main image' : `Photo ${index + 1}`;
      card.append(preview, caption);
      const action = (label, disabled, moveTo) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        button.setAttribute('aria-label', `${label}: photo ${index + 1}`);
        button.addEventListener('click', () => {
          items.splice(moveTo, 0, items.splice(index, 1)[0]);
          render();
          container.children[moveTo].querySelector('button:not(:disabled)')?.focus();
        });
        card.append(button);
      };
      action('Make main', index === 0, 0);
      action('Move earlier', index === 0, index - 1);
      action('Move later', index === items.length - 1, index + 1);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove photo';
      remove.setAttribute('aria-label', `Remove photo ${index + 1}`);
      remove.disabled = items.length === 1;
      remove.addEventListener('click', () => {
        const [removed] = items.splice(index, 1);
        if (removed.file) URL.revokeObjectURL(removed.url);
        render();
        container.children[Math.min(index, items.length - 1)]?.querySelector('button:not(:disabled)')?.focus();
      });
      card.append(remove);
      container.append(card);
    });
  };
  input.addEventListener('change', () => {
    items.push(...Array.from(input.files || [], (file) => ({ file, url: URL.createObjectURL(file) })));
    input.value = '';
    render();
  });
  return {
    getItems: () => items.map((item) => ({ ...item })),
    setItems(next) { release(); items = next; render(); },
  };
}
const newImagePicker = imageOrderPicker(document.querySelector('#artwork-form input[name="image"]'), document.querySelector('#new-image-order'));
const editorImagePicker = imageOrderPicker(catalogEditor.elements.image, document.querySelector('#editor-image-order'));

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

  const waitForCatalog = () => new Promise((resolve) => {
    if (catalogSource.contentWindow?.WATER_AND_INK_STATIC_ARTWORKS?.length) return resolve();
    catalogSource.addEventListener('load', resolve, { once: true });
  });

  const replaceStripeCheckout = async (artwork, values) => {
    if (!artwork.stripe_payment_link_id || !artwork.stripe_product_id) return null;
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/create-payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({
        title: values.title,
        description: values.description || values.sizeOption || 'Original artwork',
        imageUrl: values.imageUrl,
        priceCents: values.priceCents,
        artworkId: artwork.source === 'legacy' ? `legacy-${artwork.id}` : `studio-${artwork.id}`,
        stripeProductId: artwork.stripe_product_id,
        previousPaymentLinkId: artwork.stripe_payment_link_id,
      }),
    });
    const checkout = await response.json();
    if (!response.ok) throw new Error(checkout.error || 'Stripe checkout could not be updated.');
    return checkout;
  };

  const makeCatalogItem = (artwork) => {
    const option = document.createElement('option');
    option.value = `${artwork.source}:${artwork.id}`;
    option.textContent = `${artwork.title} — $${((artwork.price_cents || 0) / 100).toFixed(2)}`;
    return option;
  };

  const openEditor = (artwork) => {
    selectedArtwork = artwork;
    catalogEditor.hidden = false;
    document.querySelector('#editor-heading').textContent = artwork.title;
    document.querySelector('#editor-source').textContent = artwork.source === 'legacy' ? 'Existing catalog' : 'Studio upload';
    catalogEditor.elements.title.value = artwork.title || '';
    catalogEditor.elements.description.value = artwork.description || '';
    catalogEditor.elements.size_option.value = artwork.size_option || 'Custom';
    catalogEditor.elements.price.value = ((artwork.price_cents || 0) / 100).toFixed(2);
    catalogEditor.elements.availability.value = artwork.availability || 'available';
    catalogEditor.elements.etsy_url.value = artwork.etsy_url || '';
    catalogEditor.elements.new_arrival.checked = Boolean(artwork.new_arrival);
    catalogEditor.elements.is_published.checked = artwork.is_published !== false;
    catalogEditor.elements.image.value = '';
    const existingImages = artwork.source === 'studio'
      ? [artwork.image_path, ...(artwork.additional_image_paths || [])].filter(Boolean).map((path) => ({ path, url: storageImageUrl(path) }))
      : [artwork.imageUrl, ...(artwork.additional_images || [])].filter(Boolean).map((url) => ({ url }));
    editorImagePicker.setItems(existingImages);
    setStatus(editorStatus, etsyNumbers.has(Number(artwork.id)) ? 'This work is linked to Etsy; change its checkout price there too.' : '');
  };

  async function loadArtworks() {
    const [uploadedResponse, linksResponse, settingsResponse] = await Promise.all([
      supabase.from('artworks').select('id,title,description,image_path,additional_image_paths,size_option,price_cents,stripe_payment_url,stripe_product_id,stripe_payment_link_id,etsy_url,availability,new_arrival,is_published,created_at').order('created_at', { ascending: false }),
      supabase.from('legacy_artwork_links').select('legacy_number,title,price_cents,stripe_payment_url,stripe_product_id,stripe_payment_link_id'),
      supabase.from('legacy_artwork_settings').select('legacy_number,title,description,image_url,additional_images,size_option,price_cents,availability,etsy_url,is_published,new_arrival'),
    ]);
    let uploaded = uploadedResponse.data || [];
    if (uploadedResponse.error) {
      // Older projects may not yet have the Stripe tracking columns. The
      // existing site catalog should remain editable while that migration is pending.
      const { data: basicUploads } = await supabase
        .from('artworks')
        .select('id,title,description,image_path,additional_image_paths,size_option,price_cents,stripe_payment_url,etsy_url,availability,new_arrival,is_published,created_at')
        .order('created_at', { ascending: false });
      uploaded = basicUploads || [];
    }
    // The list deliberately falls back to the site catalog while the optional
    // editor migration is awaiting its first run.
    let settings = settingsResponse.data || [];
    if (settingsResponse.error) {
      const { data: basicSettings } = await supabase.from('legacy_artwork_settings').select('legacy_number,price_cents,availability');
      settings = basicSettings || [];
    }
    const linksByNumber = Object.fromEntries((linksResponse.data || []).map((link) => [link.legacy_number, link]));
    const settingsByNumber = Object.fromEntries(settings.map((setting) => [setting.legacy_number, setting]));
    const staticWorks = catalogSource.contentWindow?.WATER_AND_INK_STATIC_ARTWORKS || [];
    const savedCatalog = staticWorks.length ? staticWorks : [
      ...(linksResponse.data || []).map((link) => ({ number: Number(link.legacy_number), title: link.title, priceCents: link.price_cents })),
      ...legacyExtras,
    ];
    const uniqueCatalog = Array.from(new Map(savedCatalog.map((work) => [work.number, work])).values());
    const catalogWorks = uniqueCatalog.map((work) => {
      const setting = settingsByNumber[String(work.number)] || {};
      const link = linksByNumber[String(work.number)] || {};
      return {
        id: String(work.number), title: setting.title ?? work.title, description: setting.description ?? work.description,
        size_option: setting.size_option ?? work.description, price_cents: setting.price_cents ?? work.priceCents,
        availability: setting.availability ?? work.availability ?? 'available', imageUrl: new URL(setting.image_url || work.image || legacyImage(work.number), window.location.href).href,
        etsy_url: setting.etsy_url ?? work.etsyUrl ?? '', additional_images: setting.additional_images ?? work.images ?? [], is_published: setting.is_published ?? true, new_arrival: setting.new_arrival ?? work.new_arrival ?? false,
        ...link, source: 'legacy',
      };
    });
    const uploadedWorks = uploaded.map((artwork) => ({
      ...artwork, imageUrl: `${config.url}/storage/v1/object/public/artwork-images/${artwork.image_path}`, source: 'studio',
    }));
    catalogItems = [...uploadedWorks, ...catalogWorks];
    artworkList.replaceChildren(...catalogItems.map(makeCatalogItem));
    if (catalogItems.length) {
      const current = selectedArtwork && `${selectedArtwork.source}:${selectedArtwork.id}`;
      const next = catalogItems.find((artwork) => `${artwork.source}:${artwork.id}` === current) || catalogItems[0];
      artworkList.value = `${next.source}:${next.id}`;
      openEditor(next);
    }
  }

  artworkList.addEventListener('change', () => {
    const artwork = catalogItems.find((item) => `${item.source}:${item.id}` === artworkList.value);
    if (artwork) openEditor(artwork);
  });

  catalogEditor.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedArtwork) return;
    const submitButton = catalogEditor.querySelector('[type="submit"]');
    if (submitButton.disabled) return;
    submitButton.disabled = true;
    const data = new FormData(catalogEditor);
    let imageUrl;
    let imagePath;
    let additionalImages;
    try {
      const ordered = editorImagePicker.getItems();
      for (const item of ordered) {
        if (!item.file) continue;
        setStatus(editorStatus, 'Uploading image…');
        const safeName = item.file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
        item.path = `${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from('artwork-images').upload(item.path, item.file, { cacheControl: '31536000', contentType: item.file.type, upsert: false });
        if (error) throw error;
        item.url = storageImageUrl(item.path);
      }
      if (!ordered.length) throw new Error('Choose at least one image.');
      imageUrl = ordered[0].url;
      imagePath = ordered[0].path;
      additionalImages = ordered.slice(1).map((item) => selectedArtwork.source === 'studio' ? item.path : item.url);
    } catch (error) {
      setStatus(editorStatus, error.message || 'Image upload failed. Please try again.', 'error');
      submitButton.disabled = false;
      return;
    }
    const values = {
      title: data.get('title').trim(), description: data.get('description').trim(), sizeOption: data.get('size_option'),
      priceCents: Math.round(Number(data.get('price')) * 100), imageUrl,
      availability: data.get('availability'), etsyUrl: data.get('etsy_url').trim() || null,
      newArrival: data.get('new_arrival') === 'on', isPublished: data.get('is_published') === 'on',
    };
    setStatus(editorStatus, 'Saving artwork…');
    try {
      const checkout = await replaceStripeCheckout(selectedArtwork, values);
      if (selectedArtwork.source === 'legacy') {
        const { error } = await supabase.from('legacy_artwork_settings').upsert({
          legacy_number: selectedArtwork.id, title: values.title, description: values.description, image_url: imageUrl,
          size_option: values.sizeOption, price_cents: values.priceCents, availability: values.availability,
          etsy_url: values.etsyUrl, additional_images: additionalImages, new_arrival: values.newArrival, is_published: values.isPublished,
        });
        if (error) throw error;
        if (checkout) {
          const { error: linkError } = await supabase.from('legacy_artwork_links').update({ price_cents: values.priceCents, stripe_payment_url: checkout.checkoutUrl, stripe_product_id: checkout.stripeProductId, stripe_payment_link_id: checkout.stripePaymentLinkId }).eq('legacy_number', selectedArtwork.id);
          if (linkError) throw linkError;
        }
      } else {
        const { error } = await supabase.from('artworks').update({
          title: values.title, description: values.description || null, image_path: imagePath, size_option: values.sizeOption,
          price_cents: values.priceCents, availability: values.availability, etsy_url: values.etsyUrl,
          new_arrival: values.newArrival, is_published: values.isPublished,
          additional_image_paths: additionalImages,
          ...(checkout ? { stripe_payment_url: checkout.checkoutUrl, stripe_product_id: checkout.stripeProductId, stripe_payment_link_id: checkout.stripePaymentLinkId } : {}),
        }).eq('id', selectedArtwork.id);
        if (error) throw error;
      }
      setStatus(editorStatus, checkout ? 'Saved. Stripe checkout was updated too.' : 'Saved.', 'success');
      await loadArtworks();
    } catch (error) {
      console.error(error);
      setStatus(editorStatus, error.message || 'Could not save this artwork.', 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

  document.querySelector('#delete-artwork').addEventListener('click', async () => {
    if (!selectedArtwork) return;
    const deleteButton = document.querySelector('#delete-artwork');
    if (!deleteButton.dataset.confirming) {
      deleteButton.dataset.confirming = 'true';
      deleteButton.textContent = 'Confirm removal';
      return setStatus(editorStatus, `Click “Confirm removal” to permanently remove “${selectedArtwork.title}”.`, 'error');
    }
    if (selectedArtwork.source !== 'studio') {
      return setStatus(editorStatus, 'This catalog work cannot be removed here.', 'error');
    }
    deleteButton.disabled = true;
    setStatus(editorStatus, 'Removing listing…');
    try {
      const { error } = await supabase.from('artworks').delete().eq('id', selectedArtwork.id);
      if (error) throw error;
      selectedArtwork = null;
      catalogEditor.hidden = true;
      setStatus(editorStatus, 'Listing removed.', 'success');
      await loadArtworks();
    } catch (error) {
      console.error(error);
      setStatus(editorStatus, error.message || 'Could not remove this listing.', 'error');
    } finally {
      deleteButton.dataset.confirming = '';
      deleteButton.textContent = 'Remove listing';
      deleteButton.disabled = false;
    }
  });

  document.querySelector('#artwork-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton.disabled) return;
    const data = new FormData(form);
    const images = newImagePicker.getItems().map((item) => item.file);
    if (!images.length) return setStatus(uploadStatus, 'Choose at least one photo before publishing.', 'error');

    submitButton.disabled = true;

    setStatus(uploadStatus, 'Uploading image…');
    const paths = [];
    for (const [index, image] of images.entries()) {
      const safeName = image.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
      const path = `${Date.now()}-${index}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from('artwork-images').upload(path, image, {
        cacheControl: '31536000', contentType: image.type, upsert: false,
      });
      if (uploadError) {
        submitButton.disabled = false;
        return setStatus(uploadStatus, uploadError.message, 'error');
      }
      paths.push(path);
    }
    const [path, ...additionalImagePaths] = paths;

    let stripePaymentUrl = data.get('stripe_payment_url').trim() || null;
    let stripeProductId = null;
    let stripePaymentLinkId = null;
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
      let checkout;
      try {
        checkout = await checkoutResponse.json();
      } catch {
        submitButton.disabled = false;
        return setStatus(
          uploadStatus,
          'Checkout service is unavailable. Open the Netlify-hosted Studio editor to publish this work.',
          'error',
        );
      }
      if (!checkoutResponse.ok) {
        submitButton.disabled = false;
        return setStatus(uploadStatus, checkout.error || 'Stripe checkout could not be created.', 'error');
      }
      stripePaymentUrl = checkout.checkoutUrl;
      stripeProductId = checkout.stripeProductId;
      stripePaymentLinkId = checkout.stripePaymentLinkId;
    }

    const { error: artworkError } = await supabase.from('artworks').insert({
      title: data.get('title').trim(),
      description: data.get('description').trim() || null,
      size_option: data.get('size_option'),
      price_cents: Math.round(Number(data.get('price')) * 100),
      availability: data.get('availability'),
      etsy_url: etsyUrl,
      stripe_payment_url: stripePaymentUrl,
      stripe_product_id: stripeProductId,
      stripe_payment_link_id: stripePaymentLinkId,
      additional_image_paths: additionalImagePaths,
      image_path: path,
      new_arrival: data.get('new_arrival') === 'on',
      is_published: data.get('is_published') === 'on',
    });
    if (artworkError) {
      submitButton.disabled = false;
      return setStatus(uploadStatus, artworkError.message, 'error');
    }

    form.reset();
    newImagePicker.setItems([]);
    form.elements.new_arrival.checked = true;
    form.elements.is_published.checked = true;
    setStatus(uploadStatus, 'Artwork published. It is now live in your collection.', 'success');
    submitButton.disabled = false;
    loadArtworks();
  });
}
