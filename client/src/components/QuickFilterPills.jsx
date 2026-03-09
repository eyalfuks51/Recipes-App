import './QuickFilterPills.scss';

const MEAL_PILLS = [
  { value: null, label: 'הכל' },
  { value: 'ארוחת בוקר', label: 'בוקר' },
  { value: 'ארוחת ערב', label: 'ערב' },
  { value: 'מועדפים', label: 'מועדפים', disabled: true },
];

export function QuickFilterPills({ activeFilter, onFilterChange, onOpenFilterSheet, hasActiveAdvancedFilters }) {
  return (
    <div className="quick-filter-pills" role="tablist" aria-label="Quick filters">
      {/* Filter button — opens advanced sheet */}
      <button
        className={`pill pill--filter${hasActiveAdvancedFilters ? ' pill--filter-active' : ''}`}
        onClick={onOpenFilterSheet}
        aria-label="Open advanced filters"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        סינון
      </button>

      {/* Meal type pills */}
      {MEAL_PILLS.map((pill) => (
        <button
          key={pill.label}
          role="tab"
          aria-selected={activeFilter === pill.value}
          className={`pill${activeFilter === pill.value ? ' pill--active' : ''}${pill.disabled ? ' pill--disabled' : ''}`}
          onClick={() => !pill.disabled && onFilterChange(pill.value)}
          disabled={pill.disabled}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
