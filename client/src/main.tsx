import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initGoogleAuth } from "./hooks/useAuth";

// Initialize Google Auth
initGoogleAuth();

createRoot(document.getElementById("root")!).render(<App />);
