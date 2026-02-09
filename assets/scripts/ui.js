'use strict'

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

const showLoader = (message) => {
	const overlay = createLoader()
	const messageEl = overlay.querySelector('.loading-message')
	if (messageEl && message) messageEl.textContent = message
	overlay.classList.add('is-visible')
}

const hideLoader = () => {
	const overlay = document.querySelector('#loading-screen')
	if (overlay) overlay.classList.remove('is-visible')
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

const attachHandlers = () => {
	const forms = document.querySelectorAll('form')
	for (const form of forms) {
		form.addEventListener('submit', () => {
			showLoader(getMessage(form, 'Suche Verbindungen...'))
		})
	}

	document.body.addEventListener('click', (event) => {
		const link = event.target.closest('a')
		if (!shouldHandleLink(link, event)) return
		if (isSameDocumentNavigation(link)) return
		showLoader(getMessage(link, 'Lade Seite...'))
	})
}

window.addEventListener('pageshow', hideLoader)
window.addEventListener('DOMContentLoaded', attachHandlers)
