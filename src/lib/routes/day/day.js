import * as helpers from '../helpers.js'

const formatResult = (result) => Object.assign(result, {
	formattedPrice: (result.price && typeof result.price.amount === 'number')
		? helpers.formatPrice(result.price.amount)
		: null,
})

const markCheapest = (results) => {
	if (!results) return null
	for (const journey of results) {
		const plannedDeparture = new Date(journey.legs[0].plannedDeparture)
		const plannedArrival = new Date(journey.legs[journey.legs.length - 1].plannedArrival)
		const duration = +plannedArrival - (+plannedDeparture)
		journey.duration = duration
	}
	let cheapest = null
	for (const journey of results) {
		if (journey.formattedPrice && (!cheapest || +journey.formattedPrice.euros < cheapest)) {
			cheapest = +journey.formattedPrice.euros
		}
	}
	for (const journey of results) {
		if (journey.formattedPrice) journey.cheapest = (+journey.formattedPrice.euros === cheapest)
	}
	return results
}

const day = (api, params) => {
	return api.journeys(params, params.date)
		.then(results => markCheapest(results.map(formatResult)))
		.catch(err => {
			console.log(err)
			return null
		})
}

export default day
