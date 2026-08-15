import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";

export function ToDoIndex() {
  return (
    <AuthLayout wide>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="text-secondary small fw-semibold mb-2">TaskFlow</p>
          <h1>Plan the day. Finish what matters.</h1>
          <p className="lead text-secondary mb-0">
            A calm workspace for tasks, reminders, and focus — with a guide that helps you get started.
          </p>
          <div className="landing-actions">
            <Link to="/register" className="btn btn-premium btn-lg px-4">
              Create free account
            </Link>
            <Link to="/login" className="btn btn-outline-primary btn-lg px-4">
              Sign in
            </Link>
          </div>
          <div className="landing-features">
            <div className="landing-feature">
              <strong>Smart capture</strong>
              <span>Type naturally. Dates, times, and priority are parsed for you.</span>
            </div>
            <div className="landing-feature">
              <strong>Stay on track</strong>
              <span>OTP-secure accounts, reminders, and a clear daily plan.</span>
            </div>
            <div className="landing-feature">
              <strong>Works anywhere</strong>
              <span>Light or dark. Phone or desktop. Your list stays with you.</span>
            </div>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}
