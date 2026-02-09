import createExpress from "express";
import * as http from "http";
import compression from "compression";
import apiCache from "apicache";

import createRoutes from "./routes/index.js";
import * as api from "../api/index.js";
import helmet from "helmet";

const createServer = () => {
	const express = createExpress();
	const server = http.createServer(express);

	express.use(
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

	express.use(
		apiCache.middleware(
			"15 minutes",
			(req, res) => !req.path.startsWith("/progress/"),
		),
	);

	express.use(
		compression({
			filter: (req, res) => {
				if (req.path.startsWith("/progress/")) return false;
				return compression.filter(req, res);
			},
		}),
	);

	express.use("/assets", createExpress.static("assets"));

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
	express.get("/", greetingRoute, startRoute);
	express.get("/start", startRoute);
	express.get("/day", dayRoute, startRoute);
	express.get("/calendar", calendarRoute, startRoute);
	express.get("/api/calendar", calendarJsonRoute);
	express.get("/impressum", impressumRoute);
	express.get("/faq", faqRoute);
	express.get("/stations", stationsRoute);
	express.get("/progress/:id", progressRoute);

	// Health check endpoint for Docker/Kubernetes
	express.get("/health", (req, res) => {
		res.json({ status: "ok", timestamp: new Date().toISOString() });
	});

	return server;
};

export default createServer;
