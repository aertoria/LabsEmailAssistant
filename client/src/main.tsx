import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Google Auth script is now loaded automatically in the useAuth hook

createRoot(document.getElementById("root")!).render(<App />);
