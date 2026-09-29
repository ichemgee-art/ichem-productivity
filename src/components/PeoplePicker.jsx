import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { smartIncludes } from '../lib/smartSearch'

export default function PeoplePicker({ title, role, people, selected, onChange }) {
  const [query, setQuery] = useState('')
  const rows = useMemo(() => people.filter((person) => person.role === role), [people, role])
  const filtered = rows.filter((person) => smartIncludes(query, person.name))

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  return (
    <div className="people-picker">
      <div className="people-picker__head">
        <div>
          <strong>{title}</strong>
          <span>{selected.length ? `${selected.length} مختار` : 'بدون'}</span>
        </div>
        <div className="input-with-icon compact">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث..." />
        </div>
      </div>
      <div className="people-picker__list">
        <label className={`pick-person pick-none ${selected.length === 0 ? 'is-selected' : ''}`}>
          <input
            type="checkbox"
            checked={selected.length === 0}
            onChange={() => onChange([])}
          />
          <span>بدون</span>
          <small>لا يوجد</small>
        </label>
        {filtered.map((person) => (
          <label className={`pick-person ${!person.active ? 'is-inactive' : ''}`} key={person.id}>
            <input
              type="checkbox"
              checked={selected.includes(person.id)}
              onChange={() => toggle(person.id)}
              disabled={!person.active && !selected.includes(person.id)}
            />
            <span>{person.name}</span>
            {!person.active ? <small>معطل</small> : null}
          </label>
        ))}
        {!filtered.length ? <div className="mini-empty">لا توجد أسماء مطابقة.</div> : null}
      </div>
    </div>
  )
}
