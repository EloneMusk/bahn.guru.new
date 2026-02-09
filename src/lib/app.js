import createExpress from "express";
import compression from "compression";
import apiCache from "apicache";
import helmet from "helmet";

import createRoutes from "./routes/index.js";
import * as api from "../api/index.js";

const createApp = () => {
	const app = createExpress();

	app.use(
		helmet({
			contentSecurityPolicy: false,
			hsts:
				process.env.NODE_ENV === "production"
					? {
							maxAge: 31536000,
							includeSubDomains: true,
							preload: true,
						}
					: false,
		}),
	);

	app.use(
		apiCache.middleware(
			"15 minutes",
			(req, res) => !req.path.startsWith("/progress/"),
		),
	);

	app.use(
		compression({
			filter: (req, res) => {
				if (req.path.startsWith("/progress/")) return false;
				return compression.filter(req, res);
			},
		}),
	);

	app.use("/assets", createExpress.static("assets"));

	const {
		greetingRoute,
		startRoute,
		dayRoute,
		calendarRoute,
		calendarJsonRoute,
		impressumRoute,
		faqRoute,
		stationsRoute,
		progressRoute,
	} = createRoutes(api);

	app.get("/", greetingRoute, startRoute);
	app.get("/start", startRoute);
	app.get("/day", dayRoute, startRoute);
	app.get("/calendar", calendarRoute, startRoute);
	app.get("/api/calendar", calendarJsonRoute);
	app.get("/impressum", impressumRoute);
	app.get("/faq", faqRoute);
	app.get("/stations", stationsRoute);
	app.get("/progress/:id", progressRoute);

	// Health check endpoint for Docker/Kubernetes
	app.get("/health", (req, res) => {
		res.json({ status: "ok", timestamp: new Date().toISOString() });
	});

	return app;
};

export default createApp;
