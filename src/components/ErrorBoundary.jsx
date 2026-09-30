import { Component } from "react";

// Catches unexpected crashes in the page below it, so users never see a blank white screen.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("UI error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="container lab-placeholder" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1>FutureLab hit an unexpected problem</h1>
        <p>
          This page couldn't be shown. Nothing was lost on the server. Reload the page, or go back to the home page.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Reload the page
          </button>
          <a href="/" className="btn btn-ghost">Back to home</a>
        </div>
      </section>
    );
  }
}