import createGreetingRoute from './greeting/index.js'
import createStartRoute from './start/index.js'
import createDayRoute from './day/index.js'
import createCalendarRoute from './calendar/index.js'
import createCalendarJsonRoute from './calendar/json.js'
import createImpressumRoute from './impressum/index.js'
import createFaqRoute from './faq/index.js'
import createStationsRoute from './stations/index.js'
import createProgressRoute from './progress/index.js'

const createRoutes = (api) => {
	const greetingRoute = createGreetingRoute(api)
	const startRoute = createStartRoute(api)
	const dayRoute = createDayRoute(api)
	const calendarRoute = createCalendarRoute(api)
	const calendarJsonRoute = createCalendarJsonRoute(api)
	const impressumRoute = createImpressumRoute(api)
	const faqRoute = createFaqRoute(api)
	const stationsRoute = createStationsRoute(api)
	const progressRoute = createProgressRoute()
	return {
		greetingRoute,
		startRoute,
		dayRoute,
		calendarRoute,
		calendarJsonRoute,
		impressumRoute,
		faqRoute,
		stationsRoute,
		progressRoute,
	}
}

export default createRoutes
