# Category-based photo preparation

User approved category-specific scenarios, upload instructions and per-item settings.

Shared `dist/photo-recipes.js` is the authority for UI and server. Every catalogue category maps to a recipe. The gallery has three base slots and zero to five optional factual original images. The recipe defines source fields, prompts, labels, generation mode and model requirement.

- Clothing and sets: prepared cover + front/back try-on. Sets preserve all components.
- Bags, shoes, headwear, glasses, jewelry, watches, belts, scarves: background-only cover, configured wearing shot or original alternate angle, original factual detail.
- Perfume, kids and generic accessories: three original images; no invented labels, product details or adult model for kids.
- Intimates/swimwear default to product-only originals; optional adult-model scenario.
- Vintage uses explicit item-type selector, preserving wear and damage. Material presets preserve lace/transparency, reflective finishes and fur.
- Placement options include shoulder, crossbody, hand, backpack, footwear/headwear front/side, finger/ear/wrist/neck/lapel, waist and shoulder drape as relevant.
- Each upload field explains what to show and the file limit. AI inputs retain automatic preparation up to 20 MB. Original factual images are byte-preserved, up to 2 MB each, with no provider charge.

Settings and sources persist in server drafts. Versions are filtered against the recipe signature and model. Publication checks every selected job's kind, mode, settings, completion and ownership; gallery labels distinguish originals from AI visualizations. Provider modes are selected server-side, not trusted from client input.

No new environment keys. Existing reference model settings are reused for accessory `edit` image_context and adult clothing try-on. Jewelry/accessory photo fidelity still needs real-provider review; local tests cannot guarantee visual accuracy.

Validation: every category has labelled inputs; tests cover exact original bytes, zero provider calls/credits for originals, eight-photo gallery ordering, recipe mismatch rejection, accessory provider parameters, material/set prompts and child restrictions. Browser checked fragrance plus an extra original, category/placement changes, and draft restoration of the selected crossbody option. No paid image generation during this verification.
