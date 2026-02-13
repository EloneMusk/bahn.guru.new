import moment from 'moment-timezone'
import settings from './settings.js'

export { default as params } from './lib/params.js'
export * as options from './lib/options.js'
export { default as station, stations } from './lib/station.js'
export { default as journeys } from './lib/journeys.js'
export { default as settings } from './settings.js'

export const shopLink = (origin, destination, date, journey, params) => {
	const when = date || journey?.legs?.[0]?.plannedDeparture || new Date()
	const time = moment(when).tz(settings.timezone)
	const classValue = params?.class === 1 ? 1 : 2
	const toInt = (value) =>
		Number.isFinite(value) ? Math.round(value * 1000000) : null
	const evaId = (id) => {
		if (!id) return null
		const parsed = Number(id)
		return Number.isNaN(parsed) ? String(id) : String(parsed)
	}
	const buildLocation = (stop) => {
		const name = stop?.name || ''
		const x = toInt(stop?.location?.longitude)
		const y = toInt(stop?.location?.latitude)
		const eva = evaId(stop?.id)
		const parts = ['A=1', `O=${name}`]
		if (x !== null) parts.push(`X=${x}`)
		if (y !== null) parts.push(`Y=${y}`)
		parts.push('U=80')
		if (eva) parts.push(`L=${eva}`)
		return parts.join('@') + '@'
	}

	const url = new URL('https://www.bahn.de/buchung/fahrplan/suche')
	const hashParams = new URLSearchParams()
	hashParams.set('sts', 'true')
	hashParams.set('so', origin?.name || '')
	hashParams.set('zo', destination?.name || '')
	hashParams.set('kl', String(classValue))
	hashParams.set('sot', 'ST')
	hashParams.set('zot', 'ST')
	const originEva = evaId(origin?.id)
	const destinationEva = evaId(destination?.id)
	if (originEva) hashParams.set('soei', originEva)
	if (destinationEva) hashParams.set('zoei', destinationEva)
	hashParams.set('soid', buildLocation(origin))
	hashParams.set('zoid', buildLocation(destination))
	hashParams.set('hd', time.format('YYYY-MM-DDTHH:mm:ss'))
	hashParams.set('hza', 'D')
	hashParams.set('hz', '[]')
	hashParams.set('ar', 'false')
	hashParams.set('s', 'true')
	hashParams.set('d', 'false')
	hashParams.set('vm', '00,01,02,03,04,05,06,07,08,09')
	hashParams.set('fm', 'false')
	hashParams.set('bp', 'false')
	hashParams.set('dlt', 'false')
	hashParams.set('dltv', 'false')
	url.hash = hashParams.toString()
	return url.toString()
}
