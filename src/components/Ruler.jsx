// A visual reference only — inch markings across the page width, with the
// 1" margins shaded. It doesn't drag/resize margins (that's a much bigger
// feature); it exists so the page reads as an authentic printed sheet.
const PAGE_WIDTH_IN = 8.5
const MARGIN_IN = 1

export default function Ruler() {
  const ticks = []
  for (let i = 0; i <= PAGE_WIDTH_IN * 8; i++) {
    const inch = i / 8
    const isInch = i % 8 === 0
    const isHalf = i % 4 === 0
    ticks.push(
      <div
        key={i}
        className={`ruler-tick${isInch ? ' ruler-tick-inch' : isHalf ? ' ruler-tick-half' : ''}`}
        style={{ left: `${(inch / PAGE_WIDTH_IN) * 100}%` }}
      >
        {isInch && inch > 0 && inch < PAGE_WIDTH_IN && <span className="ruler-tick-label">{inch}</span>}
      </div>,
    )
  }

  const marginPct = (MARGIN_IN / PAGE_WIDTH_IN) * 100

  return (
    <div className="ruler-wrap" aria-hidden="true">
      <div className="ruler">
        <div className="ruler-margin" style={{ left: 0, width: `${marginPct}%` }} />
        <div className="ruler-margin" style={{ right: 0, width: `${marginPct}%` }} />
        {ticks}
      </div>
    </div>
  )
}
