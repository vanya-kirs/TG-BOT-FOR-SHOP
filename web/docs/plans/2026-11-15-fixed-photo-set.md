# Fixed product photos and credits

User confirmed: exactly three uploads and three published frames: model front,
model back, original tag with no AI processing. Automatically generate front/back;
original garment photos never public. Fixed order, no editing/reordering of output;
regenerate one frame with optional comment. Tag can be replaced, costs zero.

Implementation: immutable server-owned jobs identify published assets. Commerce
resolves completed job IDs and ignores client image payloads. Supplier may use own
jobs and unchanged jobs of their existing product; admin can approve suppliers'
photos. Existing legacy product images remain when editing non-photo fields.
API output images are served only for published products or authorized preview.
Balance is live FASHN account balance; expenses are a local job ledger, separately
showing confirmed, estimated and unknown historic amounts. No inferred 100-balance
calculation. Automatic work is sequential; ambiguous failures never repost.

Plan: test job provenance and credits; implement schema/API; implement automatic
three-slot editor and credit panel; test per-frame regeneration and error recovery
in a local browser fixture; run the full suite. Do not deploy or charge real credits.

## Implementation and verification
- New products resolve exactly three completed job IDs on the server. Arbitrary client image lists and labels cannot override them. Legacy products keep existing photos only when unchanged; replacing them requires the new full set.
- Tag uploaded as original bytes (JPEG/PNG/WebP, up to 20 MB), no image processing or provider call. Front/back auto-generate separately; retry uses the saved source, a fresh seed and optional 500-character prompt.
- Published assets are readable only for approved active products. Unpublished results require an active supplier owner/product editor or administrator. Private sources never enter public commerce responses.
- Credits panel in workspaces and staff account: live shared balance, confirmed provider charges, separately labelled estimates, unknown historical jobs. This is site usage, not complete external FASHN account history.
- UI exercised with a localhost stub: front retry replaces only front, keeps back/tag, carries comment, automatically selects result. No live paid generation during verification.
- Deploy with `bash web/deploy/upload-from-mac.sh` from the project root. Schema upgrades run automatically; no new environment variables required.

## Update: explicit generation and narrow dialog layout
User requested generation only by button after all three sources are uploaded. File selection now prepares a private source preview only; the shared Generate button processes missing tag/front/back jobs sequentially. Individual retry remains available after all sources are present. Model changes invalidate both generated views but do not launch paid requests. Tag remains unprocessed. The grid now fits its container instead of viewport width; progress is stacked within cards, avoiding overflow in the 640px product dialog.
