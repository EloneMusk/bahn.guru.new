const sessions = new Map()
const SESSION_TTL_MS = 5 * 60 * 1000
const CLEANUP_INTERVAL_MS = 60 * 1000

const now = () => Date.now()

const normalizeState = (state = {}) => ({
	percent: Number.isFinite(state.percent) ? Math.max(0, Math.min(100, Math.round(state.percent))) : 0,
	completed: Number.isFinite(state.completed) ? Math.max(0, Math.round(state.completed)) : 0,
	total: Number.isFinite(state.total) ? Math.max(0, Math.round(state.total)) : 0,
	message: typeof state.message === 'string' ? state.message : 'Bitte warten...',
	done: !!state.done,
	error: !!state.error,
	updatedAt: now(),
})

const ensureSession = (id) => {
	if (!id || typeof id !== 'string') return null
	let session = sessions.get(id)
	if (!session) {
		session = {
			state: normalizeState(),
			clients: new Set(),
		}
		sessions.set(id, session)
	}
	return session
}

const sendEvent = (res, event, data) => {
	res.write(`event: ${event}\n`)
	res.write(`data: ${JSON.stringify(data)}\n\n`)
}

const broadcast = (id, event) => {
	const session = sessions.get(id)
	if (!session) return
	for (const client of session.clients) {
		sendEvent(client, event, session.state)
	}
}

export const initProgress = (id, state = {}) => {
	const session = ensureSession(id)
	if (!session) return
	session.state = normalizeState(state)
	broadcast(id, 'progress')
}

export const updateProgress = (id, state = {}) => {
	const session = ensureSession(id)
	if (!session) return
	session.state = normalizeState({ ...session.state, ...state, done: false, error: false })
	broadcast(id, 'progress')
}

export const finishProgress = (id, state = {}) => {
	const session = ensureSession(id)
	if (!session) return
	session.state = normalizeState({ ...session.state, ...state, percent: 100, done: true, error: false })
	broadcast(id, 'progress')
	broadcast(id, 'done')
}

export const failProgress = (id, state = {}) => {
	const session = ensureSession(id)
	if (!session) return
	session.state = normalizeState({ ...session.state, ...state, done: true, error: true })
	broadcast(id, 'progress')
	broadcast(id, 'done')
}

export const subscribeProgress = (id, req, res) => {
	const session = ensureSession(id)
	if (!session) {
		res.statusCode = 400
		res.end('invalid progress id')
		return
	}

	res.statusCode = 200
	res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
	res.setHeader('Cache-Control', 'no-cache, no-transform')
	res.setHeader('Connection', 'keep-alive')
	res.setHeader('X-Accel-Buffering', 'no')
	res.flushHeaders()

	res.write('retry: 1000\n\n')
	session.clients.add(res)
	sendEvent(res, 'progress', session.state)
	if (session.state.done) {
		sendEvent(res, 'done', session.state)
	}

	req.on('close', () => {
		session.clients.delete(res)
		if (session.clients.size === 0 && session.state.done) {
			sessions.delete(id)
		}
	})
}

setInterval(() => {
	const cutoff = now() - SESSION_TTL_MS
	for (const [id, session] of sessions.entries()) {
		if (session.clients.size > 0) continue
		if (session.state.updatedAt < cutoff) sessions.delete(id)
	}
}, CLEANUP_INTERVAL_MS).unref()
