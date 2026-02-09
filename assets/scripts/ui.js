'use strict'

let progressSource = null
let activeProgressId = null

const createLoader = () => {
	const existing = document.querySelector('#loading-screen')
	if (existing) return existing
	const overlay = document.createElement('div')
	overlay.id = 'loading-screen'
	overlay.className = 'loading-screen'
	overlay.innerHTML = [
		'<div class="loading-card">',
		'<div class="loading-title">Bitte warten...</div>',
		'<div class="loading-message">Suche Verbindungen...</div>',
		'<div class="loading-bar"><span></span></div>',
		'</div>',
	].join('')
	document.body.appendChild(overlay)
	return overlay
}

const resetBar = () => {
	const bar = document.querySelector('#loading-screen .loading-bar')
	const fill = document.querySelector('#loading-screen .loading-bar span')
	if (!bar || !fill) return
	bar.classList.remove('is-progress')
	fill.style.width = ''
}

const setProgress = (percent, message) => {
	const overlay = createLoader()
	const messageEl = overlay.querySelector('.loading-message')
	const bar = overlay.querySelector('.loading-bar')
	const fill = overlay.querySelector('.loading-bar span')
	if (messageEl && message) messageEl.textContent = message
	if (!bar || !fill) return
	const clamped = Math.max(0, Math.min(100, Math.round(+percent || 0)))
	bar.classList.add('is-progress')
	fill.style.width = clamped + '%'
}

const showLoader = (message, mode) => {
	const overlay = createLoader()
	const messageEl = overlay.querySelector('.loading-message')
	if (messageEl && message) messageEl.textContent = message
	if (mode === 'progress') setProgress(0, message)
	else resetBar()
	overlay.classList.add('is-visible')
}

const closeProgressSource = () => {
	if (progressSource) progressSource.close()
	progressSource = null
	activeProgressId = null
}

const hideLoader = () => {
	closeProgressSource()
	const overlay = document.querySelector('#loading-screen')
	if (overlay) overlay.classList.remove('is-visible')
	resetBar()
}

const shouldHandleLink = (link, event) => {
	if (!link || event.defaultPrevented) return false
	if (event.button !== 0) return false
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
	if (link.target && link.target.toLowerCase() === '_blank') return false
	const href = link.getAttribute('href') || ''
	if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
		return false
	}
	return link.origin === window.location.origin
}

const getMessage = (el, fallback) => {
	if (!el) return fallback
	const message = el.getAttribute('data-loading-message')
	return message && message.trim().length > 0 ? message : fallback
}

const isSameDocumentNavigation = (link) => {
	try {
		const target = new URL(link.href, window.location.href)
		const current = new URL(window.location.href)
		return (
			target.origin === current.origin &&
			target.pathname === current.pathname &&
			target.search === current.search &&
			target.hash === current.hash
		)
	} catch (error) {
		return false
	}
}

const createProgressId = () => (
	'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
)

const isCalendarUrl = (url) => {
	try {
		const target = new URL(url, window.location.href)
		return target.origin === window.location.origin && target.pathname === '/calendar'
	} catch (error) {
		return false
	}
}

const applyProgressId = (url, progressId) => {
	const target = new URL(url, window.location.href)
	target.searchParams.set('pid', progressId)
	return target.toString()
}

const bindProgress = (progressId) => {
	closeProgressSource()
	activeProgressId = progressId
	progressSource = new window.EventSource('/progress/' + encodeURIComponent(progressId))
	progressSource.addEventListener('progress', (event) => {
		if (activeProgressId !== progressId) return
		try {
			const data = JSON.parse(event.data || '{}')
			setProgress(data.percent, data.message || 'Lade Verbindungen...')
		} catch (error) {
			// ignore malformed events
		}
	})
	progressSource.addEventListener('done', (event) => {
		if (activeProgressId !== progressId) return
		try {
			const data = JSON.parse(event.data || '{}')
			setProgress(100, data.message || 'Fertig...')
		} catch (error) {
			setProgress(100, 'Fertig...')
		}
		closeProgressSource()
	})
	progressSource.addEventListener('error', () => {
		if (!progressSource || progressSource.readyState === window.EventSource.CLOSED) {
			closeProgressSource()
		}
	})
}

const attachHandlers = () => {
	const forms = document.querySelectorAll('form')
	for (const form of forms) {
		form.addEventListener('submit', () => {
			const action = form.getAttribute('action') || form.action
			if (isCalendarUrl(action)) {
				const progressId = createProgressId()
				let hidden = form.querySelector('input[name="pid"]')
				if (!hidden) {
					hidden = document.createElement('input')
					hidden.type = 'hidden'
					hidden.name = 'pid'
					form.appendChild(hidden)
				}
				hidden.value = progressId
				showLoader(getMessage(form, 'Suche Verbindungen...'), 'progress')
				bindProgress(progressId)
				return
			}
			showLoader(getMessage(form, 'Suche Verbindungen...'))
		})
	}

	document.body.addEventListener('click', (event) => {
		const link = event.target.closest('a')
		if (!shouldHandleLink(link, event)) return
		if (isSameDocumentNavigation(link)) return
		const href = link.getAttribute('href') || link.href
		if (isCalendarUrl(href)) {
			const progressId = createProgressId()
			link.href = applyProgressId(href, progressId)
			showLoader(getMessage(link, 'Lade Seite...'), 'progress')
			bindProgress(progressId)
			return
		}
		showLoader(getMessage(link, 'Lade Seite...'))
	})
}

window.addEventListener('pageshow', hideLoader)
window.addEventListener('DOMContentLoaded', attachHandlers)
