import { getRequiredEnv } from "@/lib/env"

describe("getRequiredEnv", () => {
  const ORIG = process.env

  beforeEach(() => {
    // Shallow-clone so we can mutate without affecting other tests
    process.env = { ...ORIG }
  })

  afterEach(() => {
    process.env = ORIG
  })

  it("returns the value when the variable is set", () => {
    process.env.TEST_VAR = "hello"
    expect(getRequiredEnv("TEST_VAR")).toBe("hello")
  })

  it("throws when the variable is not defined", () => {
    delete process.env.MISSING_VAR
    expect(() => getRequiredEnv("MISSING_VAR")).toThrow(
      "Missing required environment variable: MISSING_VAR"
    )
  })

  it("throws when the variable is an empty string", () => {
    process.env.EMPTY_VAR = ""
    expect(() => getRequiredEnv("EMPTY_VAR")).toThrow(
      "Missing required environment variable: EMPTY_VAR"
    )
  })

  it("returns different values for different keys", () => {
    process.env.KEY_A = "value_a"
    process.env.KEY_B = "value_b"
    expect(getRequiredEnv("KEY_A")).toBe("value_a")
    expect(getRequiredEnv("KEY_B")).toBe("value_b")
  })

  it("error message includes the missing key name", () => {
    delete process.env.JWT_SECRET
    expect(() => getRequiredEnv("JWT_SECRET")).toThrow("JWT_SECRET")
  })
})
