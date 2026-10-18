import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseHHMM,
  validateHHMM,
  formatOfficeHoursAsHHMM,
  normalizeTrackerToHHMM,
  hhmmToDecimalHours,
  decimalHoursToHHMM,
  minutesToCanonicalDecimalHours,
  canonicalOfficeHoursToMinutes,
  formatMinutesAsHHMM,
} from '@/lib/utils/time';

describe('EOD Worked Hours & Time Tracker Integration Test Suite', () => {

  describe('1. Tracker Duration Normalization to H.MM format', () => {
    it('normalizes 1 hour 28 minutes to "1.28"', () => {
      expect(normalizeTrackerToHHMM('1 hour 28 minutes')).toBe('1.28');
      expect(normalizeTrackerToHHMM('1h 28m')).toBe('1.28');
      expect(normalizeTrackerToHHMM(88)).toBe('1.28');
      expect(normalizeTrackerToHHMM({ hours: 1, minutes: 28 })).toBe('1.28');
    });

    it('normalizes 8 hours 24 minutes to "8.24"', () => {
      expect(normalizeTrackerToHHMM('8 hours 24 minutes')).toBe('8.24');
      expect(normalizeTrackerToHHMM('8h 24m')).toBe('8.24');
      expect(normalizeTrackerToHHMM(504)).toBe('8.24');
      expect(normalizeTrackerToHHMM({ hours: 8, minutes: 24 })).toBe('8.24');
    });

    it('normalizes 3 hours 45 minutes to "3.45"', () => {
      expect(normalizeTrackerToHHMM('3 hours 45 minutes')).toBe('3.45');
      expect(normalizeTrackerToHHMM('3h 45m')).toBe('3.45');
      expect(normalizeTrackerToHHMM(225)).toBe('3.45');
      expect(normalizeTrackerToHHMM({ hours: 3, minutes: 45 })).toBe('3.45');
    });

    it('normalizes 8 hours 04 minutes to "8.04"', () => {
      expect(normalizeTrackerToHHMM('8 hours 04 minutes')).toBe('8.04');
      expect(normalizeTrackerToHHMM('8h 04m')).toBe('8.04');
      expect(normalizeTrackerToHHMM(484)).toBe('8.04');
      expect(normalizeTrackerToHHMM({ hours: 8, minutes: 4 })).toBe('8.04');
    });

    it('normalizes 10 hours 45 minutes to "10.45"', () => {
      expect(normalizeTrackerToHHMM('10 hours 45 minutes')).toBe('10.45');
      expect(normalizeTrackerToHHMM('10h 45m')).toBe('10.45');
      expect(normalizeTrackerToHHMM(645)).toBe('10.45');
      expect(normalizeTrackerToHHMM({ hours: 10, minutes: 45 })).toBe('10.45');
    });

    it('normalizes overflow duration (3 hours 65 minutes -> 4 hours 05 minutes -> "4.05")', () => {
      // 3 hours 65 minutes is 245 minutes = 4h 05m
      expect(normalizeTrackerToHHMM('3 hours 65 minutes')).toBe('4.05');
      expect(normalizeTrackerToHHMM('3h 65m')).toBe('4.05');
      expect(normalizeTrackerToHHMM(245)).toBe('4.05');
      expect(normalizeTrackerToHHMM({ hours: 3, minutes: 65 })).toBe('4.05');
      expect(normalizeTrackerToHHMM('3.65')).toBe('4.05');
    });

    it('handles empty, missing, or zero tracker values safely without fabricating hours', () => {
      expect(normalizeTrackerToHHMM(null)).toBeNull();
      expect(normalizeTrackerToHHMM(undefined)).toBeNull();
      expect(normalizeTrackerToHHMM('')).toBeNull();
      expect(normalizeTrackerToHHMM('   ')).toBeNull();
      expect(normalizeTrackerToHHMM(0)).toBeNull();
      expect(normalizeTrackerToHHMM(-10)).toBeNull();
      expect(normalizeTrackerToHHMM({ hours: 0, minutes: 0 })).toBeNull();
    });
  });

  describe('2. Validation of Worked Hours Input (H.MM format)', () => {
    it('accepts valid H.MM input values', () => {
      expect(validateHHMM('1.28')).toBeNull();
      expect(validateHHMM('8.24')).toBeNull();
      expect(validateHHMM('3.45')).toBeNull();
      expect(validateHHMM('8.04')).toBeNull();
      expect(validateHHMM('10.45')).toBeNull();
      expect(validateHHMM('8.00')).toBeNull();
      expect(validateHHMM('8')).toBeNull();
      expect(validateHHMM('24.00')).toBeNull();
    });

    it('rejects invalid inputs where minutes portion exceeds 59 (e.g. 8.75, 8.60)', () => {
      expect(validateHHMM('8.75')).toContain('Minutes must be between 00 and 59');
      expect(validateHHMM('8.60')).toContain('Minutes must be between 00 and 59');
      expect(validateHHMM('3.65')).toContain('Minutes must be between 00 and 59');
      expect(validateHHMM('0.99')).toContain('Minutes must be between 00 and 59');
    });

    it('rejects formatted text strings like "1h 28m"', () => {
      expect(validateHHMM('1h 28m')).toContain('Enter valid hours and minutes in HH.MM format');
      expect(validateHHMM('8h 24m')).toContain('Enter valid hours and minutes in HH.MM format');
      expect(validateHHMM('8 hours')).toContain('Enter valid hours and minutes in HH.MM format');
    });

    it('rejects zero or empty worked hours', () => {
      expect(validateHHMM('')).toBe('Worked hours are required.');
      expect(validateHHMM('   ')).toBe('Worked hours are required.');
      expect(validateHHMM('0')).toBe('Worked time cannot be zero.');
      expect(validateHHMM('0.00')).toBe('Worked time cannot be zero.');
    });

    it('rejects hours exceeding 24', () => {
      expect(validateHHMM('25.00')).toContain('Enter valid hours and minutes in HH.MM format');
      expect(validateHHMM('24.01')).toContain('Enter valid hours and minutes in HH.MM format');
    });
  });

  describe('3. Database Decimal Hours Conversion (H.MM -> decimal hours)', () => {
    it('correctly converts 8.24 (8h 24m) to 8.4 decimal hours (not 8.24)', () => {
      const minutes = parseHHMM('8.24');
      expect(minutes).toBe(504); // 8 * 60 + 24
      const decimalHours = hhmmToDecimalHours('8.24');
      expect(decimalHours).toBe(8.4);
    });

    it('correctly converts 1.28 (1h 28m) to 1.466667 decimal hours', () => {
      const minutes = parseHHMM('1.28');
      expect(minutes).toBe(88); // 1 * 60 + 28
      const decimalHours = hhmmToDecimalHours('1.28');
      expect(decimalHours).toBe(1.466667);
    });

    it('correctly converts 3.45 (3h 45m) to 3.75 decimal hours', () => {
      const minutes = parseHHMM('3.45');
      expect(minutes).toBe(225); // 3 * 60 + 45
      const decimalHours = hhmmToDecimalHours('3.45');
      expect(decimalHours).toBe(3.75);
    });

    it('correctly converts 8.04 (8h 04m) to 8.066667 decimal hours', () => {
      const minutes = parseHHMM('8.04');
      expect(minutes).toBe(484); // 8 * 60 + 4
      const decimalHours = hhmmToDecimalHours('8.04');
      expect(decimalHours).toBe(8.066667);
    });

    it('correctly converts 10.45 (10h 45m) to 10.75 decimal hours', () => {
      const minutes = parseHHMM('10.45');
      expect(minutes).toBe(645); // 10 * 60 + 45
      const decimalHours = hhmmToDecimalHours('10.45');
      expect(decimalHours).toBe(10.75);
    });

    it('returns null for invalid inputs during conversion', () => {
      expect(hhmmToDecimalHours('8.75')).toBeNull();
      expect(hhmmToDecimalHours('1h 28m')).toBeNull();
      expect(hhmmToDecimalHours('')).toBeNull();
    });
  });

  describe('4. Display Conversion: Database Decimal Hours -> H.MM string', () => {
    it('converts 8.4 decimal hours to "8.24" for display', () => {
      expect(formatOfficeHoursAsHHMM(8.4)).toBe('8.24');
      expect(decimalHoursToHHMM(8.4)).toBe('8.24');
    });

    it('converts 1.466667 decimal hours to "1.28" for display', () => {
      expect(formatOfficeHoursAsHHMM(1.466667)).toBe('1.28');
      expect(decimalHoursToHHMM(1.466667)).toBe('1.28');
    });

    it('converts 3.75 decimal hours to "3.45" for display', () => {
      expect(formatOfficeHoursAsHHMM(3.75)).toBe('3.45');
      expect(decimalHoursToHHMM(3.75)).toBe('3.45');
    });

    it('converts 8.066667 decimal hours to "8.04" for display', () => {
      expect(formatOfficeHoursAsHHMM(8.066667)).toBe('8.04');
      expect(decimalHoursToHHMM(8.066667)).toBe('8.04');
    });

    it('converts 10.75 decimal hours to "10.45" for display', () => {
      expect(formatOfficeHoursAsHHMM(10.75)).toBe('10.45');
      expect(decimalHoursToHHMM(10.75)).toBe('10.45');
    });

    it('correctly maps legacy database records', () => {
      expect(formatOfficeHoursAsHHMM(8.05)).toBe('8.05');
      expect(formatOfficeHoursAsHHMM(8.15)).toBe('8.15');
      expect(formatOfficeHoursAsHHMM(8.45)).toBe('8.45');
      expect(formatOfficeHoursAsHHMM(10.47)).toBe('10.47');
      expect(formatOfficeHoursAsHHMM(8.3)).toBe('8.30');
      expect(formatOfficeHoursAsHHMM(11.3)).toBe('11.30');
    });
  });

  describe('5. Auto-population & Manual Modification State Machine', () => {
    function simulateEODFormState() {
      let workedHoursInput = '';
      let isManuallyEdited = false;
      let trackerLoading = false;
      let trackerError: string | null = null;

      return {
        getState: () => ({ workedHoursInput, isManuallyEdited, trackerLoading, trackerError }),
        onUserType: (val: string) => {
          isManuallyEdited = true;
          workedHoursInput = val;
        },
        onTrackerLoadStart: () => {
          trackerLoading = true;
          trackerError = null;
        },
        onTrackerLoadSuccess: (apiResponse: { success: boolean; isEmpty?: boolean; totalActiveMinutes?: number; formattedHHMM?: string }) => {
          trackerLoading = false;
          if (apiResponse.isEmpty || apiResponse.totalActiveMinutes === 0) {
            if (!isManuallyEdited) {
              workedHoursInput = '0.00';
            }
          } else {
            const activeMins = apiResponse.totalActiveMinutes;
            const hhmm = activeMins !== undefined && activeMins > 0
              ? normalizeTrackerToHHMM(activeMins)
              : normalizeTrackerToHHMM(apiResponse.formattedHHMM);

            if (hhmm && !isManuallyEdited) {
              workedHoursInput = hhmm;
            }
          }
        },
        onTrackerLoadFailure: (errorMessage: string) => {
          trackerLoading = false;
          trackerError = errorMessage;
          // Never fabricate hours on failure
        },
        onDateChange: (newDateTrackerData: { success: boolean; isEmpty?: boolean; totalActiveMinutes?: number; formattedHHMM?: string }) => {
          // If not manually edited, updates with the new date's tracker data
          if (!isManuallyEdited) {
            if (newDateTrackerData.isEmpty || newDateTrackerData.totalActiveMinutes === 0) {
              workedHoursInput = '0.00';
            } else {
              workedHoursInput = normalizeTrackerToHHMM(newDateTrackerData.totalActiveMinutes || 0) || '0.00';
            }
          }
        },
        onSubmitSuccess: () => {
          workedHoursInput = '';
          isManuallyEdited = false;
        }
      };
    }

    it('automatically populates Worked Hours with tracker value on load when not manually edited', () => {
      const form = simulateEODFormState();
      form.onTrackerLoadStart();
      expect(form.getState().trackerLoading).toBe(true);

      // Tracker returns 8 hours 24 minutes (504 active minutes)
      form.onTrackerLoadSuccess({
        success: true,
        isEmpty: false,
        totalActiveMinutes: 504,
        formattedHHMM: '8.24'
      });

      expect(form.getState().trackerLoading).toBe(false);
      expect(form.getState().workedHoursInput).toBe('8.24');
      expect(form.getState().isManuallyEdited).toBe(false);
    });

    it('populates 0.00 when tracker has no active sessions', () => {
      const form = simulateEODFormState();
      form.onTrackerLoadSuccess({
        success: true,
        isEmpty: true,
        totalActiveMinutes: 0,
        formattedHHMM: '0.00'
      });

      expect(form.getState().workedHoursInput).toBe('0.00');
    });

    it('does NOT fabricate hours when tracker API fails, and sets tracker error', () => {
      const form = simulateEODFormState();
      form.onTrackerLoadFailure('Network connection failed');

      expect(form.getState().workedHoursInput).toBe('');
      expect(form.getState().trackerError).toBe('Network connection failed');
    });

    it('preserves employee manual edit and prevents subsequent tracker fetches from overwriting', () => {
      const form = simulateEODFormState();
      // Employee manually types 8.30
      form.onUserType('8.30');
      expect(form.getState().isManuallyEdited).toBe(true);
      expect(form.getState().workedHoursInput).toBe('8.30');

      // Delayed tracker response arrives with 8.24
      form.onTrackerLoadSuccess({
        success: true,
        isEmpty: false,
        totalActiveMinutes: 504,
        formattedHHMM: '8.24'
      });

      // Must NOT overwrite manual entry
      expect(form.getState().workedHoursInput).toBe('8.30');
    });

    it('updates tracker hours on date change only if not manually edited', () => {
      const form = simulateEODFormState();

      // Day 1: auto-populates 8.24
      form.onTrackerLoadSuccess({
        success: true,
        isEmpty: false,
        totalActiveMinutes: 504,
        formattedHHMM: '8.24'
      });
      expect(form.getState().workedHoursInput).toBe('8.24');

      // Date changes to Day 2 (which had 1 hour 28 minutes = 88 mins)
      form.onDateChange({
        success: true,
        isEmpty: false,
        totalActiveMinutes: 88,
        formattedHHMM: '1.28'
      });
      expect(form.getState().workedHoursInput).toBe('1.28');

      // Now employee manually changes it to 4.00
      form.onUserType('4.00');

      // Date changes to Day 3 (which had 3 hours 45 minutes = 225 mins)
      form.onDateChange({
        success: true,
        isEmpty: false,
        totalActiveMinutes: 225,
        formattedHHMM: '3.45'
      });

      // Since employee manually modified the field, Day 3 must NOT overwrite the manual edit
      expect(form.getState().workedHoursInput).toBe('4.00');
    });

    it('resets manual edit state upon successful form submission', () => {
      const form = simulateEODFormState();
      form.onUserType('8.00');
      expect(form.getState().isManuallyEdited).toBe(true);

      form.onSubmitSuccess();
      expect(form.getState().isManuallyEdited).toBe(false);
      expect(form.getState().workedHoursInput).toBe('');
    });
  });
});
