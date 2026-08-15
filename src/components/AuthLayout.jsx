import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

export function AuthLayout({ children, wide = false }) {
  return (
    <div className={`auth-shell${wide ? " is-wide" : ""}`}>
      <div className="auth-atmosphere" aria-hidden="true">
        <span className="auth-orb auth-orb-a" />
        <span className="auth-orb auth-orb-b" />
        <span className="auth-orb auth-orb-c" />
      </div>
      <header className="auth-toolbar">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-mark">T</span>
          TaskFlow
        </Link>
        <ThemeToggle />
      </header>
      <div className="auth-shell-main">{children}</div>
    </div>
  );
}
