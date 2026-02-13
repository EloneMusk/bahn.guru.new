import createParseParams from '../params.js'

const createStationsRoute = (api) => {
	const parseParams = createParseParams(api)
	return async (req, res, next) => {
		try {
			const query = req.query.query
			if (!query) return res.json([])
			const results = await api.stations(query)
			return res.json(results)
		} catch (error) {
			console.error(error)
			return res.status(500).json([])
		}
	}
}

export default createStationsRoute
