import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const mergeClasses = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["label", "caption", "body", "card-title", "title"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs))
}
