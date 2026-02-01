# Google Search Console Setup Guide

This guide will help you submit your website to Google Search Console so that Google can index and display your site in search results.

---

## Prerequisites

- Your website must be live and accessible at `https://kingsmansaddlery.com`
- You must have access to your domain's DNS settings (GoDaddy)
- You must have a Google account

---

## Step 1: Create a Google Search Console Account

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click **"Add Property"** or **"Start now"**

---

## Step 2: Add Your Property (Domain)

You have two options for verification:

### Option A: Domain Property (Recommended - Covers all subdomains)

1. Select **"Domain"** as the property type
2. Enter: `kingsmansaddlery.com` (without `https://` or `www`)
3. Click **"Continue"**
4. You'll see a verification record to add to your DNS

**DNS Verification Steps:**
1. Copy the TXT record provided by Google (looks like: `google-site-verification=xxxxxxxxxxxxx`)
2. Go to [GoDaddy DNS Management](https://www.godaddy.com)
3. Log in and navigate to your domain's DNS settings
4. Click **"Add"** to create a new record:
   - **Type**: `TXT`
   - **Name**: `@` (or leave blank for root domain)
   - **Value**: Paste the entire verification string from Google
   - **TTL**: 1 Hour (default)
5. Click **"Save"**
6. Wait 5-10 minutes for DNS propagation
7. Go back to Google Search Console and click **"Verify"**

### Option B: URL Prefix Property (Alternative)

1. Select **"URL prefix"** as the property type
2. Enter: `https://kingsmansaddlery.com` or `https://www.kingsmansaddlery.com`
3. Click **"Continue"**
4. Choose a verification method:

**Method 1: HTML File Upload (Easiest)**
- Download the HTML verification file
- Upload it to your `client/public/` folder
- Redeploy your site
- Click **"Verify"** in Google Search Console

**Method 2: HTML Tag**
- Copy the meta tag provided
- Add it to your `client/index.html` in the `<head>` section
- Redeploy your site
- Click **"Verify"** in Google Search Console

**Method 3: DNS Record** (Same as Option A above)

---

## Step 3: Submit Your Sitemap

Once verified, submit your sitemap to help Google discover all your pages:

1. In Google Search Console, click on your property
2. In the left sidebar, click **"Sitemaps"** (under "Indexing")
3. In the **"Add a new sitemap"** field, enter: `sitemap.xml`
4. Click **"Submit"**
5. Google will start processing your sitemap (may take a few hours)

**Note:** Your sitemap is located at: `https://kingsmansaddlery.com/sitemap.xml`

---

## Step 4: Request Indexing (Optional but Recommended)

To speed up the indexing process for your most important pages:

1. In Google Search Console, click **"URL Inspection"** (top search bar)
2. Enter your homepage URL: `https://kingsmansaddlery.com`
3. Click **"Enter"**
4. Click **"Request Indexing"**
5. Repeat for other important pages:
   - `https://kingsmansaddlery.com/shop`
   - `https://kingsmansaddlery.com/products`
   - `https://kingsmansaddlery.com/about`
   - `https://kingsmansaddlery.com/contact`

---

## Step 5: Verify Your robots.txt

1. In Google Search Console, click **"robots.txt Tester"** (under "Indexing")
2. Check that your robots.txt is accessible at: `https://kingsmansaddlery.com/robots.txt`
3. Verify it's not blocking important pages

---

## Step 6: Monitor Your Site's Performance

After a few days, you can check:

1. **Coverage Report**: See which pages are indexed
   - Go to **"Coverage"** in the left sidebar
   - Check for any errors or warnings

2. **Performance Report**: See search analytics
   - Go to **"Performance"** in the left sidebar
   - View clicks, impressions, and average position

3. **Mobile Usability**: Ensure your site is mobile-friendly
   - Go to **"Mobile Usability"** in the left sidebar
   - Fix any mobile issues if found

---

## Important Notes

### ⏱️ Timeline
- **Verification**: Usually instant after DNS propagation (5-10 minutes)
- **Sitemap Processing**: 1-3 days
- **Initial Indexing**: 1-7 days
- **Full Indexing**: Can take weeks depending on site size

### 🔄 Keep Your Sitemap Updated
- Your current sitemap includes static pages
- For dynamic product pages, consider:
  - Generating a dynamic sitemap on your server
  - Or updating the static sitemap periodically when you add new products

### 📊 Regular Maintenance
- Check Google Search Console weekly for errors
- Monitor your site's search performance
- Update your sitemap when you add major new pages
- Fix any crawl errors promptly

---

## Troubleshooting

### Problem: Verification Fails

**Solutions:**
1. Wait longer for DNS propagation (can take up to 48 hours)
2. Double-check the TXT record is exactly as Google provided
3. Verify the record using: [MXToolbox TXT Lookup](https://mxtoolbox.com/TXTLookup.aspx)
4. Try a different verification method (HTML file or meta tag)

### Problem: Sitemap Shows Errors

**Solutions:**
1. Verify your sitemap is accessible: `https://kingsmansaddlery.com/sitemap.xml`
2. Check that all URLs in the sitemap are accessible (no 404 errors)
3. Ensure the sitemap XML format is valid
4. Make sure URLs use `https://` (not `http://`)

### Problem: Pages Not Being Indexed

**Solutions:**
1. Check robots.txt isn't blocking the pages
2. Ensure pages have proper meta tags and content
3. Request indexing manually for important pages
4. Build internal links to important pages
5. Wait longer - indexing can take time

---

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Google's SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Sitemap Guidelines](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)

---

## Next Steps After Setup

1. ✅ Set up Google Analytics (if not already done)
2. ✅ Optimize page titles and descriptions for SEO
3. ✅ Ensure fast page load times
4. ✅ Make sure your site is mobile-friendly
5. ✅ Build quality backlinks to your site
6. ✅ Create quality content regularly

---

**Last Updated:** January 27, 2025


