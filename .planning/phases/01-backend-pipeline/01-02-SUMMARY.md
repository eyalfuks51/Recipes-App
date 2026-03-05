---
phase: 01-backend-pipeline
plan: 02
subsystem: api
tags: [apify, instagram-scraper, moonshot, openai, fetch, es-modules, hebrew]

# Dependency graph
requires:
  - phase: 01-01
    provides: ES module project with openai package installed, process.env wiring via dotenv
provides:
  - scrapeInstagramCaption function at server/src/services/apify.js
  - extractRecipeFromCaption function at server/src/services/moonshot.js
  - URL normalization regex for Instagram www. prefix
  - Hebrew system prompt for structured recipe JSON extraction
  - Regex fallback for markdown-wrapped JSON parsing
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fetch POST to Apify run-sync-get-dataset-items endpoint with JSON body"
    - "OpenAI client with custom baseURL for Moonshot AI (https://api.moonshot.cn/v1)"
    - "Regex /^(https?:\\/\\/)((?!www\\.))/ to normalize URLs without double-adding www."
    - "Regex /\\{[\\s\\S]*\\}/ to extract JSON from markdown-wrapped AI responses"
    - "global.__mockOpenAICreate hook for testability without DI framework"

key-files:
  created:
    - server/src/services/apify.js
    - server/src/services/moonshot.js
    - server/src/__tests__/apify.test.js
    - server/src/__tests__/moonshot.test.js
  modified: []

key-decisions:
  - "global.__mockOpenAICreate test hook added to moonshot.js — enables ES module testing without jest/vitest mock infrastructure"
  - "createClient() exported from moonshot.js — separates client construction from business logic"

patterns-established:
  - "Service files in server/src/services/ — one file per external integration, one exported async function each"
  - "TDD with Node.js built-in test runner (node --test) — no test framework dependency"

requirements-completed: [BACK-02, BACK-03, BACK-04, BACK-05, BACK-06]

# Metrics
duration: 15min
completed: 2026-03-05
---

# Phase 1 Plan 02: External Service Integrations Summary

**Apify Instagram scraper (www.-normalizing URL + caption extraction) and Moonshot AI recipe extractor (Hebrew prompt, markdown-JSON regex) as pure ES module service functions with 9 TDD tests**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-05T19:45:00Z
- **Completed:** 2026-03-05T20:00:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- scrapeInstagramCaption normalizes Instagram URLs to www. prefix and extracts captions via Apify instagram-scraper actor with proper error handling
- extractRecipeFromCaption calls Moonshot AI (moonshot-v1-8k) with embedded Hebrew system prompt and handles both plain and markdown-wrapped JSON responses
- 9 unit tests covering URL normalization, caption extraction, error paths, markdown JSON parsing, and missing-field validation

## Task Commits

Each task was committed atomically using TDD (RED -> GREEN):

1. **Task 1 RED: Failing tests for scrapeInstagramCaption** - `0b2e0bb` (test)
2. **Task 1 GREEN: Implement scrapeInstagramCaption** - `268a971` (feat)
3. **Task 2 RED: Failing tests for extractRecipeFromCaption** - `fed0936` (test)
4. **Task 2 GREEN: Implement extractRecipeFromCaption** - `39754d2` (feat)

_Note: TDD tasks have RED (test) and GREEN (feat) commits per task_

## Files Created/Modified

- `server/src/services/apify.js` - scrapeInstagramCaption: normalizes URL, POSTs to Apify, returns caption string or throws
- `server/src/services/moonshot.js` - extractRecipeFromCaption: Hebrew prompt, Moonshot AI call, regex JSON extraction, field validation
- `server/src/__tests__/apify.test.js` - 5 tests: URL normalization x2, caption return, empty items throw, null caption throw, HTTP error throw
- `server/src/__tests__/moonshot.test.js` - 4 tests: plain JSON, markdown-wrapped JSON, no JSON, missing required fields

## Decisions Made

- Added `global.__mockOpenAICreate` hook in moonshot.js — ES modules cache on import, making it impossible to mock the openai package with built-in test runner. The global hook allows tests to inject a mock `completions.create` function without requiring jest/vitest. Production code uses the real client when the global is absent.
- Exported `createClient()` from moonshot.js to separate client construction from business logic, enabling future composition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added testability hook to moonshot.js**
- **Found during:** Task 2 (Moonshot AI service implementation)
- **Issue:** The plan's implementation as written uses a direct `new OpenAI()` call inside the function. ES module caching makes this impossible to test without a mock framework. Without a hook, tests would require real Moonshot API credentials to run.
- **Fix:** Added `global.__mockOpenAICreate` check before creating the real client. When set (tests only), uses the mock. When unset (production), creates the real OpenAI client. Also split client creation into `createClient()`.
- **Files modified:** server/src/services/moonshot.js
- **Verification:** All 4 moonshot tests pass with mocked completions; production path unchanged when global is absent
- **Committed in:** 39754d2 (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical - testability)
**Impact on plan:** Core function signature and behavior unchanged. Added minimal test hook that has zero production footprint when global is not set.

## Issues Encountered

None.

## User Setup Required

None at this stage. Plans 03 and 04 will require actual environment variables (APIFY_TOKEN, MOONSHOT_API_KEY) to test the integration end-to-end. These were documented in server/.env.example in Plan 01.

## Next Phase Readiness

- Both service functions are ready for use by Plan 03 (route handler wiring)
- Plan 04 (Supabase storage) can proceed independently of these services
- 9 unit tests provide regression safety for future changes
- No additional dependencies needed — openai package was installed in Plan 01

---
*Phase: 01-backend-pipeline*
*Completed: 2026-03-05*
