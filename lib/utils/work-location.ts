export function extractWorkLocation(employee: any): string {
  if (employee?.notes && typeof employee.notes === 'string') {
    const match = employee.notes.match(/\[WORK_LOCATION:\s*([^\]]+)\]/i)
    if (match && match[1]?.trim()) {
      return match[1].trim()
    }
  }
  if (employee?.work_location && typeof employee.work_location === 'string' && employee.work_location.trim()) {
    return employee.work_location.trim()
  }
  return 'Satara (Office)'
}
