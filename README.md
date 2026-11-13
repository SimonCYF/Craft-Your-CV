# Craft Your CV

Craft Your CV (craftyourcv.org) is a CV and resume builder that runs entirely in the browser. People pick a template, fill in a form,
and download one self-contained HTML file. There is no backend, no sign-up and no tracking.

## What it does

- **Templates**: Bold, Classic and Sidebar, switchable at any time, each with free colour pickers and ready-made combinations.
- **Sections**: add, rename, reorder and remove. Four shapes cover most resumes: text, timeline, tags and link list.
- **My resumes**: saved in the browser (IndexedDB). Duplicate, download or delete from the home page.
- **Upload to re-edit**: any file this app downloaded can be uploaded again. Files from the earlier single-file editor are upgraded automatically.
- **Resume review** (`#/review`): score a saved, uploaded (PDF, Word, HTML, text) or pasted resume out of 100 for summary, experience, achievement impact, skills and ATS readability, with the reasons and fixes. Paste a job advert to see missing skills and keywords, experience to highlight, qualifications you have but did not mention, and gaps. A proofreader flags spelling, grammar, date, gap, length, personal-information, contact and formatting problems. All rule-based and local: nothing is uploaded. PDF and Word readers load only when a file is chosen.
- **Cover letter** (Review → Cover letter): a first draft from the resume and a pasted job advert. Template-based, not AI; it only claims what the resume shows and lists required skills it left out.
- **Versions**: keep one master resume and press **Tailor** to make a separate copy for a role (Software Engineer, Business Analyst…). Versions are grouped under their master in "My resumes".
- **Page view**: the editor preview can show an A4 sheet with dashed lines where pages are likely to break, and an estimated page count. It is an estimate; Save as PDF is exact. Classic (one column, ATS-friendly) is the recommended default.
- **Download**: one view-only `.html` file with the photo inside. It also prints to PDF in the same design.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production files in dist/
```

Requires Node 20 or newer.

## Deploy to Cloudflare Pages

1. Push this folder to a GitHub repository.
2. In Cloudflare, create a Pages project and connect the repository.
3. Build command: `npm run build`. Output directory: `dist`.

Every push to the main branch then publishes a new version. No environment variables are needed.

## Where things are

| Path | What lives there |
|---|---|
| `src/model/types.ts` | The shape of a resume. Start here. |
| `src/model/normalize.ts` | Cleans uploaded or stored data and upgrades old files. |
| `src/model/presets.ts` | The example and empty starting resumes. |
| `src/review/` | The review engine: `score.ts`, `jobmatch.ts`, `proofread.ts`, plus `lexicon.ts` (word lists to extend), `importText.ts` and `extract.ts` (read uploaded files). No UI code, no network. |
| `src/pages/Review.tsx` | The review screen. |
| `src/render/` | The templates. Each is a function from a resume to an HTML string, plus a CSS file. |
| `src/render/runtime.js` | The small script that goes inside every downloaded resume. |
| `src/pages/` | The two screens: Home and Editor. |
| `src/components/ui/` | shadcn-style Button, Input and Dialog. `npx shadcn add …` works for more. |
| `src/copy.ts` | Messages shown to people. Reword them here. |
| `src/index.css` | The app's colour, font and radius tokens. |

## Add a template

1. Create `src/render/yourname.ts` exporting `renderYourname(resume, options)` that returns `page(resume, options, { fonts, css, body })`.
2. Draw all four section types (`text`, `timeline`, `tags`, `links`). Escape every piece of text with `esc()` and every link with `safeUrl()`.
3. Add its id to `TemplateId` in `src/model/types.ts` and `TEMPLATE_IDS` in `src/model/normalize.ts`, and add it to the list in `src/render/index.ts`.

The preview, the thumbnails, the download and the PDF all come from that one function.

## Notes on safety

Uploaded files are never run or inserted into the page. Only the JSON data block is read, then every field is
checked and anything unexpected is dropped. Links are limited to web, mail and phone addresses, and photos to
embedded images or web addresses.



## What people can add

- Profile photo, an icon per organisation, and picture galleries (all stored inside the resume file)
- A QR code for any link (drawn in the browser with `qrcode-generator`, no outside service)
- Ready-made sections: Languages (with levels), Co-curricular activities, Achievements, References, and more; or a custom section with any name and layout
- Bullet points edited one by one (Enter adds the next, pasting several lines makes several bullets)
- Drag and drop for sections, entries and bullets (`@dnd-kit`; also works by keyboard: focus the handle, Space, arrow keys, Space)
- Text size: Small, Normal, Large, Extra large

Shared pieces used by every template (bullets, levels, gallery, QR, icons) live in `src/render/shared.ts` and `src/render/common.css`.

## Deploy to AWS CloudFront (GitHub Actions)

Pushing to `master` runs `.github/workflows/deploy-frontend.yml`, which builds the site,
creates/updates an S3 bucket and CloudFront distribution (`.github/cloudformation/frontend.yml`),
uploads `dist/`, and refreshes the cache.

**One-time setup**
1. In GitHub: Settings > Secrets and variables > Actions > Secrets, add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
   (an IAM user allowed to use CloudFormation, S3, CloudFront and ACM).
2. Push to `master` (or run the workflow manually). The run summary prints your `https://xxxx.cloudfront.net` address.

**Custom domain (later, after you buy one)**
1. Add repo Variables: `DOMAIN_NAME` (e.g. `resume.example.com`). Optional: `ALTERNATE_DOMAIN_NAME`, `HOSTED_ZONE_ID` (Route 53 only).
2. Run the workflow. Without Route 53, it pauses on the certificate: open AWS Certificate Manager (region us-east-1),
   copy the validation CNAME to your registrar's DNS, and the run continues once validated.
3. Add a CNAME from your domain to the CloudFront address shown in the run summary.

## Languages

The app and the fixed words in downloaded resumes come in English, Bahasa Melayu, 中文（简体）, தமிழ், हिन्दी and Español.

- `src/i18n/locales/<id>.ts` maps each English sentence to its translation. Missing entries show in English.
- Wrap new UI text in `t('English text')` (from `useT()`); add the translation to each locale file.
- `src/render/labels.ts` holds the fixed words inside a downloaded resume (set per resume in the editor).
- To add a language: add a locale file, register it in `src/i18n/index.tsx` (`LOCALES`, `DICTIONARIES`), `src/render/labels.ts` and `LANGS` in `src/model/normalize.ts`.

## Help

Need help? Email simon@craftyourcv.org.
