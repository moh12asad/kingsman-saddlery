import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;
const distPath = join(__dirname, 'dist');
const indexPath = join(distPath, 'index.html');

// Security: Set appropriate headers
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from the dist directory (CSS, JS, images, etc.)
// Exclude index.html from static serving to prevent caching issues
app.use(express.static(distPath, {
  maxAge: '1y', // Cache static assets for 1 year
  etag: true,
  lastModified: true,
  // Exclude index.html from static middleware - we'll serve it separately with no-cache
  setHeaders: (res, path) => {
    // If this is index.html, don't let express.static handle it
    if (path.endsWith('index.html')) {
      // This shouldn't happen due to the middleware order, but just in case
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Explicitly handle index.html with no-cache headers BEFORE the catch-all route
// This ensures index.html is never cached, allowing users to receive app updates
app.get('/', (req, res) => {
  if (!existsSync(indexPath)) {
    console.error('index.html not found in dist directory');
    return res.status(500).send('Application not built. Please run npm run build first.');
  }

  try {
    const indexHtml = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(indexHtml);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

// Handle SPA routing - serve index.html for all non-file routes
// This catches all routes that don't match static files
app.get('*', (req, res) => {
  // Skip if this is a static file request (shouldn't happen, but safety check)
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return res.status(404).send('Not found');
  }

  // Check if index.html exists
  if (!existsSync(indexPath)) {
    console.error('index.html not found in dist directory');
    return res.status(500).send('Application not built. Please run npm run build first.');
  }

  try {
    const indexHtml = readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // CRITICAL: Don't cache index.html - users need to receive app updates
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(indexHtml);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Error loading application');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving static files from: ${distPath}`);
});

