import { useEffect, useState } from "react";
import "../styles/Loader.css";

const messages = [
  "Preparing your experience",
  "Almost there",
  "Getting things ready",
  "Final touches",
  "Just a moment",
  "Setting things up",
  "Ready in a second"
];



const Loader = ({ show }) => {
  const [text, setText] = useState("");

  useEffect(() => {
    const random =
      messages[Math.floor(Math.random() * messages.length)];
    setText(random);
  }, []);

  return (
    <div className={`lux-loader ${show ? "show" : "hide"}`}>
      <div className="lux-card">

        <div className="glow-ring"></div>

        <div className="brand">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>

        <div className="progress-track">
          <div className="progress-fill"></div>
        </div>

        <p>{text}</p>

      </div>
    </div>
  );
};

export default Loader;
