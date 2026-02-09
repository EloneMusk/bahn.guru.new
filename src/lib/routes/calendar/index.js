import createParseParams from '../params.js'
import createTemplate from './template.js'
import calendar from './calendar.js'
import { initProgress, updateProgress, finishProgress, failProgress } from '../../progress.js'

const hasMoreJourneyData = (calendarResults, weeks) => {
	if (!calendarResults) return false
	if (weeks >= 12) return false
	const days = calendarResults.flat().filter(day => !day.past)
	if (days.length === 0) return false
	const tailWindowSize = 14
	const tail = days.slice(-Math.min(tailWindowSize, days.length))
	const tailHasJourneys = tail.some(day => day.hasJourneys && day.duration)
	return tailHasJourneys
}

const createForwardError = (req, next) => (code) => {
	req.query.error = code
	next()
}

const createCalendarRoute = (api) => {
	const parseParams = createParseParams(api)
	const template = createTemplate(api)
	return async (req, res, next) => {
		const progressId = typeof req.query.pid === 'string' ? req.query.pid : null
		if (progressId) initProgress(progressId, { percent: 0, message: 'Starte Suche...' })
		const forwardError = createForwardError(req, next)
		try {
			const { params, error } = await parseParams(req.query)
			if (error) {
				if (progressId) failProgress(progressId, { percent: 100, message: 'Ungueltige Eingabe.' })
				return forwardError(error)
			}

			if (+req.query.weeks && +req.query.weeks <= 12 && +req.query.weeks > 0) params.weeks = +req.query.weeks
			else params.weeks = 4

			const calendarResults = await calendar(api, params, progressId
				? (state) => updateProgress(progressId, state)
				: null)
			if (!calendarResults) {
				if (progressId) finishProgress(progressId, { percent: 100, message: 'Keine Verbindungen gefunden.' })
				return forwardError('no-results')
			}
			const hasMore = hasMoreJourneyData(calendarResults, params.weeks)
			if (progressId) finishProgress(progressId, { percent: 100, message: 'Kalender geladen.' })
			return res.send(template({ input: params, output: calendarResults, hasMore }))
		} catch (error) {
			console.error(error)
			if (progressId) failProgress(progressId, { percent: 100, message: 'Fehler bei der Abfrage.' })
			return forwardError('unknown')
		}
	}
}

export default createCalendarRoute
