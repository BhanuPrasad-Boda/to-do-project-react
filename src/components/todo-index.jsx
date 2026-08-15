import { Link } from "react-router-dom";
import "../styles/todoIndex.css";
import { ThemeToggle } from "./ThemeToggle";

export function ToDoIndex() {
  return (
    <div className="todo-index-page d-flex flex-column min-vh-100 position-relative" style={{ background: "var(--bg-primary)" }}>
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ zIndex: 0, opacity: 0.5, overflow: "clip", pointerEvents: "none" }}>
        <div className="position-absolute bg-primary rounded-circle blur-circle" style={{ width: "400px", height: "400px", top: "-100px", left: "-100px", filter: "blur(80px)" }}></div>
        <div className="position-absolute bg-success rounded-circle blur-circle" style={{ width: "300px", height: "300px", bottom: "-50px", right: "-50px", filter: "blur(80px)" }}></div>
      </div>

      <div className="container flex-grow-1 d-flex flex-column justify-content-center position-relative py-5 px-3" style={{ zIndex: 1 }}>
        
        <div className="d-flex justify-content-end mb-4 animate-slide-up">
          <ThemeToggle />
        </div>

        <div className="row align-items-center g-4 g-lg-5">
          <div className="col-12 col-lg-6 text-center text-lg-start">
            <div className="display-2 mb-3 animate-slide-up animate-stagger-1">🚀</div>
            <h1 className="fw-bold mb-4 text-primary animate-slide-up animate-stagger-2 hero-title" style={{ letterSpacing: "-1px" }}>
              Master Your Day
            </h1>
            
            <p className="lead text-secondary mb-4 mb-lg-5 animate-slide-up animate-stagger-3 hero-lead">
              Elevate your productivity. Organize tasks, track progress, and conquer your day with our premium task management solution.
            </p>
            
            <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start gap-3 animate-slide-up animate-stagger-3">
              <Link to="/register" className="btn btn-premium btn-lg px-4 px-sm-5">
                Get Started Free
              </Link>
              <Link to="/login" className="btn btn-outline-primary btn-lg px-4 px-sm-5">
                Login to Account
              </Link>
            </div>
          </div>

          <div className="col-12 col-lg-6 d-none d-lg-block">
            <div className="glass-panel-glow p-5 text-center animate-slide-up animate-stagger-2" style={{ minHeight: "280px" }}>
              <i className="bi bi-kanban text-primary" style={{ fontSize: "clamp(4rem, 12vw, 8rem)", opacity: 0.8 }}></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
