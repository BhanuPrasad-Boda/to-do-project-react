import { useEffect, useState } from "react";
import "../styles/dashboardCarousel.css";

const slides = [
  {
    title: "👋 Welcome Back",
    desc: "Stay focused and complete your tasks on time",
  },
  {
    title: "📋 Manage Appointments",
    desc: "Edit, reschedule or complete your tasks easily",
  },
  {
    title: "⏰ Stay Organized",
    desc: "Never miss an important schedule again",
  },
];

export function DashboardCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="carousel-wrapper">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`carousel-slide ${
            index === activeIndex ? "active" : ""
          }`}
        >
          <h3>{slide.title}</h3>
          <p>{slide.desc}</p>
        </div>
      ))}

      {/* Indicators */}
      <div className="carousel-dots">
        {slides.map((_, index) => (
          <span
            key={index}
            className={index === activeIndex ? "dot active" : "dot"}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
