# Deployment Guide — Full Update

## Files to add/replace in your repo

### Replace existing files:
- `index.html` — OG tags, structured data, favicon, canonical, expanded content
- `main.js` — multi-format support, restore purchase UI, preserved extensions
- `api/check-purchase.js` — switched from sandbox to production Paddle API

### New files to add at repo root:
- `vercel.json` — security headers (CSP, HSTS, X-Frame-Options, etc.)
- `robots.txt` — search engine crawl instructions
- `sitemap.xml` — page listing for Google/Bing indexing
- `favicon.svg` — camera icon favicon
- `about.html` — about page with identity/contact signals

### Append to existing file:
- `style.css` — copy contents of `style-additions.css` to the bottom of your existing `style.css`

---

## Vercel environment variable

Your `PADDLE_API_KEY` env var in Vercel needs to be your **production** key.

1. Go to Vercel → photo-delivery-prep → Settings → Environment Variables
2. Check the current value of `PADDLE_API_KEY`
3. If it starts with `test_`, it's the sandbox key — replace it
4. Get your production key from: Paddle → Settings → Authentication → API Keys (make sure you're in **Live** mode, not Sandbox)
5. Replace the value in Vercel
6. Redeploy after updating

---

## Git commit messages

```
fix: Switch restore purchase API to production Paddle

- Change endpoint from sandbox-api.paddle.com to api.paddle.com
- Update price ID to production pri_01kg5n2jrb4xwpgehfhrpqjm0y
- Frontend was using production tokens but API was hitting sandbox
```

```
feat: Add multi-format support and restore purchase UI

- Support JPEG, PNG, TIFF, WebP, BMP, GIF, HEIC, RAW, and video files
- Preserve original file extensions instead of hardcoding .jpg
- Add restore purchase flow with email verification via /api/check-purchase
- Show/hide EXIF options based on whether JPEGs are selected
- Cap file preview at 20 items, show file type summary
- Add loading state during ZIP generation
```

```
feat: Add SEO, security headers, and legitimacy signals

- Add vercel.json with CSP, HSTS, X-Frame-Options, Permissions-Policy
- Add robots.txt and sitemap.xml for search engine indexing
- Add favicon.svg
- Add about.html with tool description and contact info
- Add Open Graph and Twitter Card meta tags
- Add Schema.org WebApplication structured data
- Add canonical URL tag
- Expand page content: How It Works, Supported Formats, expanded FAQ
- Add About link to footer
```

```
style: Add CSS for restore link, formats grid, unlocked state
```

---

## After deploying — next steps

1. **Submit to Google Search Console**
   - Go to https://search.google.com/search-console
   - Add property: `photodeliveryprep.com`
   - Verify via DNS TXT record (Vercel makes this easy under Domains settings)
   - Submit sitemap: `https://photodeliveryprep.com/sitemap.xml`

2. **Submit to Bing Webmaster Tools**
   - Go to https://www.bing.com/webmasters
   - Add site and verify
   - Submit same sitemap

3. **Set up support email**
   - The about page references `support@photodeliveryprep.com`
   - Set up a forwarding address or mailbox for that
   - Or change it to whatever email you want to use

4. **Test restore purchase end to end**
   - After updating the Vercel env var to production
   - Load the site, add 11+ files to trigger the limit
   - Click "Restore your purchase"
   - Enter a real checkout email
   - Confirm it returns unlocked

5. **Appeal the domain flag**
   - With the security headers, structured data, proper meta tags, sitemap,
     about page, and expanded content now in place, the site looks significantly
     more legitimate to automated scanners
   - If the flag is from alphaMountain.ai, you can submit a recategorization
     request at https://alphamountain.ai/domain-recategorization
   - If ISP-specific, contact the ISP with the updated site and your incident report
