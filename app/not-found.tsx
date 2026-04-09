import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <span className="eyebrow">Page not found</span>
      <h1 className="page-title">This page does not exist.</h1>
      <p className="muted">The link may be broken, or the page may have been moved.</p>
      <div className="inline-actions">
        <Link className="button" href="/">
          Go home
        </Link>
        <Link className="ghost-button" href="/dashboard">
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
