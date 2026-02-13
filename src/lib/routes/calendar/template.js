import { h } from 'hastscript'
import moment from 'moment-timezone'
import 'moment-duration-format'
import * as helpers from '../helpers.js'

const head = (api, data) => {
	const title = generateSubTitleRoute(data).join('') + ' | Kalender'
	const elements = [
		...helpers.staticHeader(api),
		h('title', `${title} | ${api.settings.title}`),
		...helpers.opengraph({ api, extraTitle: title }),
		h('link', {
			rel: 'stylesheet',
			type: 'text/css',
			href: '/assets/styles/calendar.css',
		}),
	]
	return h('head', elements)
}

const generateSubTitleRoute = (data) => {
	return [data.input.origin.name, ' → ', data.input.destination.name]
}

const generateSubTitleOptions = (api, data) => {
	const result = api.options.text(data.input)
	const changeLink = h(
		'a',
		{
			href: './start?' + helpers.withOptionsQuery(api, data.input),
			id: 'change',
			'data-loading-message': 'Zur Eingabe...',
		},
		'Anfrage ändern...',
	)
	// Remove trailing dot if present
	if (result.length && result[result.length - 1] === '. ') {
		result.pop()
	}

	return [h('div.options-text', result), h('div.options-button', changeLink)]
}

const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

const durationContent = (duration) => [
	h('span.nb-clock', { 'aria-hidden': 'true' }),
	h('span.durationText', duration),
]

const dayCell = (api, data, day) => {
	if (!day) return h('td', { class: 'outside' })
	const date = [moment(day.date.raw).format('D')]
	if (day.past || !day.hasJourneys || !day.duration) {
		return h('td', { class: 'empty' }, [
			h('span.date', date),
			h('div.priceGroup', [h('span.price', '–')]),
			h('span.duration', '\u200D'),
		])
	}
	return h('td', { class: day.cheapest ? 'cheapest' : '' }, [
		h(
			'a',
			{
				class: 'cell',
				href: dayURL(api, data, day),
				'data-loading-message': 'Lade Tagesansicht...',
			},
			[
				h('span.date', date),
				h('div.priceGroup', [
					h('span.price', [
						day.price
							? h('span.priceLong', [
								day.price.euros,
								h('sup', day.price.cents),
							])
							: h('span.priceLong', '–'),
						day.price
							? h(
								'span.priceShort',
								Math.round(+day.price.euros + +day.price.cents / 100) + '€',
							)
							: h('span.priceShort', '–'),
					]),
					h('span.inlineDuration', durationContent(day.duration)),
				]),
				h('span.duration', durationContent(day.duration)),
			],
		),
	])
}

const monthWeeks = (days) => {
	const cells = []
	const startOffset = moment(days[0].date.raw).isoWeekday() - 1
	for (let i = 0; i < startOffset; i++) cells.push(null)
	for (const day of days) cells.push(day)
	const endOffset = (7 - (cells.length % 7)) % 7
	for (let i = 0; i < endOffset; i++) cells.push(null)

	const weeks = []
	for (let i = 0; i < cells.length; i += 7) {
		weeks.push(cells.slice(i, i + 7))
	}
	return weeks
}

const calendar = (api, data) => {
	if (!data) return h('span')
	const days = data.output.flat()
	const months = []
	for (const day of days) {
		const key = moment(day.date.raw).format('YYYY-MM')
		let month = months.find((m) => m.key === key)
		if (!month) {
			month = {
				key,
				label: moment(day.date.raw).locale('de').format('MMMM YYYY'),
				days: [],
			}
			months.push(month)
		}
		month.days.push(day)
	}

	return h(
		'div#calendar-grid',
		months.map((month) => {
			const rows = monthWeeks(month.days)
			return h('section.month-card', [
				h('h2.month-title', month.label),
				h('table.month-calendar', [
					h('thead', [
						h(
							'tr',
							weekdays.map((day) => h('th', day)),
						),
					]),
					h(
						'tbody',
						rows.map((week, index) =>
							h(
								index % 2 === 0 ? 'tr.even' : 'tr',
								week.map((day) => dayCell(api, data, day)),
							),
						),
					),
				]),
			])
		}),
	)
}

const dayURL = (api, data, day) => {
	if (!data) return null
	const date = moment(day.date.raw).format('DD.MM.YYYY')
	return `./day?${helpers.withOptionsQuery(api, data.input, { date })}`
}

const moreLink = (api, data) => {
	if (!data) return null
	if (data.hasMore === false) {
		return [
			h(
				'span',
				{ id: 'later', class: 'disabled', 'aria-disabled': 'true' },
				'Mehr anzeigen...',
			),
		]
	}
	// Use lastDate as startDate for next page, always fetch 4 weeks via AJAX
	const apiUrl = `/api/calendar?${helpers.withOptionsQuery(api, data.input, { startDate: data.lastDate || '' })}`
	return [
		h(
			'button',
			{
				id: 'later',
				type: 'button',
				'data-api-url': apiUrl,
				'data-last-date': data.lastDate || '',
			},
			'Mehr anzeigen...',
		),
	]
}

const createTemplate = (api) => (data, error) => {
	const document = helpers.toHtmlString([
		head(api, data),
		h('body', [
			h('div#page', [
				h('div#header', [
					h('a', { href: './start', title: 'Preiskalender' }, [
						h('h1', 'Preiskalender'),
					]),
				]),
				h('div', { id: 'route', class: 'subtitle' }, [
					h('span', generateSubTitleRoute(data)),
				]),
				h(
					'div',
					{ id: 'options', class: 'subtitle' },
					generateSubTitleOptions(api, data),
				),
				calendar(api, data),
				h('div#more', moreLink(api, data)),
			]),
			h('div#footer', [
				h('a', { id: 'faq', href: './faq' }, 'FAQ'),
				h('span', ' – '),
				h('a', { id: 'impressum', href: './impressum' }, 'Rechtliches'),
			]),
			h('script', { src: '/assets/scripts/calendar.js' }),
			...helpers.speedInsights(),
		]),
	])
	return document
}

export default createTemplate
