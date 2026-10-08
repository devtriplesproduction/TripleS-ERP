export function calculateMonthlyBasicSalary(annualCTC: number): number {
  if (!annualCTC || isNaN(annualCTC)) return 0;
  return Math.round((annualCTC / 12) * 100) / 100;
}
