"use strict";

// Calendar AJAX append functionality
const initCalendarAppend = () => {
	const moreButton = document.getElementById("later");
	if (!moreButton || moreButton.tagName.toLowerCase() !== "button") {
		return;
	}

	const calendarGrid = document.getElementById("calendar-grid");
	if (!calendarGrid) return;

	let isLoading = false;
	let globalCheapest = null;

	// Calculate initial global cheapest from existing cells
	const updateGlobalCheapest = () => {
		const cells = calendarGrid.querySelectorAll(
			"td:not(.empty):not(.outside) .priceLong",
		);
		for (const cell of cells) {
			const text = cell.textContent || "";
			const match = text.match(/(\d+)/);
			if (match) {
				const price = parseInt(match[1], 10);
				if (globalCheapest === null || price < globalCheapest) {
					globalCheapest = price;
				}
			}
		}
	};

	// Recalculate and re-mark cheapest cells
	const recalculateCheapest = () => {
		const allCells = calendarGrid.querySelectorAll(
			"td:not(.empty):not(.outside)",
		);
		let newCheapest = null;

		// Find cheapest
		for (const cell of allCells) {
			const priceEl = cell.querySelector(".priceLong");
			if (!priceEl) continue;
			const text = priceEl.textContent || "";
			const match = text.match(/(\d+)/);
			if (match) {
				const price = parseInt(match[1], 10);
				if (newCheapest === null || price < newCheapest) {
					newCheapest = price;
				}
			}
		}

		// Update classes
		for (const cell of allCells) {
			const priceEl = cell.querySelector(".priceLong");
			if (!priceEl) continue;
			const text = priceEl.textContent || "";
			const match = text.match(/(\d+)/);
			if (match) {
				const price = parseInt(match[1], 10);
				if (price === newCheapest) {
					cell.classList.add("cheapest");
				} else {
					cell.classList.remove("cheapest");
				}
			}
		}

		globalCheapest = newCheapest;
	};

	const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

	const createMonthCard = (month) => {
		const section = document.createElement("section");
		section.className = "month-card";

		const h2 = document.createElement("h2");
		h2.className = "month-title";
		h2.textContent = month.label;
		section.appendChild(h2);

		const table = document.createElement("table");
		table.className = "month-calendar";

		// Header
		const thead = document.createElement("thead");
		const headerRow = document.createElement("tr");
		for (const day of weekdays) {
			const th = document.createElement("th");
			th.textContent = day;
			headerRow.appendChild(th);
		}
		thead.appendChild(headerRow);
		table.appendChild(thead);

		// Body
		const tbody = document.createElement("tbody");
		const weeks = monthWeeks(month.days);
		weeks.forEach((week, index) => {
			const tr = document.createElement("tr");
			if (index % 2 === 0) tr.className = "even";
			for (const day of week) {
				const td = createDayCell(day);
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		});
		table.appendChild(tbody);
		section.appendChild(table);

		return section;
	};

	const monthWeeks = (days) => {
		const cells = [];
		if (days.length === 0) return [];

		// Parse the first day's date to get the weekday offset
		const firstDate = new Date(days[0].date);
		const startOffset = (firstDate.getDay() + 6) % 7; // Convert to Monday=0

		for (let i = 0; i < startOffset; i++) cells.push(null);
		for (const day of days) cells.push(day);

		const endOffset = (7 - (cells.length % 7)) % 7;
		for (let i = 0; i < endOffset; i++) cells.push(null);

		const weeks = [];
		for (let i = 0; i < cells.length; i += 7) {
			weeks.push(cells.slice(i, i + 7));
		}
		return weeks;
	};

	const createDayCell = (day) => {
		const td = document.createElement("td");

		if (!day) {
			td.className = "outside";
			return td;
		}

		if (day.past || !day.hasJourneys || !day.duration) {
			td.className = "empty";
			const dateSpan = document.createElement("span");
			dateSpan.className = "date";
			dateSpan.textContent = new Date(day.date).getDate();
			td.appendChild(dateSpan);

			const priceGroup = document.createElement("div");
			priceGroup.className = "priceGroup";
			const price = document.createElement("span");
			price.className = "price";
			price.textContent = "–";
			priceGroup.appendChild(price);
			td.appendChild(priceGroup);

			const duration = document.createElement("span");
			duration.className = "duration";
			duration.innerHTML = "\u200D";
			td.appendChild(duration);
			return td;
		}

		if (day.cheapest) td.className = "cheapest";

		const a = document.createElement("a");
		a.className = "cell";
		// Build day URL from current page params
		const dateStr = formatDateForUrl(day.date);
		a.href = buildDayUrl(dateStr);
		a.setAttribute("data-loading-message", "Lade Tagesansicht...");

		const dateSpan = document.createElement("span");
		dateSpan.className = "date";
		dateSpan.textContent = new Date(day.date).getDate();
		a.appendChild(dateSpan);

		const priceGroup = document.createElement("div");
		priceGroup.className = "priceGroup";

		const priceSpan = document.createElement("span");
		priceSpan.className = "price";

		if (day.price) {
			const priceLong = document.createElement("span");
			priceLong.className = "priceLong";
			priceLong.innerHTML =
				day.price.euros + "<sup>" + day.price.cents + "</sup>";
			priceSpan.appendChild(priceLong);

			const priceShort = document.createElement("span");
			priceShort.className = "priceShort";
			priceShort.textContent =
				Math.round(
					parseFloat(day.price.euros) + parseFloat(day.price.cents) / 100,
				) + "€";
			priceSpan.appendChild(priceShort);
		} else {
			const priceLong = document.createElement("span");
			priceLong.className = "priceLong";
			priceLong.textContent = "–";
			priceSpan.appendChild(priceLong);
			const priceShort = document.createElement("span");
			priceShort.className = "priceShort";
			priceShort.textContent = "–";
			priceSpan.appendChild(priceShort);
		}
		priceGroup.appendChild(priceSpan);

		const inlineDuration = document.createElement("span");
		inlineDuration.className = "inlineDuration";
		inlineDuration.innerHTML =
			'<span class="nb-clock" aria-hidden="true"></span><span class="durationText">' +
			day.duration +
			"</span>";
		priceGroup.appendChild(inlineDuration);

		a.appendChild(priceGroup);

		const durationSpan = document.createElement("span");
		durationSpan.className = "duration";
		durationSpan.innerHTML =
			'<span class="nb-clock" aria-hidden="true"></span><span class="durationText">' +
			day.duration +
			"</span>";
		a.appendChild(durationSpan);

		td.appendChild(a);
		return td;
	};

	const formatDateForUrl = (dateStr) => {
		const d = new Date(dateStr);
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		return `${day}.${month}.${year}`;
	};

	const buildDayUrl = (dateStr) => {
		const params = new URLSearchParams(window.location.search);
		params.set("date", dateStr);
		params.delete("pid");
		params.delete("startDate");
		params.delete("weeks");
		return "./day?" + params.toString();
	};

	// Helper to show/hide loading overlay with progress
	const showLoading = (message) => {
		let overlay = document.querySelector("#loading-screen");
		if (!overlay) {
			overlay = document.createElement("div");
			overlay.id = "loading-screen";
			overlay.className = "loading-screen";
			overlay.innerHTML = [
				'<div class="loading-card">',
				'<div class="loading-title">Bitte warten...</div>',
				'<div class="loading-message">' + message + "</div>",
				'<div class="loading-bar is-progress"><span></span></div>',
				"</div>",
			].join("");
			document.body.appendChild(overlay);
		}
		const messageEl = overlay.querySelector(".loading-message");
		if (messageEl && message) messageEl.textContent = message;
		const bar = overlay.querySelector(".loading-bar");
		if (bar) bar.classList.add("is-progress");
		const fill = overlay.querySelector(".loading-bar span");
		if (fill) fill.style.width = "0%";
		overlay.classList.add("is-visible");
	};

	const setProgress = (percent, message) => {
		const overlay = document.querySelector("#loading-screen");
		if (!overlay) return;
		const messageEl = overlay.querySelector(".loading-message");
		if (messageEl && message) messageEl.textContent = message;
		const fill = overlay.querySelector(".loading-bar span");
		if (fill) fill.style.width = Math.min(100, Math.max(0, percent)) + "%";
	};

	const hideLoading = () => {
		const overlay = document.querySelector("#loading-screen");
		if (overlay) overlay.classList.remove("is-visible");
	};

	const loadMore = async () => {
		if (isLoading) return;
		isLoading = true;

		let apiUrl = moreButton.getAttribute("data-api-url");
		if (!apiUrl) {
			isLoading = false;
			return;
		}

		// Clean up previous params
		const url = new URL(apiUrl, window.location.href);
		url.searchParams.delete("pid");
		apiUrl = url.pathname + url.search;

		showLoading("Lade weitere Tage...");
		moreButton.textContent = "Lade...";
		moreButton.disabled = true;

		try {
			const response = await fetch(apiUrl);
			if (!response.ok) throw new Error("Network error");

			const reader = response.body.getReader();
			const decoder = new TextDecoder("utf-8");
			let buffer = "";

			let data = null;

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				// Keep the last partial line in the buffer
				buffer = lines.pop();

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const msg = JSON.parse(line);
						if (msg.type === "progress") {
							setProgress(msg.percent, msg.message);
						} else if (msg.type === "result") {
							data = msg.data;
						} else if (msg.type === "error") {
							throw new Error(msg.message);
						}
					} catch (e) {
						// Ignorier JSON-Parse-Fehler für unvollständige Chunks
						if (e.message !== "Unexpected end of JSON input") console.error(e);
					}
				}
			}

			// End of stream, check buffer
			if (buffer.trim()) {
				try {
					const msg = JSON.parse(buffer);
					if (msg.type === "result") data = msg.data;
				} catch (e) {}
			}

			if (!data) throw new Error("No data received");

			let hasNewJourneys = false;

			if (data.months && data.months.length > 0) {
				for (const month of data.months) {
					// Check for at least one valid journey in this batch
					if (!hasNewJourneys) {
						for (const day of month.days) {
							if (day.hasJourneys && day.duration) {
								hasNewJourneys = true;
								break;
							}
						}
					}

					// Check if month already exists
					const existingCards = calendarGrid.querySelectorAll(".month-card");
					let existingCard = null;
					for (const card of existingCards) {
						const title = card.querySelector(".month-title");
						if (title && title.textContent === month.label) {
							existingCard = card;
							break;
						}
					}

					if (existingCard) {
						// Append new weeks to existing table
						const tbody = existingCard.querySelector("tbody");
						const weeks = monthWeeks(month.days);

						weeks.forEach((week, index) => {
							const tr = document.createElement("tr");
							// Alternate row coloring logic
							if (tbody.children.length % 2 === 0) tr.className = "even";

							for (const day of week) {
								const td = createDayCell(day);
								tr.appendChild(td);
							}
							tbody.appendChild(tr);
						});
					} else {
						const card = createMonthCard(month);
						calendarGrid.appendChild(card);
					}
				}

				// Recalculate cheapest across all months
				recalculateCheapest();
			}

			// Update button for next load
			if (data.hasMore && data.lastDate && hasNewJourneys) {
				const newUrl = new URL(apiUrl, window.location.href);
				newUrl.searchParams.set("startDate", data.lastDate);
				moreButton.setAttribute(
					"data-api-url",
					newUrl.pathname + newUrl.search,
				);
				moreButton.setAttribute("data-last-date", data.lastDate);
				moreButton.textContent = "Mehr anzeigen...";
				moreButton.disabled = false;
			} else {
				// No more data
				moreButton.textContent = "Keine passenden Ergebnisse mehr...";
				moreButton.disabled = true;
				moreButton.classList.add("disabled");
				moreButton.setAttribute("aria-disabled", "true");
			}
		} catch (error) {
			console.error("Error loading more weeks:", error);
			moreButton.textContent = "Fehler - erneut versuchen";
			moreButton.disabled = false;
		}

		hideLoading();
		isLoading = false;
	};

	updateGlobalCheapest();
	moreButton.addEventListener("click", loadMore);
};

window.addEventListener("DOMContentLoaded", initCalendarAppend);
