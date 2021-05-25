'use strict'

if (!process.env.REDIS_HOST) {
  throw Error('REDIS_HOST is required')
}

if (!process.env.REDIS_PORT) {
  throw Error('REDIS_PORT is required')
}

const asyncRedis = require('async-redis')
const express = require('express')
const logResponseTime = require('./response-time-logger')

const redisClient = asyncRedis.createClient({ host: process.env.REDIS_HOST, port: parseInt(process.env.REDIS_PORT) })

redisClient.on('connect', function () {
  console.info('Redis client connected')
})

redisClient.on('error', function (err) {
  console.error('Redis error', err)
})

const app = express()

app.use(express.json())
app.use(logResponseTime)

app.get('/', async (req, res) => {
  const trackerIgnore = await redisClient.smembers('tracker_ignore')
  res.json(
    Object.values(await redisClient.hgetall('torrents'))
      .map((t) => {
        const torrent = JSON.parse(t)
        torrent.trackers = torrent.trackers.filter((tracker) => !(trackerIgnore.includes(tracker)))
        if (torrent.trackerData) {
          for (const i of trackerIgnore) {
            if (i in torrent.trackerData) {
              delete torrent.trackerData[i]
            }
          }
        }
        return torrent
      })
  )
})

app.get('/hash', async (req, res) => {
  const trackerIgnore = await redisClient.smembers('tracker_ignore')
  const { hash } = req.body
  if (!hash) {
    res.status(400).json('missing hash')
  }
  const torrent = JSON.parse(await redisClient.hget('torrents', hash))

  if (torrent === null || torrent === undefined) {
    res.status(404).json('not found')
  } else {
    torrent.trackers = torrent.trackers.filter((tracker) => !(trackerIgnore.includes(tracker)))

    if (torrent.trackerData) {
      for (const i of trackerIgnore) {
        if (i in torrent.trackerData) {
          delete torrent.trackerData[i]
        }
      }
    }
    res.json(torrent)
  }
})

app.get('/tracker/ignore', async (req, res) => {
  res.json(await redisClient.smembers('tracker_ignore'))
})

app.get('/tracker/errors', async (req, res) => {
  res.json(await redisClient.hgetall('tracker_errors'))
})

app.get('/tracker/events', async (req, res) => {
  res.json(await redisClient.hgetall('tracker_events'))
})

app.get('/queue', async (req, res) => {
  res.json(await redisClient.smembers('queue'))
})


app.listen(3001, () => {
  console.log('listening on port 3001')
})
