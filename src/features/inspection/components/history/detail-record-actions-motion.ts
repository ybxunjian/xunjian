// Matching calc templates let Motion interpolate every frame, including interruptions.
export const DETAIL_ACTION_WIDTHS = {
  closed: { left: "calc(100% + -56px)", right: "calc(0% + 48px)" },
  open: { left: "calc(50% + -4px)", right: "calc(50% + -4px)" },
};
// Text timing stays independent of the geometry easing in both directions.
export const DETAIL_ACTION_TEXT_TRANSITIONS = {
  outgoing: { duration: 0.07, ease: "easeInOut" as const },
  cancel: { delay: 0.08, duration: 0.2, ease: "linear" as const },
  return: { delay: 0.08, duration: 0.14, ease: "linear" as const },
};

export const DETAIL_DELETE_COLOR_END = 0.6;
