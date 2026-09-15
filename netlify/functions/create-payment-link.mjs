const SUPABASE_URL = 'https://kkrmpckoxmzttqztzyeq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mNbLuOHTJiFi7OiMhvNrzA_MS7amww2';
const OWNER_EMAIL = 'waterandinkstudio@gmail.com';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const stripeRequest = async (path, params, idempotencyKey) => {
  const secretKey = Netlify.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) throw new Error('Stripe is not configured on the server.');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
    },
    body: new URLSearchParams(params),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Stripe could not create checkout.');
  return payload;
};

const isOwner = async (request) => {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return false;
  const user = await response.json();
  return user.email?.toLowerCase() === OWNER_EMAIL;
};

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!(await isOwner(request))) return json({ error: 'Unauthorized.' }, 401);

  try {
    const { title, description, imageUrl, priceCents, artworkId = '' } = await request.json();
    if (!title || !imageUrl || !Number.isInteger(priceCents) || priceCents < 1) {
      return json({ error: 'Artwork title, image, and price are required.' }, 400);
    }

    const stableId = String(artworkId || title).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 180);
    const product = await stripeRequest('products', {
      name: title,
      description: description || 'One-of-one original artwork from Water & Ink Studio.',
      'images[0]': imageUrl,
      'metadata[artwork_id]': artworkId,
    }, `water-ink-product-${stableId}`);
    const price = await stripeRequest('prices', {
      product: product.id,
      currency: 'usd',
      unit_amount: String(priceCents),
      'metadata[artwork_id]': artworkId,
    }, `water-ink-price-${stableId}`);
    const paymentLink = await stripeRequest('payment_links', {
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': '1',
      'restrictions[completed_sessions][limit]': '1',
      'shipping_address_collection[allowed_countries][0]': 'US',
      'metadata[artwork_id]': artworkId,
    }, `water-ink-link-${stableId}`);
    return json({
      checkoutUrl: paymentLink.url,
      stripeProductId: product.id,
      stripePriceId: price.id,
      stripePaymentLinkId: paymentLink.id,
    });
  } catch (error) {
    return json({ error: error.message || 'Unable to create Stripe checkout.' }, 500);
  }
};

export const config = { path: '/api/create-payment-link' };
