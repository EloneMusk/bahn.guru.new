import chunk from "lodash/chunk.js";
import sortBy from "lodash/sortBy.js";
import formatDuration from "ms";
import moment from "moment-timezone";
import Queue from "p-queue";
import retry from "p-retry";
import timeout from "p-timeout";
import * as helpers from "../helpers.js";

const timeoutTime = 10 * 1000;

const formatDayResult = (result) => {
	if (!result) return null;
	return {
		price:
			result.price && typeof result.price.amount === "number"
				? helpers.formatPrice(result.price.amount)
				: null,
		duration: formatDuration(result.duration),
		hasJourneys: true,
	};
};

const addAttributes = (journeysPerDay) => {
	for (const day of journeysPerDay) {
		for (const journey of day) {
			const plannedDeparture = new Date(journey.legs[0].plannedDeparture);
			const plannedArrival = new Date(
				journey.legs[journey.legs.length - 1].plannedArrival,
			);
			const duration = +plannedArrival - +plannedDeparture;
			journey.duration = duration;
		}
	}
	return journeysPerDay;
};

const sortJourneysPerDay = (journeysPerDay) => {
	const days = [];
	for (const day of journeysPerDay) {
		const perDuration = sortBy(day, ["duration"]);
		const perPrice = sortBy(perDuration, (j) =>
			j.price && typeof j.price.amount === "number"
				? j.price.amount
				: Number.POSITIVE_INFINITY,
		);
		days.push(perPrice);
	}
	return days;
};

const markCheapest = (formattedJourneyPerDay) => {
	let cheapest = null;
	for (const day of formattedJourneyPerDay) {
		if (day && day.price && (!cheapest || +day.price.euros < cheapest))
			cheapest = +day.price.euros;
	}
	for (const day of formattedJourneyPerDay) {
		if (day && day.price) day.cheapest = +day.price.euros === cheapest;
	}
	return formattedJourneyPerDay;
};

const generateCalendar = (weeks, startDate = null) => {
	// Use startDate if provided, otherwise use current date
	let date = startDate
		? moment(startDate).tz("Europe/Berlin")
		: moment().tz("Europe/Berlin");
	let emptyDates = 0;
	while (+date.format("E") !== 1) {
		date.subtract(1, "days");
		emptyDates++;
	}

	const dates = [];
	for (let i = 0; i < weeks * 7; i++) {
		if (dates.length === 0 || +date.format("D") === 1)
			dates.push({
				date: { raw: moment(date), formatted: date.format("D MMM") },
				past: i < emptyDates,
			});
		else
			dates.push({
				date: { raw: moment(date), formatted: date.format("D") },
				past: i < emptyDates,
			});

		date.add(1, "days");
		if (i >= emptyDates) date = date.startOf("day");
	}

	return dates;
};

const fillCalendar = (cal, formattedJourneyPerDay) => {
	let counter = 0;
	for (const day of cal) {
		if (!day.past)
			Object.assign(
				day,
				formattedJourneyPerDay[counter++] || { price: false, duration: false },
			);
	}
	return chunk(cal, 7);
};

const calendar = (api, params, onProgress) => {
	const q = new Queue({ concurrency: 2, interval: 1500, intervalCap: 2 });
	const cal = generateCalendar(params.weeks, params.startDate);
	const total = cal.filter((day) => !day.past).length;
	let completed = 0;
	if (onProgress) {
		onProgress({
			completed,
			total,
			percent: total > 0 ? 0 : 100,
			message: "Lade Kalenderdaten...",
		});
	}
	const requests = [];
	for (const day of cal) {
		if (!day.past) {
			requests.push(
				q
					.add(() =>
						retry(
							() => timeout(api.journeys(params, day.date.raw), timeoutTime),
							{ retries: 3 },
						).catch((err) => []),
					)
					.then((result) => {
						completed++;
						if (onProgress) {
							const percent =
								total > 0
									? Math.min(99, Math.round((completed / total) * 100))
									: 100;
							onProgress({
								completed,
								total,
								percent,
								message: `Lade Verbindungen (${completed}/${total})...`,
							});
						}
						return result;
					}),
			);
		}
	}

	return Promise.all(requests)
		.then((journeysPerDay) => {
			journeysPerDay = addAttributes(journeysPerDay);
			journeysPerDay = sortJourneysPerDay(journeysPerDay);
			const journeyPerDay = journeysPerDay.map((js) => js[0]);
			let formattedJourneyPerDay = journeyPerDay.map(formatDayResult);
			if (formattedJourneyPerDay.every((element) => !element)) return null;
			formattedJourneyPerDay = markCheapest(formattedJourneyPerDay);
			return fillCalendar(cal, formattedJourneyPerDay);
		})
		.catch((err) => {
			console.error(err);
			return null;
		});
};

export default calendar;
