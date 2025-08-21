export const CATEGORIES = [
  "AI safety & ethics",
  "AI policy & governance",
  "Creativity & arts",
  "Science & technology",
  "Economics & business",
  "Society & culture",
  "Environment & sustainability",
  "Miscellaneous"
] as const;
export type Category = typeof CATEGORIES[number];
