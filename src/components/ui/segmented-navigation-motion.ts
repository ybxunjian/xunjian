/** Shared spring for segmented selection backgrounds. */
export const SEGMENT_SELECTION_TRANSITION = {
  type: "spring",
  stiffness: 360,
  damping: 36,
  mass: 1,
} as const;

/** Only visual drag feedback has a distance threshold; position tracking starts on press. */
export const SEGMENT_DRAG_FEEDBACK = {
  distance: 4,
  holdDelay: 80,
  scale: 1.15,
} as const;
