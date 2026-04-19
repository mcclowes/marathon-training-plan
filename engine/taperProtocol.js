/**
 * taperProtocol.js — Final 17-day taper schedule
 * Mirrors VBA: Set_Taper_Block
 * Overrides normal scheduling during taper window
 */

export function isTaperDay(dayIndex, maxDayCount) {
  // Taper starts at maxDayCount - 17 (18 days from end including race day)
  return dayIndex >= (maxDayCount - 17);
}

export function getTaperSession(dayIndex, maxDayCount, prevFocusArea) {
  // If previous session was Long Run, force rest
  if (prevFocusArea === 'Long Run') {
    return {
      focusArea: 'Rest',
      sessionSummary: 'Rest',
      sessionDescription: 'Rest',
      totalDistance: 0,
      warmUp: 0,
      warmDown: 0,
      recoveries: '',
      isTaper: true
    };
  }
  
  const offset = maxDayCount - dayIndex; // days from race day (0 = race day)
  
  // Rest days in taper
  const restOffsets = [16, 13, 11, 9, 6, 4, 2];
  if (restOffsets.includes(offset)) {
    return {
      focusArea: 'Rest',
      sessionSummary: 'Rest',
      sessionDescription: 'Rest',
      totalDistance: 0, warmUp: 0, warmDown: 0, recoveries: '',
      isTaper: true
    };
  }
  
  switch (offset) {
    case 17: // First taper day - may continue from previous block
      return null; // Let normal scheduling handle
      
    case 15:
      return {
        focusArea: 'Base', sessionSummary: 'Easy Running',
        sessionDescription: 'Warm Up with drills then 5km easy running, easy warm down',
        totalDistance: 10, warmUp: 2.5, warmDown: 2.5, recoveries: 'N/A',
        isTaper: true
      };
      
    case 14:
      return {
        focusArea: 'Long Run', sessionSummary: 'Steady running, practice finishing strong',
        sessionDescription: 'Warm Up with drills then 24km easy running, easy warm down',
        totalDistance: 30, warmUp: 3, warmDown: 3, recoveries: 'N/A',
        isTaper: true
      };
      
    case 12:
      return {
        focusArea: 'Speed', sessionSummary: 'Taper Speed Session',
        sessionDescription: 'SE session - sharp intensity, reduced volume',
        totalDistance: 10, warmUp: 2.5, warmDown: 2.5,
        intensityMileage: 10000, sessionType: 'SE',
        useFinalSelection: true,
        isTaper: true
      };
      
    case 10:
      return {
        focusArea: 'Speed', sessionSummary: 'Taper Tempo Session',
        sessionDescription: 'Tempo session - maintain sharpness',
        totalDistance: 10, warmUp: 2.5, warmDown: 2.5,
        intensityMileage: 10000, sessionType: 'Tempo',
        useFinalSelection: true,
        isTaper: true
      };
      
    case 8:
      return {
        focusArea: 'Base', sessionSummary: 'Easy Running',
        sessionDescription: 'Warm Up with drills then 5km easy running, easy warm down',
        totalDistance: 10, warmUp: 2.5, warmDown: 2.5, recoveries: 'N/A',
        isTaper: true
      };
      
    case 7:
      return {
        focusArea: 'Long Run', sessionSummary: 'Steady running, practice finishing strong',
        sessionDescription: 'Warm Up with drills then 15km steady running, easy warm down',
        totalDistance: 21, warmUp: 3, warmDown: 3, recoveries: 'N/A',
        isTaper: true
      };
      
    case 5:
      return {
        focusArea: 'Speed', sessionSummary: 'Taper Tempo',
        sessionDescription: 'Short sharp tempo to keep legs ticking',
        totalDistance: 6, warmUp: 2.5, warmDown: 2.5,
        intensityMileage: 6000, sessionType: 'Tempo',
        useFinalSelection: true,
        isTaper: true
      };
      
    case 3:
      return {
        focusArea: 'Speed', sessionSummary: 'Taper Speed',
        sessionDescription: 'Short speed work - stay sharp',
        totalDistance: 4, warmUp: 2.5, warmDown: 2.5,
        intensityMileage: 4000, sessionType: 'Speed',
        useFinalSelection: true,
        isTaper: true
      };
      
    case 1:
      return {
        focusArea: 'Pre-Race Shakeout', sessionSummary: '5km super easy jogging plus strides',
        sessionDescription: 'Shake the legs out, some small relaxed strides and get excited for the race',
        totalDistance: 5, warmUp: 0, warmDown: 0, recoveries: '',
        isTaper: true
      };
      
    case 0:
      return {
        focusArea: 'Race Day', sessionSummary: 'Fly or Die Trying',
        sessionDescription: 'Start relaxed, stay strong, come through the half slightly back from your target and then start cranking up the pace before sending it all out for the final 10k, empty the tank and enjoy',
        totalDistance: 42.2, warmUp: 0, warmDown: 0, recoveries: '',
        isTaper: true
      };
      
    default:
      return null;
  }
}
