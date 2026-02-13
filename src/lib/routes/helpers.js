import { h } from 'hastscript'
import { u } from 'unist-builder'
import { toHtml } from 'hast-util-to-html'
import jsBeautify from 'js-beautify'

const useUmami = process.env.ANALYTICS === 'true'
const useSpeedInsights = process.env.SPEED_INSIGHTS !== 'false' // Enabled by default

export const joinUrl = (base, path) => {
	const baseClean = base.endsWith('/') ? base : `${base}/`
	const pathClean = path.replace(/^\.?\//, '')
	return baseClean + pathClean
}

export const formatPrice = price => {
	price = price.toFixed(2).toString().split('.')
	return { euros: price[0], cents: price[1] }
}

export const opengraph = ({ api, extraTitle }) => {
	let title = api.settings.ogTitle
	if (extraTitle) title += ` - ${extraTitle}`
	return [
		h('meta', { property: 'og:title', content: title }),
		h('meta', { property: 'og:description', content: api.settings.ogDescription }),
		h('meta', { property: 'og:image', content: api.settings.ogImage }),
		h('meta', { name: 'twitter:card', content: 'summary' }),
	]
}

export const staticHeader = api => {
	const header = [
		h('meta', { charset: 'utf-8' }),
		h('meta', { name: 'description', content: api.settings.description }),
		h('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }),
		h('link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }),
		h('link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }),
		h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@500&display=swap' }),
		h('link', { rel: 'stylesheet', type: 'text/css', href: '/assets/styles/reset.css' }),
		h('link', { rel: 'stylesheet', type: 'text/css', href: '/assets/styles/base.css' }),
		...(useUmami
			? [
				u('comment', `the following script is used for cookie-less, GDPR compliant analytics.
you can disable it at any time, e.g. using the NoScript or PrivacyBadger browser extensions,
and the website will still work 100% fine. as a privately maintained open-source project,
gaining some insights in how (much) this service is used is really good to stay motivated.
for more information on the analytics framework, which is completely open source, please
check https://umami.is/docs/faq`),
				h('script', { async: true, defer: true, 'data-website-id': api.settings.analyticsId, src: 'https://developer.bahn.guru/script.js' }),
			]
			: []),
	]
	for (const style of api.settings.styles) { header.push(h('link', { rel: 'stylesheet', type: 'text/css', href: joinUrl('/assets/styles/', style) })) }

	if (api.settings.icon) { header.push(h('link', { rel: 'icon', type: 'image/png', href: joinUrl('/assets/', api.settings.icon) })) }

	header.push(h('script', { src: '/assets/scripts/ui.js', defer: true }))
	return header
}

export const withOptionsQuery = (api, input, extra = {}) => {
	const params = new URLSearchParams()
	if (input?.origin?.name) params.set('origin', input.origin.name)
	if (input?.destination?.name) params.set('destination', input.destination.name)
	const optionParts = (api?.options?.url && input) ? api.options.url(input) : []
	for (const part of optionParts) {
		const separator = part.indexOf('=')
		if (separator <= 0) continue
		const key = part.slice(0, separator)
		const value = part.slice(separator + 1)
		params.set(key, value)
	}
	for (const [key, value] of Object.entries(extra)) {
		if (value === null || value === undefined || value === '') continue
		params.set(key, String(value))
	}
	return params.toString()
}

export const speedInsights = () => {
	if (!useSpeedInsights) return []
	return [
		h('script', {}, 'window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };'),
		h('script', { defer: true, src: '/_vercel/speed-insights/script.js' }),
	]
}

export const toHtmlString = (e) => jsBeautify.html(toHtml(h(undefined, u('doctype'), h('html', e))))
