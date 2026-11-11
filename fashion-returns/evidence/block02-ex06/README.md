# Block 02 Exercise 06 — Simulated peer usability review

Reviewer: assistant walkthrough, explicitly simulated. No human peer, interview, think-aloud quotation or completion timing is claimed. The assistant is familiar with the app; this is a task-based walkthrough, not evidence from a naive human user. The task itself supplied no control-by-control interface instructions.

Task: For April–September2026, decide whether WrapDress sizeXS deserves investigation compared with the other sizes of the same product. Report both rates and the percentage-point gap. Then return to the Dresses overview while keeping April–September2026.

## Observed difficulty before changes

1. At1512×1100, the comparison control began at y1138.35, below the initial viewport. The simulated reviewer had to locate the selector farther down the page.
2. Trying the generic Reset control restored October2025–September2026 and All categories. This did not satisfy the task's requirement to retain April–September2026 and Dresses. Manual clearing of the separate product/size fields was possible, but there was no explicit action with that scope.

## Two small improvements

1. A visible action near the filters, Compare XS with other sizes, opens the existing comparison and focuses its control. The helper explains that a product and size must be selected. This makes the relevant next step easier to discover without changing the calculation.
2. Clear product & size removes those two selections while retaining the period/category. Its helper states what is preserved. The original broad action is now labeled Reset all filters. This separates the two reset intentions and reduces accidental loss of context.

## Same-task retest — actually performed in Vercel

Started from the normal overview; set April–September2026, Dresses, WrapDress andXS. The new shortcut was initially visible at y406.94. Activated it with Enter: selected6/21=28.57%, other sizes35/172=20.35%, gap+8.22pp. This matched the pre-change comparison exactly. Focus landed at comparison-mode. The task answer flagsXS for investigation, with only21 sold units and no causal claim.

Activated Clear product & size with Enter. The resulting filters were start2026-04, end2026-09, categoryDresses, productblank, sizeblank. The screen showed833 sales lines and963 sold units, agreeing with a preserved-source count. Focus moved to page-title. Thus the requested return context was preserved.

Also tested the separately labeled Reset all filters: it still restored the full default cohort. At a measured390px viewport the new buttons stacked without page-level horizontal overflow.133 existing comparison/source cases passed again; no data or KPI formula changed.

No human hesitation duration, satisfaction score or measured speed improvement is inferred. Observations support these specific discoverability/scope fixes; a future human review could test whether they help first-time users.

## Evidence and reproduction

App: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html
Implementation commit:4cfecd1e04bb8eae753f59dae03b67f68a481031

Repeat the task above from the normal overview. Select the specified period/category/product/size, use the visible comparison action, note the values, then clear product/size and verify the period/category remain.

The local exercise package contains actual deployed before/after PNGs and browser observations:
01-before-overview.png;02-after-overview.png;03-comparison-retest.png;04-period-preserved-retest.png.
Raw checks:before-observations.json;after-observations.json;retest-results.json;additional-checks.json. All data remains the approved synthetic foundation v1.1 in Supabase. The final diagnostic/detail journey remains for later course blocks.

## Recorded retest

```json
{
  "review_type": "Simulated assistant walkthrough; no human reviewer, timing, think-aloud quote or statistical usability claim",
  "task": "Reviewer: assistant walkthrough, explicitly simulated; no human peer or uncoached-user timing is claimed.\nTask: For April\u2013September 2026, decide whether Wrap Dress size XS deserves investigation compared with the other sizes of the same product. Report both return rates and their percentage-point difference. Then return to the Dresses overview while keeping April\u2013September 2026.\nSuccess criteria: correct same-product peer comparison with counts; category Dresses and Apr\u2013Sep period retained when clearing product/size.\n",
  "before": {
    "comparisonControlBelowInitialViewport": true,
    "comparisonControlTop": 1138.3515625,
    "viewportHeight": 1100,
    "resetAttemptLostRequestedPeriodAndCategory": true,
    "manualClearingWasPossible": "Separate product/size controls could already be cleared manually; the problem was action discoverability and reset scope, not an impossible task."
  },
  "improvements": [
    "Visible selected-size comparison shortcut near the filters",
    "Clear product & size retains period/category; full reset labeled Reset all filters"
  ],
  "retest": {
    "shortcutVisibleInInitialViewport": true,
    "shortcutTop": 406.9375,
    "sameComparisonResultBeforeAndAfter": true,
    "selected_rate": "6 / 21 = 28.57%",
    "reference_rate": "35 / 172 = 20.35%",
    "gap_pp": 8.22,
    "retainedPeriod": [
      "2026-04",
      "2026-09"
    ],
    "retainedCategory": "Dresses",
    "cleared": [
      "product",
      "size"
    ],
    "categorySalesLines": 833,
    "categorySoldUnits": 963,
    "keyboardActions": "Enter activated both shortcuts; focus moved to comparison-mode and then page-title"
  },
  "passed": true
}
```
