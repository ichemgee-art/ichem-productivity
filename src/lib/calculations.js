export const round2 = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return 0
  // A tiny relative-safe decimal nudge avoids binary floating-point half-cent drift
  // and matches PostgreSQL numeric ROUND(..., 2) for our non-negative financial values.
  return Math.round((number + 1e-9) * 100) / 100
}

const finiteNonNegative = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

const safeCount = (value) => {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : 0
}

export function calculateSubmissionPreview({
  meters,
  pricePerMeter,
  technicianCount = 0,
  assistantCount = 0,
  workerCount = 0,
  techShare = 0.7,
  workerRatePerMeter = 10,
}) {
  const normalizedMeters = round2(finiteNonNegative(meters))
  const price = finiteNonNegative(pricePerMeter)
  const normalizedTechShare = finiteNonNegative(techShare, 0.7)
  const workerRate = finiteNonNegative(workerRatePerMeter)

  const nt = safeCount(technicianCount)
  const na = safeCount(assistantCount)
  const nw = safeCount(workerCount)

  const total = round2(normalizedMeters * price)

  let techTotal = 0
  let assistantTotal = 0

  if (nt > 0 && na > 0) {
    techTotal = round2(total * normalizedTechShare)
    // Keep the remainder with assistants so group totals always reconcile exactly.
    assistantTotal = round2(total - techTotal)
  } else if (nt > 0) {
    techTotal = total
  } else if (na > 0) {
    assistantTotal = total
  }

  const workerTotal = nw > 0 ? round2(normalizedMeters * workerRate) : 0

  return {
    meters: normalizedMeters,
    price,
    total,
    techTotal,
    assistantTotal,
    workerTotal,
    techPerPerson: nt > 0 ? round2(techTotal / nt) : 0,
    assistantPerPerson: na > 0 ? round2(assistantTotal / na) : 0,
    workerPerPerson: nw > 0 ? round2(workerTotal / nw) : 0,
  }
}
