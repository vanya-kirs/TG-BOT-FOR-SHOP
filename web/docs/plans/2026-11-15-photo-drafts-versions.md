# Photo drafts, versions and parallel generation

Confirmed user requirements supersede the prior tag-based gallery:
1. Public order: product-only cover, front on model, back on model. No tag input/output.
2. Upload front/back garment sources and explicitly launch generation. All three jobs start concurrently.
3. Save unfinished product fields, sources, selected versions and jobs; resume editing from cabinet drafts.
4. Keep every generated version, choose one per slot, open full-size preview.

Implementation:
- Owner-scoped SQLite photo_draft table and authenticated CRUD routes. Autosave fields and compressed sources. Jobs reference the draft before the provider request, enabling recovery even if the browser misses the response.
- Server worker polls active provider jobs independently of browser and persists returned images. Provider limits/errors still apply; no blind retry of paid requests.
- Per-owner/per-kind active-job guard allows cover/front/back concurrently while preventing duplicate same-slot requests. Same source/draft resumes its active job.
- On publication server validates the cover/front/back job IDs and gender, builds image order, and retains version IDs in private photoStudio metadata. Only selected published assets are public; old versions require staff authorization.
- Front source serves both the product-only background removal and front try-on. Background removal returns a transparent PNG; shop previews display it on the neutral shop background.
- Existing products remain visible. Editing a former front/back/tag set requires creating a cover and publishes the new three-frame format.
- No new env settings. Existing SQLite database migrations run automatically.

Validation: isolated service tests prove all three /run calls start before any completes; tests cover draft ownership, persistence, job reservations, retained versions, publication ordering and model compatibility. Browser harness uses real photoRoutes/SQLite and fake FASHN, tests close/reopen during processing, generation history and full-size preview without paid generation.

## Cover refinement update
The user reported rotated/crumpled product-only covers. The cover now uses FASHN `edit` (1k, balanced, one image, fresh seed) rather than `background-remove`. The prompt requests upright, neatly arranged product-only composition on warm ivory, smoothing incidental storage folds while preserving intentional pleats, texture, print, seams and actual wear/damage. Every slot exposes the correction comment. Individual cover regeneration needs only the front source, not back source or model gender. The estimate is stored per new job (2 credits), preserving legacy background-removal estimates (1). Provider-reported charges take priority. Real image quality is not verified by mocked integration tests.
