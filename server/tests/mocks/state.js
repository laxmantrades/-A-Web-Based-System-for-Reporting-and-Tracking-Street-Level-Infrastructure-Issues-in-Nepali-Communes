// Shared state for the fakes, on globalThis so fakes and tests see the same objects.
const KEY = '__merosadakTestMocks'

if (!globalThis[KEY]) {
  globalThis[KEY] = {
    // nodemailer
    sentMail: [],
    // cloudinary: publicId -> { buffer, folder, url }
    images: new Map(),
    uploadCount: 0,
    destroyed: [],
    // fetch stub
    classifier: { mode: 'score', score: 0.9, spam: null, calls: [] },
    nominatimCalls: [],
    blockedCalls: [],
  }
}

export const mockState = globalThis[KEY]

// reset all fakes between tests
export function resetMockState() {
  mockState.sentMail.length = 0
  mockState.images.clear()
  mockState.uploadCount = 0
  mockState.destroyed.length = 0
  mockState.classifier.mode = 'score'
  mockState.classifier.score = 0.9
  mockState.classifier.spam = null
  mockState.classifier.calls.length = 0
  mockState.nominatimCalls.length = 0
  mockState.blockedCalls.length = 0
}
