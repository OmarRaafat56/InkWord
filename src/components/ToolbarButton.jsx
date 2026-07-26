export default function ToolbarButton({ onClick, active, disabled, label, children }) {
  return (
    <button
      type="button"
      className={`tb-btn${active ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
    >
      {children}
    </button>
  )
}
