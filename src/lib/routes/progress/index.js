import { subscribeProgress } from "../../progress.js";

const createProgressRoute = () => (req, res) => {
	subscribeProgress(req.params.id, req, res);
};

export default createProgressRoute;
