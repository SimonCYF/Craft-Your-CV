# Resume Builder

A resume builder that runs entirely in the browser. People pick a template, fill in a form,
and download one self-contained HTML file. There is no backend, no sign-up and no tracking.

## What it does

- **Templates**: Bold, Classic and Sidebar, switchable at any time, each with free colour pickers and ready-made combinations.
- **Sections**: add, rename, reorder and remove. Four shapes cover most resumes: text, timeline, tags and link list.
- **My resumes**: saved in the browser (IndexedDB). Duplicate, download or delete from the home page.
- **Upload to re-edit**: any file this app downloaded can be uploaded again. Files from the earlier single-file editor are upgraded automatically.
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
