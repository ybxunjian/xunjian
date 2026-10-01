const CALENDAR_FLING_SPEED = 0.65; // pages per second
export const CALENDAR_SPRING_STIFFNESS = 420;
export const CALENDAR_SPRING_DAMPING = 2 * Math.sqrt(CALENDAR_SPRING_STIFFNESS);

export function calendarMonthDistance(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

export function clampCalendarDrag(position: number, base: number, minimum: number) {
  return Math.max(minimum, Math.max(base - 1, Math.min(base + 1, position)));
}

export function getCalendarTarget(
  position: number, start: number, base: number, velocity: number, minimum: number,
) {
  let target = Math.round(position);
  if (Math.abs(velocity) >= CALENDAR_FLING_SPEED) {
    const direction = Math.sign(velocity);
    const displacement = position - start;
    // A new flick near the old target advances from the page it has caught.
    // Reversing within the same gesture returns toward the crossed boundary.
    target = Math.sign(displacement) === direction
      ? base + direction
      : direction > 0 ? Math.ceil(position) : Math.floor(position);
  }
  return clampCalendarDrag(target, base, minimum) || 0;
}

export function getCalendarSpringVelocity(position: number, target: number, velocity: number) {
  const distance = target - position;
  if (Math.sign(velocity) !== Math.sign(distance)) return 0;
  // Critical damping alone can overshoot with excessive initial velocity.
  return Math.sign(distance) * Math.min(
    Math.abs(velocity), Math.sqrt(CALENDAR_SPRING_STIFFNESS) * Math.abs(distance),
  );
}
