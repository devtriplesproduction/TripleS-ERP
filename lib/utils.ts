export { cn } from "cn"

export * from "./utils/date"

export function countTasks(text: string): number {
  if (!text) return 0;
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .length;
}
