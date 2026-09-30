import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" aria-label="FutureLab home">
          <span className="brand-mark" aria-hidden="true">◐</span>
          FutureLab
        </Link>
        <nav aria-label="Main">
          <a href="/#how">How it works</a>
          <a href="/#examples">Examples</a>
          <Link to="/lab" className="btn btn-small">Open the Lab</Link>
        </nav>
      </div>
    </header>
  );
}
