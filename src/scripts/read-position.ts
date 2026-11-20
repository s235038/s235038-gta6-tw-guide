const article = document.querySelector<HTMLElement>('[data-reading]')
const content = article?.querySelector<HTMLElement>('[data-reading-content]')
const indicator = article?.querySelector<HTMLElement>('[data-reading-position]')
const meter = indicator?.querySelector<HTMLProgressElement>('[data-reading-meter]')
const percent = indicator?.querySelector<HTMLElement>('[data-reading-value]')
const resume = indicator?.querySelector<HTMLButtonElement>('[data-reading-resume]')

if (article?.dataset.reading && content && indicator && meter && percent && resume) {
  const articleContent = content
  const progressMeter = meter
  const progressText = percent
  const key = `g6-guide-position-v1:${article.dataset.reading}`
  let progress = 0
  let pending = 0

  try {
    const stored = Number(localStorage.getItem(key))
    if (Number.isInteger(stored) && stored > 0 && stored <= 100) progress = stored
  } catch {
    // Reading still works if browser storage is disabled.
  }

  function display() {
    progressMeter.value = progress
    progressText.textContent = `${progress}%`
  }

  function bounds() {
    const { top, height } = articleContent.getBoundingClientRect()
    return { top: top + window.scrollY, distance: Math.max(1, height - window.innerHeight / 2) }
  }

  function save() {
    if (progress === 0) return
    try {
      const stored = Number(localStorage.getItem(key))
      if (!Number.isFinite(stored) || stored < progress) localStorage.setItem(key, String(progress))
    } catch {
      // Keep the in-page value when storage is blocked.
    }
  }

  function measure() {
    if (articleContent.getClientRects().length === 0) return
    const { top, distance } = bounds()
    const reached = Math.min(100, Math.floor((window.scrollY - top) / distance * 100))
    if (reached <= progress) return
    progress = reached
    display()
    save()
  }

  display()
  indicator.hidden = false
  resume.hidden = progress === 0 || progress === 100
  resume.addEventListener('click', () => {
    const { top, distance } = bounds()
    window.scrollTo({ top: top + distance * progress / 100, behavior: 'instant' })
  })
  window.addEventListener('scroll', () => {
    window.clearTimeout(pending)
    pending = window.setTimeout(measure, 180)
  }, { passive: true })
  window.addEventListener('pagehide', measure)
}
