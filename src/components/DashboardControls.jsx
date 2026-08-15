import React from "react";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Open" },
  { id: "completed", label: "Done" },
  { id: "overdue", label: "Overdue" },
];

export function DashboardControls({
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  sort,
  setSort,
  priority,
  setPriority,
  category,
  setCategory,
  categories = [],
}) {
  return (
    <div className="toolbar-row">
      <div className="search-field">
        <i className="bi bi-search" aria-hidden="true"></i>
        <input
          type="search"
          className="input-premium"
          placeholder="Search tasks"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search tasks"
          id="task-search"
        />
      </div>
      <div className="filter-pills" role="tablist" aria-label="Task status">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={`filter-pill ${filter === item.id ? "active" : ""}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="toolbar-selects">
        <select className="input-premium control-select" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
          <option value="all">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select className="input-premium control-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="input-premium control-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="dueDateAsc">Due soon</option>
          <option value="dueDateDesc">Due latest</option>
          <option value="priority">Priority</option>
          <option value="updated">Recently updated</option>
          <option value="titleAZ">Title A–Z</option>
        </select>
      </div>
    </div>
  );
}
