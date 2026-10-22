import styles from './FilterPanel.module.css'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
]

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL']

function FilterPanel({ isOpen, sort, onSortChange, selectedSizes, onToggleSize, onReset, showSizes = true }) {
  return (
    <div
      id="filter-panel"
      className={`${styles.panel} ${isOpen ? styles.open : ''}`}
      inert={!isOpen}
    >
      <div className={styles.content}>
        <fieldset className={styles.group}>
          <legend>Sort by</legend>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={sort === option.value ? styles.active : ''}
              aria-pressed={sort === option.value}
              onClick={() => onSortChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>

        {/* 사이즈는 의류에만 있어서 다른 카테고리에서는 숨김 */}
        {showSizes && (
          <fieldset className={styles.group}>
            <legend>Size</legend>
            <div className={styles.sizes}>
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={selectedSizes.includes(size) ? styles.active : ''}
                  aria-pressed={selectedSizes.includes(size)}
                  onClick={() => onToggleSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <button type="button" className={styles.reset} onClick={onReset}>
          Clear all
        </button>
      </div>
    </div>
  )
}

export default FilterPanel
