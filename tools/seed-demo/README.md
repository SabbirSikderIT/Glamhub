# Demo data seeder

Creates 81 demo makeup artists covering all 64 districts of Bangladesh (more in Dhaka, Chattogram and other big cities),
each with a Bengali female name, bio, budget tier (low / medium / high), 2-3 packages, a few blocked dates and a profile photo.
About 65% are marked "verified" by the admin. Everything goes through the real API, so normal validation applies.

    cd tools/seed-demo
    node seed.mjs faces     # download the profile photos into ./faces
    node seed.mjs seed      # create the artists (needs the backend running + the seeded admin account)
    node seed.mjs sheet     # list the planned artists
    node seed.mjs clean     # delete every demo artist (emails ending @glamhub-demo.com)

Demo artists use the email pattern `demo.<first>.<last>@glamhub-demo.com`; the shared demo password is set by `PASSWORD` at the top of `seed.mjs`.
Names are generated, deterministic, and unrelated to real people. No phone numbers are set. No reviews or ratings are invented.

## Photo credit
Profile photos come from https://randomuser.me, a free service for placeholder portraits. They are for demos only.
Replace them with your own photos by putting files named 01.jpg ... 81.jpg into ./faces and running 
ode seed.mjs clean then seed again.

## Portfolio photos (15 per artist)
    node portfolio.mjs      # uploads 15 photos (4 bridal / 4 casual / 4 party / 3 editorial, rotating) to every demo artist

The 226 vetted photos come from Pixabay (Pixabay Content License) and are listed in CREDITS.md and pool.json, but the image files
themselves are not stored in git (they are about 59 MB). To rebuild them, put your own free Pixabay API key in 	ools/seed-demo/.env
(PIXABAY_KEY=...) and run 
ode collect.mjs, 
ode filt.mjs, 
ode step2.mjs and 
ode build-pool.mjs, or drop your own photos into portfolio/
and edit pool.json. Every photo is uploaded through the normal screening pipeline, so photos the AI detector flags, and photos that are
already published by another artist, are approved by the admin account, which is what a moderator would do for vetted demo content.
Because the pool has 226 photos and 81 artists need 15 each, each photo appears on several different artists' profiles.
