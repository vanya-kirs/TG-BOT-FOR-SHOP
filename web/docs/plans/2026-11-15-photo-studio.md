# Product photo studio

Approved product sequence: original front on a uniform background, AI model front,
AI model back (only with a back source), real detail. Keep originals. Human review.
Implementation choice: FASHN background-remove and tryon-max; one server-only key.
Compared with two providers, this reduces credential/setup burden. No automatic
publication or generation on upload; explicit per-frame actions avoid surprise spend.

Plan: add tested authenticated job API with SQLite persistence and spend limits;
add studio to product editor, upload named sources and review/apply individual frames;
preserve original sources privately and label synthetic photos publicly;
document credentials/reference setup; run full test suite and syntax checks.
No new dependencies. Existing product approval rules remain in force. No deployment.
