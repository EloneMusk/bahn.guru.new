import { createClient } from "db-vendo-client";
import { withRetrying } from "db-vendo-client/retry.js";
import { parsePrice as defaultParsePrice } from "db-vendo-client/parse/tickets.js";
import { profile as dbProfile } from "db-vendo-client/p/db/index.js";
import { profile as dbnavProfile } from "db-vendo-client/p/dbnav/index.js";
import { profile as dbwebProfile } from "db-vendo-client/p/dbweb/index.js";

const requestedProfile = (process.env.DB_PROFILE || "db").toLowerCase();

const profiles = {
	db: dbProfile,
	dbnav: dbnavProfile,
	dbweb: dbwebProfile,
};

const baseProfile = profiles[requestedProfile] || dbProfile;

const parseClusterPrice = (jj) => {
	const clusters = jj?.angebote?.angebotsCluster;
	if (!Array.isArray(clusters)) return null;
	let cheapest = null;
	let currency = "EUR";
	for (const cluster of clusters) {
		for (const subCluster of cluster?.angebotsSubCluster || []) {
			for (const position of subCluster?.angebotsPositionen || []) {
				const price =
					position?.einfacheFahrt?.standard?.reisePosition?.reisePosition
						?.preis;
				const amount = price?.betrag;
				if (typeof amount === "number") {
					if (cheapest === null || amount < cheapest) {
						cheapest = amount;
						currency = price.waehrung || currency;
					}
				}
			}
		}
	}
	return typeof cheapest === "number" ? { amount: cheapest, currency } : null;
};

const profile = {
	...baseProfile,
	parsePrice: (ctx, jj) => {
		const parsed = defaultParsePrice(ctx, jj);
		if (parsed && typeof parsed.amount === "number") return parsed;
		const fallback = parseClusterPrice(jj);
		return fallback || parsed || null;
	},
};

const userAgent =
	process.env.DB_USER_AGENT || process.env.USER_AGENT || "bahn.guru-v2";

const retryProfile = withRetrying(profile, {
	retries: 2,
	minTimeout: 250,
	factor: 2,
	retryIf: (err) => {
		const status = err?.statusCode || err?.response?.statusCode;
		return status === 429 || (status >= 500 && status < 600);
	},
});

const client = createClient(retryProfile, userAgent);

export { client, requestedProfile as profileName };
