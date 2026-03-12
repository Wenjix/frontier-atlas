import { describe, it, expect } from "vitest"
import { parseStartParam } from "../start-param"

describe("parseStartParam", () => {
  it("returns null for empty string", () => {
    expect(parseStartParam("")).toBeNull()
  })

  it("returns null for unrecognized param", () => {
    expect(parseStartParam("settings")).toBeNull()
    expect(parseStartParam("random_value")).toBeNull()
  })

  it('routes "onboarding" to /tg/onboarding', () => {
    expect(parseStartParam("onboarding")).toBe("/tg/onboarding")
  })

  it('routes "onboarding_floor9" to /tg/onboarding?floor=floor-9', () => {
    expect(parseStartParam("onboarding_floor9")).toBe("/tg/onboarding?floor=floor-9")
  })

  it('routes "onboarding_floorB" to /tg/onboarding?floor=floor-B', () => {
    expect(parseStartParam("onboarding_floorB")).toBe("/tg/onboarding?floor=floor-B")
  })

  it('routes "floor_9" to /tg/floors/floor-9', () => {
    expect(parseStartParam("floor_9")).toBe("/tg/floors/floor-9")
  })

  it('routes "floor_B" to /tg/floors/floor-B', () => {
    expect(parseStartParam("floor_B")).toBe("/tg/floors/floor-B")
  })

  it('routes "floor_9_people" to /tg/floors/floor-9/people', () => {
    expect(parseStartParam("floor_9_people")).toBe("/tg/floors/floor-9/people")
  })

  it('routes "floor_B_people" to /tg/floors/floor-B/people', () => {
    expect(parseStartParam("floor_B_people")).toBe("/tg/floors/floor-B/people")
  })

  it("handles multi-character floor numbers", () => {
    expect(parseStartParam("floor_12")).toBe("/tg/floors/floor-12")
    expect(parseStartParam("floor_12_people")).toBe("/tg/floors/floor-12/people")
    expect(parseStartParam("onboarding_floor12")).toBe("/tg/onboarding?floor=floor-12")
  })
})
