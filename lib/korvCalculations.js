/**
 * Korv Calculation Utilities
 * 1 korv = 5 minutes
 */

/**
 * Convert minutes to korv
 * @param {number} minutes - Time in minutes
 * @returns {number} - Korv value (rounded to 2 decimals)
 */
export function minutesToKorv(minutes) {
  return Math.round((minutes / 5) * 100) / 100;
}

/**
 * Convert korv to minutes
 * @param {number} korv - Korv value
 * @returns {number} - Time in minutes
 */
export function korvToMinutes(korv) {
  return korv * 5;
}

/**
 * Calculate korv per unit from times
 * @param {number} cncTime - CNC time in minutes
 * @param {number} cylindricalTime - Cylindrical time in minutes
 * @param {number} tcTime - T&C time in minutes
 * @returns {number} - Total korv per unit
 */
export function calculateKorvPerUnit(cncTime = 0, cylindricalTime = 0, tcTime = 0) {
  const totalMinutes = (cncTime || 0) + (cylindricalTime || 0) + (tcTime || 0);
  return minutesToKorv(totalMinutes);
}

/**
 * Calculate total korv for a work order
 * @param {number} korvPerUnit - Korv per unit
 * @param {number} quantity - Quantity of items
 * @returns {number} - Total korv
 */
export function calculateTotalKorv(korvPerUnit, quantity) {
  return Math.round((korvPerUnit || 0) * (quantity || 0) * 100) / 100;
}

/**
 * Calculate korv for partial assignment
 * @param {number} korvPerUnit - Korv per unit from tool master
 * @param {number} assignedQuantity - Quantity assigned to machine
 * @returns {number} - Korv for this assignment
 */
export function calculateAssignmentKorv(korvPerUnit, assignedQuantity) {
  return calculateTotalKorv(korvPerUnit, assignedQuantity);
}

/**
 * Calculate total shift capacity in korv
 * @param {number} shiftHours - Shift duration in hours (typically 8)
 * @returns {number} - Total korv capacity for the shift
 */
export function calculateShiftCapacity(shiftHours = 8) {
  const totalMinutes = shiftHours * 60;
  return minutesToKorv(totalMinutes);
}

/**
 * Get shift-specific capacity for a machine
 * @param {string} machineId - Machine identifier
 * @param {string} shift - Shift name ('first', 'second', 'night')
 * @returns {number} - Korv capacity (0 if machine doesn't work this shift)
 */
export function getMachineShiftCapacity(machineId, shift) {
  const baseCapacity = calculateShiftCapacity(8); // 96 korv (8 hours * 60 min / 5)
  
  // T&C machines only work second shift
  if (machineId.startsWith('T&C') || machineId.includes('TC')) {
    return shift === 'second' ? baseCapacity : 0;
  }
  
  // CYLN machines only work first and second shifts
  if (machineId.startsWith('CYLN') || machineId.includes('CYLN')) {
    return (shift === 'first' || shift === 'second') ? baseCapacity : 0;
  }
  
  // All other machines work all shifts
  return baseCapacity;
}

/**
 * Format korv as time string
 * @param {number} korv - Korv value
 * @returns {string} - Formatted time (e.g., "2h 30m")
 */
export function formatKorvAsTime(korv) {
  const minutes = korvToMinutes(korv);
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Validate if assignment fits in available capacity
 * @param {number} usedKorv - Already used korv in shift
 * @param {number} assignmentKorv - Korv to assign
 * @param {number} maxKorv - Maximum korv capacity
 * @returns {object} - {fits: boolean, remaining: number, overflow: number}
 */
export function validateAssignmentCapacity(usedKorv, assignmentKorv, maxKorv) {
  const newTotal = (usedKorv || 0) + (assignmentKorv || 0);
  const remaining = maxKorv - newTotal;
  const overflow = newTotal > maxKorv ? newTotal - maxKorv : 0;
  
  return {
    fits: newTotal <= maxKorv,
    remaining: Math.max(0, remaining),
    overflow,
    utilizationPercent: Math.round((newTotal / maxKorv) * 100)
  };
}
