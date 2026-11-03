// Test setup: in-memory MongoDB, fake fetch, clean db before each test.
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import { installFetchStub } from '../mocks/network.js'
import { resetMockState, mockState } from '../mocks/state.js'

let mongod

// only the in-memory db is allowed
const realConnect = mongoose.connect.bind(mongoose)
mongoose.connect = (uri, ...rest) => {
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(String(uri))) {
    throw new Error(`Tests may only connect to the in-memory MongoDB, not ${uri}`)
  }
  return realConnect(uri, ...rest)
}

installFetchStub()

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri('merosadak_test'))
  // build unique indexes first
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()))
})

beforeEach(async () => {
  resetMockState()
  const collections = await mongoose.connection.db.collections()
  await Promise.all(collections.map((c) => c.deleteMany({})))
})

afterEach(() => {
  // calling a real outside server fails the test
  expect(mockState.blockedCalls).toEqual([])
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongod) await mongod.stop()
})
