const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g

const digitMap = {
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
}

export function normalizeSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[٠-٩۰-۹]/g, (d) => digitMap[d] || d)
    .replace(ARABIC_DIACRITICS, '')
    .replace(/ـ/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/گ/g, 'ك')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array(b.length + 1)

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      )
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j]
  }

  return prev[b.length]
}

function fuzzyTokenMatch(queryToken, targetToken) {
  if (!queryToken || !targetToken) return false
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) return true

  const maxLen = Math.max(queryToken.length, targetToken.length)
  if (maxLen <= 3) return queryToken === targetToken

  const distance = levenshtein(queryToken, targetToken)
  const allowed = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3
  return distance <= allowed
}

export function smartIncludes(query, ...values) {
  const q = normalizeSearch(query)
  if (!q) return true

  const target = normalizeSearch(values.flat().filter(Boolean).join(' '))
  if (!target) return false
  if (target.includes(q)) return true

  const queryTokens = q.split(' ').filter(Boolean)
  const targetTokens = target.split(' ').filter(Boolean)

  return queryTokens.every((queryToken) =>
    targetTokens.some((targetToken) => fuzzyTokenMatch(queryToken, targetToken)),
  )
}
