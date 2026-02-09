import createParseParams from "../params.js";
import calendar from "./calendar.js";
import moment from "moment-timezone";

const getLastDate = (calendarResults) => {
	if (!calendarResults) return null;
	const days = calendarResults.flat();
	if (days.length === 0) return null;
	const lastDay = days[days.length - 1];
	if (!lastDay?.date?.raw) return null;
	return moment(lastDay.date.raw).add(1, "day").format("YYYY-MM-DD");
};

const hasMoreJourneyData = (calendarResults, weeks) => {
	if (!calendarResults) return false;
	if (weeks >= 12) return false;
	const days = calendarResults.flat().filter((day) => !day.past);
	if (days.length === 0) return false;
	const tailWindowSize = 14;
	const tail = days.slice(-Math.min(tailWindowSize, days.length));
	const tailHasJourneys = tail.some((day) => day.hasJourneys && day.duration);
	return tailHasJourneys;
};

const formatDayForJson = (day) => {
	if (!day) return null;
	return {
		date: day.date?.raw ? moment(day.date.raw).format("YYYY-MM-DD") : null,
		dateFormatted: day.date?.formatted || null,
		past: !!day.past,
		hasJourneys: !!day.hasJourneys,
		duration: day.duration || null,
		price: day.price || null,
		cheapest: !!day.cheapest,
	};
};

const createCalendarJsonRoute = (api) => {
	const parseParams = createParseParams(api);
	return async (req, res) => {
		try {
			res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");
			res.flushHeaders?.();

			const writeLine = (data) => {
				res.write(JSON.stringify(data) + "\n");
				if (res.flush) res.flush();
			};

			const { params, error } = await parseParams(req.query);
			if (error) {
				writeLine({ type: "error", message: "Ungültige Eingabe." });
				res.end();
				return;
			}

			params.weeks = 4;

			if (
				req.query.startDate &&
				moment(req.query.startDate, "YYYY-MM-DD", true).isValid()
			) {
				params.startDate = req.query.startDate;
			}

			const calendarResults = await calendar(api, params, (state) => {
				writeLine({
					type: "progress",
					percent: state.percent,
					message: state.message || "Lade...",
				});
			});

			if (!calendarResults) {
				writeLine({
					type: "result",
					data: { months: [], hasMore: false, lastDate: null },
				});
				res.end();
				return;
			}

			const hasMore = hasMoreJourneyData(calendarResults, params.weeks);
			const lastDate = getLastDate(calendarResults);

			// Group by month for frontend
			const days = calendarResults.flat();
			const months = [];
			for (const day of days) {
				if (!day?.date?.raw) continue;
				const key = moment(day.date.raw).format("YYYY-MM");
				let month = months.find((m) => m.key === key);
				if (!month) {
					month = {
						key,
						label: moment(day.date.raw).locale("de").format("MMMM YYYY"),
						days: [],
					};
					months.push(month);
				}
				month.days.push(formatDayForJson(day));
			}

			writeLine({
				type: "result",
				data: { months, hasMore, lastDate },
			});
			res.end();
		} catch (fatalError) {
			console.error("[json.js] Fatal error in route handler:", fatalError);
			res.write(
				JSON.stringify({ type: "error", message: "Server Error" }) + "\n",
			);
			res.end();
		}
	};
};

export default createCalendarJsonRoute;
