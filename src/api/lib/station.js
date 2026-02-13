import { client } from './client.js'

const stations = async (s) => {
	if (!s) return []
	try {
		const results = await client.locations(s, {
			results: 5,
			stops: true,
			addresses: false,
			poi: false,
		})
		return results
	} catch (error) {
		console.error(`Station search error for "${s}":`, error)
		return []
	}
}

const station = async (s) => {
	if (!s) return false
	try {
		const data = await stations(s)
		if (data.length > 0) return data[0]
		return false
	} catch (error) {
		console.error(`Station error for "${s}":`, error)
		return false
	}
}

export { station, stations }
export default station
