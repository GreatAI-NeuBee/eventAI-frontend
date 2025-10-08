// Utility to fix event dates that are in the past
export const fixEventDate = (eventDate: string): string => {
  const currentDate = new Date();
  const eventDateObj = new Date(eventDate);
  
  // If event is in the past, move it to tomorrow
  if (eventDateObj < currentDate) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0); // Set to noon tomorrow
    
    console.log(`📅 Event date ${eventDate} is in the past. Moving to ${tomorrow.toISOString()}`);
    return tomorrow.toISOString();
  }
  
  return eventDate;
};

// Helper to get a future date for testing
export const getFutureEventDate = (daysFromNow: number = 1): string => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  futureDate.setHours(12, 0, 0, 0); // Set to noon
  return futureDate.toISOString();
};

// Debug function to check event dates
export const debugEventDates = (eventDate: string) => {
  const currentDate = new Date();
  const eventDateObj = new Date(eventDate);
  const isPast = eventDateObj < currentDate;
  
  console.log('📅 Event Date Debug:');
  console.log(`  Current Date: ${currentDate.toISOString()}`);
  console.log(`  Event Date: ${eventDate}`);
  console.log(`  Is Past: ${isPast}`);
  console.log(`  Days Difference: ${Math.floor((eventDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))}`);
  
  return {
    currentDate,
    eventDate: eventDateObj,
    isPast,
    daysDifference: Math.floor((eventDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  };
};

