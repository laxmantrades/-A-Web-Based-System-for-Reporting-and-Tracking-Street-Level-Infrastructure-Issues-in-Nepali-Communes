// Checks the test setup itself: app starts, db is in-memory, fakes are in place.
import mongoose from 'mongoose'
import request from 'supertest'

import { makeApp, mockState, createReport } from './helpers.js'
import { fakeFetch } from './mocks/network.js'

describe('test infrastructure', () => {
  test('health check responds', async () => {
    const res = await request(makeApp()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', service: 'merosadak-api' })
  })

  test('database is the in-memory server, not Atlas', () => {
    expect(mongoose.connection.host).toBe('127.0.0.1')
    expect(mongoose.connection.name).toBe('merosadak_test')
    expect(process.env.MONGODB_URI).toBeUndefined()
  })

  test('connecting to any other database is refused', () => {
    expect(() => mongoose.connect('mongodb+srv://someone@cluster0.example.mongodb.net/x')).toThrow(
      /in-memory MongoDB/,
    )
  })

  test('outbound calls to real hosts are blocked', async () => {
    await expect(fakeFetch('https://example.com/')).rejects.toThrow(/Blocked outbound/)
    expect(mockState.blockedCalls).toEqual(['https://example.com/'])
    mockState.blockedCalls.length = 0 // expected, keeps afterEach check passing
  })

  test('photos live in the fake Cloudinary store and can be fetched back', async () => {
    const report = await createReport()
    const res = await fetch(report.photoUrl)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).length).toBeGreaterThan(0)
  })
})
