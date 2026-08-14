# Try in your space (future)

Not built. Camera photo of a wall or stand → show 2–3 catalogue designs sitting in that place. Rank first, generate only the winners. **Do not generate all 12.**

Live product behaviour stays in `Project.md`. This file is the implementation plan only.

## Why not all 12

Twelve full image edits take about a minute, cost ~$0.47, and still look generic if the model invents a different Ganpati. Rank the room against the 12 catalogue covers with one cheap vision call, then composite the top 3. First image on screen in ~8–12s; the carousel fills as the other two finish.

| | Rank + 3 | All 12 |
|---|---|---|
| First swipeable result | ~8–12s | ~55s typical |
| Cost / try | ~$0.12 | ~$0.47 |
| 100 tries / day | ~$12 | ~$47 |

Regenerates double the spend. Cap tries per device (e.g. 3/day) server-side.

## Recommended flow

New screen from home, e.g. `/try`. HTTPS only. Customer home photos are PII — do not store after the session unless they tap Save.

1. **Capture** — rear camera or photo library. Prefer `<input capture="environment">` on iPhone over live `getUserMedia`. Compress on device to ~1280px JPEG before upload. Normalize EXIF rotation. `<1s`
2. **Rank** — one Gemini 2.5 Flash vision call: room photo + 12 catalogue thumbs → JSON `{ picks: [{ id, reason }] }` (scale, stand vs backdrop, colour). `1–3s`
3. **Composite** — three parallel image-edit jobs. Each gets the room + that product photo + a locked prompt (exact idol, match lighting, sit on the stand / hang on the wall). `5–10s` each; wall-clock is the slowest job, not the sum.
4. **Review** — swipe carousel. Retake (new photo) vs Regenerate (same photo, new seed). WhatsApp with the chosen category slug.

## APIs

This is **image editing** (room + product reference), not text-to-image. Prompt-only models invent a different idol.

| API | Fit | Speed | Cost / image | Free? |
|---|---|---|---|---|
| **Gemini 2.5 Flash Image** (v1 pick) | Multi-image edit, fast, same family as ranking | 4–8s | ~$0.039 | Studio ~100–500/day, ~10 RPM. Private beta only. |
| Flux Kontext Pro (fal / BFL) | Strongest “put this object in this photo”. Fallback if Gemini warps the face | 6–12s | $0.04 | No (tiny trial credits) |
| GPT Image 2 | Good instructions; slower / pricier at medium/high. One image per call | 10–40s | $0.006–$0.21 | No production free tier |
| HF / Pollinations / SD free | Identity lock and queues too weak to sell an idol from | unreliable | $0 | Yes, and it will show |

Prices as of Aug 2026 from vendor docs. Free-tier quotas change without notice. Prototype on Gemini free; switch the same code to a paid key before public traffic.

There is **no** production-quality free image-edit API.

## Architecture (this repo)

Vite + Vercel serverless. Keys stay on the server. Body limit 4.5MB — compress on the client. Do not call Google/OpenAI from the browser.

`vercel.json` caps `api/**` at **15s**, so one function cannot wait for three images.

| Route | Job |
|---|---|
| `POST /api/try/rank` | Room JPEG + catalogue ids → top 3 |
| `POST /api/try/compose` | Room + one product image URL (existing Drive thumb / `/api/media`) → one composite |

Client shows rank pills as soon as rank returns, three skeleton slots, swap each in when its compose job lands.

Rate-limit by IP + a short-lived session token. Strip EXIF. Delete buffers after the response. No disk, no Drive upload of customer homes.

Hobby vs Pro: some Hobby accounts are 10s. Fan-out compose jobs fit the 15s cap; a single “wait for 3” route does not.

## Identity lock

Pass the **real product photo** as a second image, not a text description.

Prompt: keep the idol’s face, ornaments, and colour exactly; only change pose/scale/lighting to sit on the stand (or hang the backdrop) in the room. Include catalogue size (e.g. 3ft).

If Gemini still drifts, run that job on Flux Kontext with the same two images. Reject / retry when a cheap vision check says the output idol does not match the input. Never show a wrong idol as “your design”.

Ranking must know category type: sitting idol vs wall backdrop, so the placement verb is sit vs hang. Confirm the “12 designs” are the 12 Drive categories (covers as references) before build.

## Camera / mobile

- Permission denied → “Upload from gallery”. Never block the whole app on camera.
- iOS Safari: capture file input first. Live camera needs `playsInline`, `facingMode: environment`, and a user gesture. Keep the try-screen on the existing `visualViewport` shell.
- People / kids in frame: Gemini may refuse. Copy: “Point at the empty stand.” Safety refusal → recrop, do not retry blindly.
- Low light / blur: offer retake, not a third regenerate.
- Disclose: “AI visualisation — not an exact preview.” Gemini adds SynthID; still say it in the UI.

## Build time (one person, this codebase)

| Slice | Days | Done when |
|---|---|---|
| MVP | 4–5 | Capture + rank + 3 composites + swipe + retake/regenerate + WhatsApp. Gemini only. |
| Identity + iOS | +3 | Product photo lock, size in prompt, iPhone capture, compress, rate limit. |
| Launch hardening | +2 | Consent, quota, refusal UX, cost dashboard, Flux fallback. |
| Live AR | skip v1 | WebXR / 8th Wall is a sequel. Photo composite sells the idol. |

About **9–10 working days** to something behind a production button.

## Decisions already locked

- Gemini 2.5 Flash Image for v1
- Rank then 3, never 12
- Fan-out compose jobs (15s function cap)
- No home-photo storage by default
- Skip live AR for v1
