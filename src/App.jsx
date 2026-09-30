import { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Landing from "./pages/Landing.jsx";
import Lab from "./pages/Lab.jsx";

const TITLES = {
  "/": 'FutureLab: Ask "What if?"',
  "/lab": "FutureLab: Simulation Lab",
};

export default function App() {
  const location = useLocation();
  const mainRef = useRef(null);
  const lastPath = useRef(location.pathname);

  // On every page change: update the tab title, jump to the top, and move focus to the
  // page content so keyboard and screen-reader users know the page changed.
  useEffect(() => {
    document.title = TITLES[location.pathname] || TITLES["/"];
    if (lastPath.current !== location.pathname) {
      lastPath.current = location.pathname;
      window.scrollTo({ top: 0 });
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Navbar />
      <main id="main" ref={mainRef} tabIndex={-1}>
        {/* key: moving to another page clears a previous crash */}
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}