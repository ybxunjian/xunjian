export function getHistoryMenuPaths({ open, manageHistory, showBack }: {
  open: boolean;
  manageHistory: boolean;
  showBack: boolean;
}): [string, string, string] {
  // Corresponding endpoints run left-to-right in every target shape.
  return [
    showBack ? "M 4 14 L 14 24" : manageHistory ? "M 3 14 L 11 21" : open ? "M 4 4 L 24 24" : "M 2 4 L 26 4",
    showBack ? "M 4 14 L 14 4" : manageHistory ? "M 11 21 L 25 5" : open ? "M 4 24 L 24 4" : "M 2 24 L 26 24",
    showBack ? "M 4 14 L 26 14" : "M 2 14 L 26 14",
  ];
}
