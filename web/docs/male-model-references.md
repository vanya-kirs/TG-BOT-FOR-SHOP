# Male try-on references

Created with built-in imagegen, 2026-11-15. Fictional adult male; no real person's likeness requested.

Assets: `dist/assets/model-references/man-front-v1.png` and `man-back-v1.png`.

Front prompt: Photorealistic e-commerce virtual try-on reference; fictional adult male aged 28–35 with short brown hair, clean shaven, average athletic build; full body front view, arms relaxed slightly away from torso, feet apart. Plain fitted taupe T-shirt, dark taupe trousers, neutral beige shoes. Ivory seamless studio, soft diffused light, no accessories, logos or text, portrait 2:3.

Back prompt: Matching back view of the same generated man, rotated 180 degrees, no face visible. Preserve hairstyle, body build, outfit, arm and foot spacing, camera framing, studio background and lighting. Full body including head and shoes, no collage or writing.

Routing: men → male, women → female, unisex → explicit male/female selection. Changing the selected model invalidates both generated views and leaves the tag intact; regeneration starts only when the user clicks the shared Generate button after uploading all three sources. Adult references are not used for kids; a clear setup error is shown.

Male defaults are derived from APP_URL and bundled assets; no new environment settings required. Optional PHOTO_MODEL_MALE_FRONT/BACK override these defaults. Existing PHOTO_MODEL_FRONT/BACK remain the female references. Proxied requests read bundled male references locally and send data URIs, just like the female references.

Jobs persist modelGender; publication verifies both front and back match the selected model. Historical jobs default to female, matching the previous implementation.
