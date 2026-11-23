import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our type-scale utilities so `text-body` isn't mistaken
// for a text color and merged away against `text-text-primary`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "showcase",
            "spotlight",
            "title-1",
            "title-2",
            "title-3",
            "headline",
            "body",
            "body-bold",
            "subtle",
            "subtle-bold",
            "caption",
            "caption-bold",
            "feature",
            "feature-bold",
            "label",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
