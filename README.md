# AIIMS CNE Management System

## Target Production Architecture

```
User Browser
   ↓
Cloudflare Pages (Hosts React/Vite Web App Only)
   ↓
Google Apps Script Backend (Single Authoritative Backend)
   ↓
Google Sheets / Google Drive / Gemini API
```

### Production Platform: Cloudflare Pages
* **Frontend**: Pure client-side React/Vite Single Page Application (SPA) compiled to `dist/`, hosted directly on Cloudflare Pages.
* **Routing**: Configured via `public/_redirects` (`/* /index.html 200`) for seamless client-side SPA routing.
* **No Edge Functions**: Cloudflare Pages hosts static assets only. No serverless functions or proxy layers on Cloudflare.

### Authoritative Backend: Google Apps Script (`Code.gs`)
* **Single Authoritative Backend**: All API actions route directly to Google Apps Script.
* **Direct Gemini AI MCQ Generation**: Google Apps Script handles clinical question generation directly via `UrlFetchApp` calling the Google Gemini API. Quota reservation, validation, Drive content extraction, and question persistence are authoritatively managed in Apps Script.
* **Database & Persistence**: Google Sheets (14 authoritative tabs).
* **Storage**: Google Drive (Learning Resources & CNO photo).

### Local Development: Express + Vite
* **Local Development Server**: `server.ts` executed via `npm run dev`.
* Serves the local development frontend via Vite middleware on port 3000.

## Key Build & Validation Commands

* `npm install`: Installs dependencies.
* `npm run sync:gas`: Synchronizes authoritative `Code.gs` into `src/backend/googleAppsScript.ts`.
* `npm run lint`: Performs full TypeScript static verification (`tsc --noEmit`).
* `npm run build`: Builds the production bundle (`dist/`).
* `npm run dev`: Boots local development server (`tsx server.ts`).

## Backend Configuration (Google Apps Script Script Properties)

* **GEMINI_API_KEY**: Script Property in Google Apps Script (Project Settings > Script Properties) for Google Gemini API access.
* **GEMINI_MODEL**: AI model configuration (defaults to `gemini-2.5-flash`). Paid-tier models are strictly prohibited.
* **VITE_APPS_SCRIPT_URL**: Google Apps Script web app endpoint configured in the web app.

