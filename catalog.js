const config = window.WATER_AND_INK_SUPABASE;

if (config?.url && config?.anonKey) {
  try {
    const response = await fetch(`${config.url}/rest/v1/artworks?is_published=eq.true&order=created_at.desc`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });
    if (!response.ok) throw new Error('The studio catalog could not be loaded.');
    const artworks = await response.json();
    const withImageUrls = artworks.map((artwork) => ({
      ...artwork,
      imageUrl: `${config.url}/storage/v1/object/public/artwork-images/${artwork.image_path}`,
    }));
    window.dispatchEvent(new CustomEvent('studio-artworks-ready', { detail: withImageUrls }));
  } catch (error) {
    console.warn(error.message);
  }
}
