import * as http from 'http'
import createApp from './app.js'

const createServer = () => {
	const app = createApp()
	const server = http.createServer(app)
	return server
}

export default createServer
