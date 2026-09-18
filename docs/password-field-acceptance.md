# Password visibility acceptance

The control uses one input. During hydration only, supported browsers switch
from a disabled native password input to a CSS-masked text input. Visibility
changes never change its type, value, key, focus, or selection programmatically.
Unsupported browsers retain a native password input and disabled reveal button.

This is a deliberate compatibility tradeoff: CSS masking is NOT equivalent to
native password semantics. Autocomplete tokens remain, but password-manager
recognition, secure keyboard behavior and screen-reader confidentiality are not
guaranteed. Do not claim parity without testing. No password values should be
included in diagnostics, screenshots or logs; use dummy values only.

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
- Disable CSS masking support: password remains hidden and reveal stays disabled.

Node tests cover SSR safety and architecture guards only, not iOS keyboard behavior.
