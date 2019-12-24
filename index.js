if (!process.env.REDIS_HOST) {
  throw Error('REDIS_HOST is required')
}

if (!process.env.REDIS_PORT) {
  throw Error('REDIS_PORT is required')
}

const asyncRedis = require('async-redis')
const http = require('http')

const redisClient = asyncRedis.createClient({ host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT) })

redisClient.on('connect', function () {
  console.info('Redis client connected')
})

redisClient.on('error', function (err) {
  console.error('Redis error', err)
})

http.createServer(async function (req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  const raw = await redisClient.hgetall('torrents')
  const torrents = Object.values(raw).map(t => JSON.parse(t))
  res.end(JSON.stringify(torrents))
}).listen(3001)
