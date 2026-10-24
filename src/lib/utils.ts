import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const mergeClasses = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-weight": [{ font: ["display", "heading", "section", "data", "data-secondary", "count", "action", "action-strong", "navigation", "subnavigation", "label", "status", "avatar", "body", "meta"] }],
      "font-size": [
        { text: ["label", "caption", "body", "card-title", "title"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs))
}
