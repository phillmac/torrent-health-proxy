'use strict'

if (!process.env.REDIS_HOST) {
  throw Error('REDIS_HOST is required')
}

if (!process.env.REDIS_PORT) {
  throw Error('REDIS_PORT is required')
}

const asyncRedis = require('async-redis')
const express = require('express')

const redisClient = asyncRedis.createClient({ host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT) })

redisClient.on('connect', function () {
  console.info('Redis client connected')
})

redisClient.on('error', function (err) {
  console.error('Redis error', err)
})

const app = express()

app.get('/', async (req, res) => {
  const trackerIgnore = await redisClient.smembers('tracker_ignore')
  res.writeHead(200, { 'Content-Type': 'application/json' })
  const raw = await redisClient.hgetall('torrents')
  const torrents = Object.values(raw).map((t) => {
    const torrent = JSON.parse(t)
    torrent.trackers = torrent.trackers.filter((tracker) => !(trackerIgnore.includes(tracker)))

    for (const i of trackerIgnore) {
      if (i in torrent.trackerData) {
        delete torrent.trackerData[i]
      }
    }
    return torrent
  })
  res.json(torrents)
})

app.listen(3001, () => {
  console.log('listening on port 3001')
})