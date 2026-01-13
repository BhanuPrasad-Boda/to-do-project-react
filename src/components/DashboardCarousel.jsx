import { useEffect, useRef, useState } from "react";
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
  const touchStartX = useRef(null);

  /* Auto slide */
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 4000);
    return () => clearInterval(timer);
  }, [activeIndex]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  };

  /* Touch handlers */
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) nextSlide();       // swipe left
    if (diff < -50) prevSlide();      // swipe right

    touchStartX.current = null;
  };

  return (
    <div
      className="carousel-wrapper"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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

      {/* Dots */}
      <div className="carousel-dots">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === activeIndex ? "active" : ""}`}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
