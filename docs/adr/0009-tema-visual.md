# 0009. Visual theme

- Status: accepted
- Date: 2026-11-18
- Ticket: none (style pass on top of the finished frontend)

## Context

The frontend used Ant Design's defaults untouched. The pass applies Apple's interface guidelines (WWDC design talks) where they fit an app of forms, tables and menus. Most of that guidance is about gestures (drag, springs, momentum), which this app does not have, so only the global theme changes. Colors stay Ant Design's.

## Decisions

1. **One theme module, `src/tema.tsx`, mounted by `main.tsx` and by the tests' `renderApp`.** The tests render the app with the same configuration the browser gets. What tokens cannot express (media queries, `backdrop-filter`) lives in `src/tema.css`, loaded only by `main.tsx`.
2. **The system font (`system-ui` first).** Each platform's font already comes tuned for its screens. Headings tighten their letter spacing as they grow (`-0.02em` on h1 and h2); body text keeps the default.
3. **Animations settle without overshoot.** Every Ant Design curve, the bouncing ones included, uses one smooth ease-out (`cubic-bezier(0.32, 0.72, 0, 1)`). A bounce only makes sense after a gesture that carried momentum, such as a flick, and here there are only clicks.
   - Rejected: keeping Ant Design's `easeOutBack`. A dropdown that bounces after a click distracts and does not answer to anything the user did.
4. **Reduced motion turns Ant Design's animations off** (`token.motion: false`). The setting is read live with `useSyncExternalStore` over `matchMedia`, so changing it applies without a reload.
5. **The header is translucent and sticky.** The content scrolls under it, blurred, instead of the header taking an opaque strip. With reduced transparency or increased contrast it turns solid, plus a border for contrast.
6. **Buttons shrink slightly while pressed (`scale(0.97)`).** The feedback comes on the press, not on release. It is disabled with reduced motion.

## Consequences

- No test checks how the app looks (ADR 0008 keeps Ant Design's styles out of the test document); `tema.test.tsx` checks the theme's values and that the motion setting is followed.
- The build minifier (Lightning CSS) treats a prefixed and an unprefixed `backdrop-filter` as duplicates and keeps the last one. `tema.css` writes only the standard property and lets the minifier add the prefix.
