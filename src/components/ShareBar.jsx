import { useEffect, useState } from "react";
import { encodeScenario } from "../utils/share.js";
import { resultToCsv, downloadCsv } from "../utils/exportCsv.js";

export default function ShareBar({ scenario, result }) {
  const [status, setStatus] = useState("");

  // A new result means the old message no longer applies
  useEffect(() => setStatus(""), [result]);

  async function copyLink() {
    const url = `${window.location.origin}/lab?s=${encodeURIComponent(encodeScenario(scenario))}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied. Anyone who opens it sees this scenario and its result.");
    } catch {
      setStatus(`Your browser blocked copying. Copy this link by hand: ${url}`);
    }
  }

  function download() {
    downloadCsv(`futurelab-${scenario.category}.csv`, resultToCsv(scenario, result));
    setStatus("CSV downloaded. It includes the inputs, assumptions, limitations, results and every data point.");
  }

  return (
    <section className="panel sharebar" aria-label="Share and export">
      <button type="button" className="btn btn-small btn-ghost" onClick={copyLink}>
        Copy share link
      </button>
      <button type="button" className="btn btn-small btn-ghost" onClick={download}>
        Download CSV
      </button>
      <p className="hint" role="status">{status}</p>
    </section>
  );
}