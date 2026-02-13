import { h } from 'hastscript'
import * as helpers from '../helpers.js'

const head = (api) => {
	const elements = [
		...helpers.staticHeader(api),
		h('title', (api.settings.greeting.title || 'Hinweis') + ' | ' + api.settings.title),
		...helpers.opengraph({ api, extraTitle: null }),
		h('link', { rel: 'stylesheet', type: 'text/css', href: '/assets/styles/greeting.css' }),
	]
	return h('head', elements)
}

const generate = api => {
	const document = helpers.toHtmlString([
		head(api),
		h('body', [
			h('div#page', [
				h('div.question', [
					...(api.settings.greeting.title ? [h('h2', api.settings.greeting.title)] : []),
					...api.settings.greeting.elements,
				]),
			]),
			h('div#footer', [
				h('a', { id: 'impressum', href: './impressum' }, 'Rechtliches'),
			]),
			...helpers.speedInsightsScripts(),
		]),
	])
	return document
}

const createGreetingRoute = (api) => (req, res, next) => {
	if (!api.settings.greeting) return next()
	res.send(generate(api))
}

export default createGreetingRoute
