-- Run once after deploying the $7 shipping-inclusive price update.
-- This changes only existing Studio-uploaded artwork records.
update public.artworks
set price_cents = price_cents + 700
where price_cents is not null;
