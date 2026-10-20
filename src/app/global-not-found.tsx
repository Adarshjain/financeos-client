import type { Metadata } from 'next';

// Unmatched URLs belong to no root layout (each group owns its own <html>), so Next renders this
// page on its own. Like global-error it must not import a stylesheet or font: Next attaches
// global-not-found's CSS and font preloads to every route, which would ship Legacy CSS and Inter to
// Dinero pages. It carries a tiny inline stylesheet instead (light palette).
export const metadata: Metadata = { title: 'Page not found' };

const css = `
body{margin:0;background:hsl(210 40% 98%);color:hsl(222 47% 11%);font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;-webkit-font-smoothing:antialiased}
.nf-wrap{display:flex;min-height:100vh;align-items:center;justify-content:center;padding:0 1rem;box-sizing:border-box;text-align:center}
.nf-code{margin:0 0 .5rem;font-size:2.25rem;line-height:2.5rem;font-weight:700}
.nf-title{margin:0 0 1.5rem;font-size:1.25rem;line-height:1.75rem;color:hsl(215 16% 47%)}
.nf-text{margin:0 auto 2rem;max-width:28rem;color:hsl(215 16% 47%)}
.nf-btn{display:inline-flex;height:2.5rem;align-items:center;border-radius:.375rem;background:hsl(160 84% 39%);padding:0 2rem;font-size:.875rem;font-weight:500;color:#fff;text-decoration:none}
.nf-btn:hover{background:hsl(160 84% 39% / .9)}
`;

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <head>
        <style>{css}</style>
      </head>
      <body>
        <div className="nf-wrap">
          <div>
            <h1 className="nf-code">404</h1>
            <p className="nf-title">Page not found</p>
            <p className="nf-text">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            {/* A plain anchor: this page has no router context of its own. */}
            <a className="nf-btn" href="/dashboard">
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
