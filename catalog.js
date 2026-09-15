const config = window.WATER_AND_INK_SUPABASE;

if (config?.url && config?.anonKey) {
  try {
    const headers = {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    };
    const response = await fetch(`${config.url}/rest/v1/artworks?is_published=eq.true&order=created_at.desc`, {
      headers,
    });
    const legacyLinksResponse = await fetch(`${config.url}/rest/v1/legacy_artwork_links?select=legacy_number,stripe_payment_url`, {
      headers,
    });
    const legacySettingsResponse = await fetch(`${config.url}/rest/v1/legacy_artwork_settings?select=legacy_number,title,description,image_url,additional_images,price_cents,availability,etsy_url,is_published,new_arrival`, {
      headers,
    });
    if (!response.ok) throw new Error('The studio catalog could not be loaded.');
    const artworks = await response.json();
    const withImageUrls = artworks.map((artwork) => ({
      ...artwork,
      imageUrl: `${config.url}/storage/v1/object/public/artwork-images/${artwork.image_path}`,
    }));
    window.dispatchEvent(new CustomEvent('studio-artworks-ready', { detail: withImageUrls }));
    if (legacyLinksResponse.ok) {
      window.dispatchEvent(new CustomEvent('legacy-store-links-ready', { detail: await legacyLinksResponse.json() }));
    }
    if (legacySettingsResponse.ok) {
      window.dispatchEvent(new CustomEvent('legacy-artwork-settings-ready', { detail: await legacySettingsResponse.json() }));
    }
  } catch (error) {
    console.warn(error.message);
  }
}
