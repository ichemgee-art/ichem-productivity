import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function PeoplePicker({ title, role, people, selected, onChange }) {
  const [query, setQuery] = useState('')
  const rows = useMemo(() => people.filter((person) => person.role === role), [people, role])
  const filtered = rows.filter((person) => person.name.toLowerCase().includes(query.trim().toLowerCase()))

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  return (
    <div className="people-picker">
      <div className="people-picker__head">
        <div>
          <strong>{title}</strong>
          <span>{selected.length} مختار</span>
        </div>
        <div className="input-with-icon compact">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث..." />
        </div>
      </div>
      <div className="people-picker__list">
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
