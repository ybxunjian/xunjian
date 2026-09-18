# Password visibility acceptance

The control renders one stable native input and switches that same node between
`type="password"` and `type="text"`. Pointer presses on the visibility button
cancel the browser's default focus transfer before click, so an already-focused
input is not blurred. The click toggles visibility once. Keyboard activation
uses the button's native Enter/Space behavior.

The visibility path must not call `focus()`, `blur()`, selection APIs, timers or
animation-frame callbacks. The input and its ancestors must not receive a React
`key` that changes for visibility, validation or shake animation. No password
values should be included in diagnostics, screenshots or logs; use dummy values
only.

## Required device acceptance (not yet executed)

Test on actual iPhone Safari and installed PWA, recording iOS version and keyboard.
Cover login, registration, reset and change-password forms.

- Keyboard open: toggle both ways repeatedly; keyboard stays open, without flicker.
- Keyboard closed: toggle both ways; keyboard stays closed.
- Another field focused: toggle; that field keeps focus and keyboard state.
- Caret at beginning/middle/end and backward/forward selection: logical selection
  remains unchanged. Check long passwords with internal horizontal scrolling.
- Verify document and visual viewport offsets, field geometry, and input scrollLeft.
- Count blur/focus/input/change/submit/invalid events: toggling must not add any.
- Existing errors must stay unchanged and must not replay the shake animation.
- Drag away/cancel a press: no toggle. Fast taps: one toggle per click.
- External keyboard: Tab, Space and Enter work with visible keyboard focus.
- VoiceOver and password-manager autofill/save: check confidentiality and usability.
- Tab to the toggle: its focus indicator is visible and Enter/Space each toggle once.

Node tests cover server markup and architecture guards only, not iOS keyboard behavior.
