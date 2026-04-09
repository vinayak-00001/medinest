import Link from "next/link";

import { getSession } from "@/lib/auth";
import { getUserById } from "@/lib/data";

export async function Header() {
  const session = await getSession();
  const user = session ? await getUserById(session.userId) : null;

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/">
          <span className="brand__mark">M</span>
          <span>MediNest Care</span>
        </Link>

        <nav className="nav-links">
          <Link className="nav-link" href="/doctors">
            Find doctors
          </Link>
          <Link className="nav-link" href="/#features">
            Features
          </Link>
          {session ? (
            <>
              <Link className="nav-link" href="/dashboard">
                {user?.role === "admin" ? "Admin dashboard" : user?.role === "doctor" ? "Doctor dashboard" : "My dashboard"}
              </Link>
              <form action="/api/logout" method="post">
                <button className="ghost-button" type="submit">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link className="button" href="/login">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
