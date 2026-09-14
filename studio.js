import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.WATER_AND_INK_SUPABASE;
const authPanel = document.querySelector('#auth-panel');
const uploadPanel = document.querySelector('#upload-panel');
const authStatus = document.querySelector('#auth-status');
const uploadStatus = document.querySelector('#upload-status');
const signOut = document.querySelector('#sign-out');

const setStatus = (element, message, type = '') => {
  element.textContent = message;
  element.className = `studio-status ${type}`;
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
    signOut.hidden = !isOwner;
    if (user && !isOwner) setStatus(authStatus, 'This Google account is not authorized for studio uploads.', 'error');
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

    const { error: artworkError } = await supabase.from('artworks').insert({
      title: data.get('title').trim(),
      description: data.get('description').trim() || null,
      availability: data.get('availability'),
      etsy_url: data.get('etsy_url').trim() || null,
      image_path: path,
      new_arrival: data.get('new_arrival') === 'on',
      is_published: data.get('is_published') === 'on',
    });
    if (artworkError) return setStatus(uploadStatus, artworkError.message, 'error');

    form.reset();
    form.elements.new_arrival.checked = true;
    form.elements.is_published.checked = true;
    setStatus(uploadStatus, 'Artwork published. It is now live in your collection.', 'success');
  });
}
