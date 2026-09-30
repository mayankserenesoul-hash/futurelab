export default function RecentScenarios({ items, activeId, onOpen }) {
  return (
    <aside className="panel recent" aria-labelledby="recent-title">
      <h2 id="recent-title" className="panel-title">Recent scenarios</h2>
      {items.length === 0 ? (
        <p className="hint">Scenarios you analyze this session will appear here.</p>
      ) : (
        <ul className="recent-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`recent-item ${item.id === activeId ? "active" : ""}`}
                aria-current={item.id === activeId ? "true" : undefined}
                onClick={() => onOpen(item)}
              >
                <span className="mono-label">{item.scenario.categoryLabel}</span>
                <span>{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}