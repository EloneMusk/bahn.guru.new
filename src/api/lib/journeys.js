import moment from 'moment-timezone'
import settings from '../settings.js'
import { data as loyaltyCards } from 'db-vendo-client/format/loyalty-cards.js'
import { client } from './client.js'

const pickCheapestTicketPrice = (tickets) => {
	if (!Array.isArray(tickets) || tickets.length === 0) return null
	let cheapest = null
	for (const ticket of tickets) {
		const priceObj = ticket?.priceObj
		if (!priceObj || priceObj.amount === undefined || priceObj.amount === null) { continue }
		const amount = Number(priceObj.amount)
		if (Number.isNaN(amount)) continue
		if (!cheapest || amount < cheapest.amount) { cheapest = { amount, currency: priceObj.currency } }
	}
	if (!cheapest) return null
	return {
		amount: cheapest.amount / 100,
		currency: cheapest.currency || 'EUR',
	}
}

const normalizePrice = (journey) => {
	if (journey?.price && journey.price.amount !== undefined) {
		const amount = Number(journey.price.amount)
		if (!Number.isNaN(amount)) {
			return { amount, currency: journey.price.currency || 'EUR' }
		}
	}
	return pickCheapestTicketPrice(journey?.tickets)
}

const buildLoyaltyCard = (params) => {
	const bc = params?.bcOriginal ?? params?.bc ?? 0
	if (!bc) return null
	const discount = bc === 4 || bc === 3 ? 50 : 25
	return {
		type: loyaltyCards.BAHNCARD,
		discount,
		class: params.class === 1 ? 1 : 2,
	}
}

const isBusLeg = (leg) => {
	const line = leg?.line
	const values = [line?.productName, line?.product, line?.mode]
	return values.some(
		(value) => typeof value === 'string' && value.toLowerCase() === 'bus',
	)
}

const fetchJourneys = async (from, to, opt = {}) => {
	opt = Object.assign(
		{
			bahncard: null,
			class: 2,
			stopovers: false,
			transfers: -1,
			transferTime: 0,
		},
		opt,
	)

	const when = new Date(opt.departure)
	if (Number.isNaN(+when)) throw new TypeError('opt.departure is invalid')

	const loyaltyCard = opt.bahncard || null

	const age = opt.age === 'Y' ? 20 : 30

	try {
		const useBestprice =
			process.env.BESTPRICE !== '0' &&
			process.env.BESTPRICE !== 'false'
		const journeysResult = await client.journeys(from, to, {
			departure: when,
			results: 10,
			transfers: opt.transfers === -1 ? undefined : opt.transfers,
			transferTime: opt.transferTime || undefined,
			firstClass: opt.class === 1,
			age,
			loyaltyCard,
			bestprice: useBestprice,
		})

		if (!journeysResult || !journeysResult.journeys) return []

		const journeysWithPrices = await Promise.all(
			journeysResult.journeys.map(async (journey) => {
				try {
					if (journey.price?.amount) {
						return { ...journey, price: normalizePrice(journey) }
					}
					if (journey.refreshToken) {
						const refreshed = await client.refreshJourney(
							journey.refreshToken,
							{ tickets: true },
						)
						const merged = { ...journey, ...refreshed.journey }
						return { ...merged, price: normalizePrice(merged) }
					}
					return { ...journey, price: normalizePrice(journey) }
				} catch (err) {
					return { ...journey, price: normalizePrice(journey) }
				}
			}),
		)

		return journeysWithPrices
	} catch (err) {
		console.error('Error fetching journeys:', err)
		return []
	}
}

const journeys = (params, day) => {
	const allowPriceless =
		process.env.ALLOW_PRICELESS === 'true' ||
		process.env.ALLOW_PRICELESS === '1'
	const dayTimestamp = +moment.tz(day, settings.timezone).startOf('day')
	return fetchJourneys(params.origin.id, params.destination.id, {
		departure: moment(day).toDate(),
		class: params.class,
		bahncard: buildLoyaltyCard(params),
		age: params.age === 'Y' ? 'Y' : 'E',
	})
		.then((results) => {
			const hasPriced = results.some((j) => j.price?.amount)
			return results.filter((j) => {
				const plannedDeparture = new Date(j.legs[0].plannedDeparture)
				const plannedArrival = new Date(
					j.legs[j.legs.length - 1].plannedArrival,
				)
				const duration = +plannedArrival - +plannedDeparture
				const changes = j.legs.length - 1
				return (
					(!params.duration || duration <= params.duration * 60 * 60 * 1000) &&
					(!params.departureAfter ||
						+plannedDeparture >= +params.departureAfter + dayTimestamp) &&
					(!params.arrivalBefore ||
						+plannedArrival <= +params.arrivalBefore + dayTimestamp) &&
					(params.maxChanges == null || params.maxChanges >= changes) &&
					j.legs.some((l) => l.line && !isBusLeg(l)) &&
					(allowPriceless || !hasPriced || !!j.price?.amount)
				)
			})
		})
		.then((results) => {
			for (const journey of results) {
				for (const leg of journey.legs) {
					leg.product =
						leg.line?.productName ||
						leg.line?.product ||
						leg.line?.name ||
						leg.line?.mode ||
						null
				}
			}
			return results
		})
		.catch((err) => {
			console.error(err)
			return []
		})
}

export default journeys
