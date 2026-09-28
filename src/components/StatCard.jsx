export default function StatCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {Icon ? <span className="stat-card__icon"><Icon size={18} /></span> : null}
      </div>
      <strong className="stat-card__value">{value}</strong>
      {helper ? <span className="stat-card__helper">{helper}</span> : null}
    </article>
  )
}
