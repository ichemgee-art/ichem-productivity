import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSubmissionPreview, round2 } from '../src/lib/calculations.js'

test('round2 matches financial two-decimal rounding', () => {
  assert.equal(round2(10.005), 10.01)
  assert.equal(round2(31.85 * 35), 1114.75)
})

test('technicians and assistants split the operation and reconcile exactly', () => {
  const result = calculateSubmissionPreview({
    meters: 31.85,
    pricePerMeter: 35,
    technicianCount: 1,
    assistantCount: 1,
    workerCount: 0,
    techShare: 0.7,
  })

  assert.equal(result.total, 1114.75)
  assert.equal(result.techTotal, 780.33)
  assert.equal(result.assistantTotal, 334.42)
  assert.equal(round2(result.techTotal + result.assistantTotal), result.total)
})

test('technicians receive the full operation when there are no assistants', () => {
  const result = calculateSubmissionPreview({
    meters: 18,
    pricePerMeter: 30,
    technicianCount: 2,
    assistantCount: 0,
  })

  assert.equal(result.total, 540)
  assert.equal(result.techTotal, 540)
  assert.equal(result.techPerPerson, 270)
  assert.equal(result.assistantTotal, 0)
})

test('assistants receive the full operation when there are no technicians', () => {
  const result = calculateSubmissionPreview({
    meters: 26.96,
    pricePerMeter: 35,
    technicianCount: 0,
    assistantCount: 2,
  })

  assert.equal(result.total, 943.6)
  assert.equal(result.assistantTotal, 943.6)
  assert.equal(result.assistantPerPerson, 471.8)
  assert.equal(result.techTotal, 0)
})

test('worker earnings are separate from technician/assistant distribution', () => {
  const result = calculateSubmissionPreview({
    meters: 26.96,
    pricePerMeter: 35,
    technicianCount: 0,
    assistantCount: 2,
    workerCount: 3,
    workerRatePerMeter: 10,
  })

  assert.equal(result.workerTotal, 269.6)
  assert.equal(result.workerPerPerson, 89.87)
  assert.equal(result.total, 943.6)
})

test('no team produces zero group shares without changing operation total', () => {
  const result = calculateSubmissionPreview({
    meters: 12.5,
    pricePerMeter: 40,
  })

  assert.equal(result.total, 500)
  assert.equal(result.techTotal, 0)
  assert.equal(result.assistantTotal, 0)
  assert.equal(result.workerTotal, 0)
})

test('invalid negative preview inputs are normalized safely', () => {
  const result = calculateSubmissionPreview({
    meters: -5,
    pricePerMeter: -20,
    technicianCount: -1,
    assistantCount: 0,
    workerCount: 0,
  })

  assert.equal(result.meters, 0)
  assert.equal(result.price, 0)
  assert.equal(result.total, 0)
})
