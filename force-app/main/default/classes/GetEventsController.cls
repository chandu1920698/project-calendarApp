/* ------------------------- Class Information -------------------------
* Class Name:               GetEventsController
* Purpose:                  Handles retrieval and management of calendar events for users, including methods to fetch events, delete events, and convert time formats.
* Author:                   Chandra Sekhar Reddy Muthumula          
* Created Date:             May 01, 2024
* ------------------------- Class Information -------------------------

* ------------------------- Updates to the class -------------------------
* Modified Date             Modified By                             Method Name                             Changes
* May 01, 2024              Chandra Sekhar Reddy Muthumula          GetEventsController                     Initial creation of `GetEventsController` class to handle calendar events retrieval and management for users.
* May 01, 2024              Chandra Sekhar Reddy Muthumula          getCurrentMonthCalanderEvents           Implemented `getCurrentMonthCalanderEvents` method to retrieve events for the current month based on start and end dates. Introduced `CalendarEvent` class to encapsulate event details. Included debugging statements for improved tracking of data flow.
* May 01, 2024              Chandra Sekhar Reddy Muthumula          getCurrentMonthCalanderEvents           Enhanced event filtering in `getCurrentMonthCalanderEvents` method to include relationships in the events. Added `relatedRecordList` to `CalendarEvent` class to store related records for each event.
* Jun 12, 2024              Chandra Sekhar Reddy Muthumula          getTableViewCalanderEvents              Created `getTableViewCalanderEvents` method to retrieve events for a tabular view with pagination support.
* Jul 04, 2024              Chandra Sekhar Reddy Muthumula          deleteEventRecord                       Implemented `deleteEventRecord` method to handle event deletions and return appropriate success/error messages.
* May 22, 2024              Chandra Sekhar Reddy Muthumula          convertTo12HourFormat                   Introduced `convertTo12HourFormat` method to convert event times from 24-hour to 12-hour format for user-friendly display.
* May 12, 2024              Chandra Sekhar Reddy Muthumula          getCurrentMonthCalanderEvents           Improved handling of event relations to prevent null pointer exceptions and to streamline related records processing. Added additional debugging statements for better visibility during development and testing.
* ------------------------- Updates to the class -------------------------
*/
public with sharing class GetEventsController {

    // Offset time in days for the current user's timezone
    public static Decimal OFFSETTIME = (Decimal)UserInfo.getTimeZone().getOffset(DateTime.now())/(1000 * 60 * 60 * 24);
    
    /*
    * Function Name            : getCurrentMonthCalanderEvents
    * Purpose                  : Retrieves calendar events for the current month based on the provided date range and user ID.
    *                            The method filters events related to a specific record and returns them organized by start date.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : May 12, 2024
    * 
    * Method Parameters        :
    * - startDate:            The start date for the events in 'YYYY-MM-DD' format.
    * - endDate:              The end date for the events in 'YYYY-MM-DD' format.
    * - count:                A count of how many events to fetch (currently not used).
    * - relatedRecordId:      The ID of the related record to filter the events.
    * 
    * Return Type             : Map<String, List<CalendarEvent>> - A map where the key is the date string and the value is a list of CalendarEvent objects.
    */
	@AuraEnabled(cacheable=true)
    public static Map<String, List<CalendarEvent>> getCurrentMonthCalanderEvents(String startDate, String endDate, Integer count, Id relatedRecordId) {
        // Initialize a list to hold calendar events
        List<CalendarEvent> calendarEvents = new List<CalendarEvent>();
        
        // Debugging statements to log input parameters
        System.debug('startDate -> ' + startDate);
        System.debug('endDate -> ' + endDate);
        System.debug('relatedRecordId -> ' + relatedRecordId);
        System.debug('offSetTime -> ' + OFFSETTIME);
        
        // Split start and end dates into individual components
        List<String> startDateSplits = startDate.split('-');
        List<String> endDateSplits = endDate.split('-');
        
        // Create DateTime objects for local start and end dates
        DateTime gmtStartDateTime = Datetime.newInstance(Integer.valueOf(startDateSplits[0]), Integer.valueOf(startDateSplits[1]), Integer.valueOf(startDateSplits[2]));
        DateTime gmtEndDateTime = Datetime.newInstance(Integer.valueOf(endDateSplits[0]), Integer.valueOf(endDateSplits[1]), Integer.valueOf(endDateSplits[2]));
        gmtEndDateTime = gmtEndDateTime.addDays(1); // Increment end date by one day for inclusive range
        
        // Debugging statements to log GMT DateTime values
        System.debug('GMT StartDateTime -> ' + gmtStartDateTime);
        System.debug('GMT EndDateTime -> ' + gmtEndDateTime);
        
        // Query to retrieve events for the current user within the specified date range
        List<Event> currentUserEventList = [SELECT Id, Subject, ActivityDateTime, ActivityDate, DurationInMinutes, Description, StartDateTime, EndDateTime, WhatId, WhoId, Who.Name, OwnerId, 
                                             (SELECT Id, RelationId, Relation.Name FROM EventRelations) 
                                             FROM Event 
                                             WHERE ((WhatId =: relatedRecordId OR WhoId =: relatedRecordId) 
                                             AND (StartDateTime >= :gmtStartDateTime AND StartDateTime < :gmtEndDateTime)) 
                                             ORDER BY StartDateTime ASC];
        
        // Debugging statement to log the number of events retrieved
        System.debug('currentUserEventList size -> ' + currentUserEventList.size());
    
        // Initialize a map to group calendar events by start date
        Map<String, List<CalendarEvent>> mapCalanderEventsByStartDate = new Map<String, List<CalendarEvent>>();
        
        // Iterate through each event retrieved
        for(Event currentEvent : currentUserEventList) {
            System.debug('currentEvent -> ' + currentEvent);
            
            // Determine the start date of the current event in string format
            String currentStartDate = (currentEvent.StartDateTime + OFFSETTIME).toString().split(' ')[0];
            System.debug('currentStartDate UST -> ' + (currentEvent.StartDateTime + OFFSETTIME));
            System.debug('currentStartDate -> ' + currentStartDate);
            
            // Initialize a new entry in the map if the date does not exist
            if(!mapCalanderEventsByStartDate.containsKey(currentStartDate)) {
                mapCalanderEventsByStartDate.put(currentStartDate, new List<CalendarEvent>());
            }
            
            // Format the start date and time of the current event
            String formattedStartDateTime = (currentEvent.StartDateTime + OFFSETTIME).toString();
            System.debug('formattedStartDateTime -> ' + formattedStartDateTime);
            
            // Create a new CalendarEvent object and populate its fields
            CalendarEvent calEvent = new CalendarEvent();
            calEvent.title = formattedStartDateTime.split(' ')[1].split(':')[0] + ':' + formattedStartDateTime.split(' ')[1].split(':')[1] + ' - ' + currentEvent.Subject;
            calEvent.startDateTime = currentEvent.StartDateTime + OFFSETTIME;
            calEvent.endDateTime = currentEvent.EndDateTime + OFFSETTIME;
            calEvent.eventId = currentEvent.Id;
            calEvent.opacity = 'opacity:1.0'; // Default opacity for events
            calEvent.description = currentEvent.Description;
            calEvent.whoName = currentEvent.who.Name;
            calEvent.relatedRecordList = new List<relatedRecordInfo>(); // Initialize the related record list
            calEvent.startTime12hrsFormat = convertTo12HourFormat(calEvent.startDateTime.toString()); // Format start time in 12-hour format
            calEvent.subject = currentEvent.Subject;
            calEvent.eventDurationInMinutes = currentEvent.DurationInMinutes;
    		calEvent.isShowMoreEventInfo = false;
            
            // Initialize a string to hold names of related contacts
            String tempWhoNames = '';
            calEvent.listOfWhoNames = '';
    
            // Iterate through event relations to collect related record info
            for(EventRelation eveRelation : currentEvent.EventRelations) {
                if(eveRelation.RelationId != null) {
                    String tempSubString = String.valueOf(eveRelation.RelationId).substring(0, 3);
                    
                    // Check if the relation ID is for a contact or lead
                    if(tempSubString == '003' || tempSubString == '00Q') {
                        System.debug('tempSubString -> ' + tempSubString);
                        System.debug('eveRelation.RelationId -> ' + eveRelation.RelationId);
                        System.debug('eveRelation.Relation.Name -> ' + eveRelation.Relation.Name);
                        // Add related record info to the calendar event
                        calEvent.relatedRecordList.add(new relatedRecordInfo(eveRelation.RelationId, eveRelation.Relation.Name));
                        tempWhoNames += (eveRelation.Relation.Name + ', '); // Collect names in a string
                    }
                }
            }
            
            // Trim the list of names for display
            String trimmedWhoNames = tempWhoNames.trim();
            Integer trimmedWhoNamesLength = trimmedWhoNames.length();
            System.debug('trimmedWhoNames -> ' + trimmedWhoNames);
            
            // Remove trailing comma if exists
            if(trimmedWhoNamesLength > 0 && trimmedWhoNames.substring(trimmedWhoNamesLength - 1, trimmedWhoNamesLength) == ',') {
                calEvent.listOfWhoNames = trimmedWhoNames.substring(0, trimmedWhoNamesLength - 1);
            } else {
                calEvent.listOfWhoNames = trimmedWhoNames;
            }
    
            // Build the event URL for accessing the event details
            calEvent.eventUrl += currentEvent.Id;
            calEvent.titleIn12HrFormat = convertTo12HourFormat(calEvent.startDateTime.toString()) + ' - ' + currentEvent.Subject;
    
            // Adjust the opacity for past events
            if(currentEvent.EndDateTime < DateTime.now()) {
                calEvent.opacity = 'opacity:0.5';
            }
    
            // Control visibility of the event record based on the number of events on the same start date
            if(mapCalanderEventsByStartDate.get(currentStartDate).size() < 2) {
                calEvent.isShowEventRecord = true;
            }
            
            // Add the event to the corresponding date in the map
            mapCalanderEventsByStartDate.get(currentStartDate).add(calEvent);
        }
        
        // Debugging statement to log the final map of calendar events
        System.debug('mapCalanderEventsByStartDate -> ' + mapCalanderEventsByStartDate);
        
        // Return the map of calendar events grouped by start date
        return mapCalanderEventsByStartDate;
    }
    
    
    /*
    * Function Name            : convertTo12HourFormat
    * Purpose                  : Converts a 24-hour format date-time string to a 12-hour format with AM/PM.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * Parameters               : 
    *    - eventStartdateTime  : String representing the event start date and time in 24-hour format.
    * Return Type              : String - Time in 12-hour format with AM/PM.
    */
    @TestVisible
    private static String convertTo12HourFormat(String eventStartdateTime) {
        try {
            // Log the input event start date-time for debugging
            System.debug('convertTo12HourFormat - eventStartdateTime -> ' + eventStartdateTime);
            
            // Extract the time part from the event start date-time
            String eventStartTime = eventStartdateTime.split(' ')[1];
            System.debug('eventStartTime -> ' + eventStartTime);
            
            // Initialize the suffix for AM/PM format
            String suffix = 'AM';
            
            // Split the time into hours and minutes
            String[] timeParams = eventStartTime.split(':');
            Integer hours = Integer.valueOf(timeParams[0]);
            String minutes = timeParams[1];
            
            // Determine if the time is AM or PM
            if (hours >= 12) {
                suffix = 'PM'; // Set suffix to PM
                if (hours > 12) {
                    hours -= 12; // Convert hours to 12-hour format
                }
            }
            
            // Handle the case for 12 AM
            if(suffix == 'AM' && hours == 0) {
                hours = 12; // Midnight in 12-hour format is 12 AM
            }
            
            // Return the formatted time in 12-hour format
            return hours + ':' + minutes + ' ' + suffix;
        } catch(Exception ex) {
            // Log error if conversion fails
            System.debug('Error in convertTo12HourFormat');
        }
        
        // Return a message for invalid input format
        return 'Invalid Event Time Format';
    }

    
    /*
    * Function Name            : getTableViewCalanderEvents
    * Purpose                  : Retrieves calendar events for the specified user and related record, with pagination support.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * Parameters               : 
    *    - count               : Number of events to retrieve (used for pagination).
    *    - relatedRecordId     : Id of the related record to filter events.
    *    - limitSize           : Maximum number of events to return.
    *    - offset              : Number of events to skip for pagination.
    * Return                   : 
    *    - List<Event>         : A list of Event records matching the criteria.
    */
    @AuraEnabled(cacheable=false)
    public static List<Event> getTableViewCalanderEvents(Integer count, Id relatedRecordId, Integer limitSize, Integer offset) {
        List<CalendarEvent> calendarEvents = new List<CalendarEvent>();
        
        // Log the related record ID for debugging
        System.debug('relatedRecordId -> ' + relatedRecordId);
        
        // Query to fetch events related to the given record ID, ordered by start date
        List<Event> eventsList = [SELECT Id, Subject, StartDateTime, EndDateTime, WhatId, WhoId, OwnerId, IsAllDayEvent, Who.Name, What.Name, Description 
                                FROM Event 
                                WHERE ((WhatId = :relatedRecordId OR WhoId = :relatedRecordId)) 
                                ORDER BY StartDateTime DESC 
                                LIMIT :limitSize 
                                OFFSET :offset];
        
        // Log the retrieved events list for debugging
        System.debug(eventsList);
        
        // Map to hold events organized by their start date
        Map<Date, List<Event>> mapEventsByStartDate = new Map<Date, List<Event>>();
        
        // Loop through the events to organize them by start date
        for (Event event : eventsList) {
            // Extract the start date from the event's start time
            Date eventStartDate = event.StartDateTime.date();
            
            // Adjust the event start and end times by the OFFSETTIME constant
            event.StartDateTime = event.StartDateTime + OFFSETTIME;
            event.EndDateTime = event.EndDateTime + OFFSETTIME;
            
            // If the map doesn't already contain the start date, initialize a new list
            if (mapEventsByStartDate.containsKey(eventStartDate) == false) {
                mapEventsByStartDate.put(eventStartDate, new List<Event>());
            }
            
            // Log the adjusted start time for debugging
            Date formattedStartDateTime = (event.StartDateTime + OFFSETTIME).date();
            System.debug('formattedStartDateTime -> ' + formattedStartDateTime);
            
            // Add the event to the list for its corresponding start date
            mapEventsByStartDate.get(eventStartDate).add(event);
        }
        
        // Log the map of events by start date for debugging
        System.debug('mapEventsByStartDate -> ' + mapEventsByStartDate);
        
        // Return the list of events
        return eventsList;
    }

    
    /*
    * Function Name            : deleteEventRecord
    * Purpose                  : Deletes an event record based on the provided event record ID.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * Parameters               : 
    *    - eventRecordId      : Id of the event record to be deleted.
    * Return                   : 
    *    - String             : A response message indicating success or failure of the deletion.
    */
    @AuraEnabled
    public static String deleteEventRecord(Id eventRecordId) {
        String response = '';
        
        // Log the event record ID being processed for debugging
        System.debug(eventRecordId);
        
        // Query to find the event record based on the provided ID
        List<Event> eventRecords = [SELECT Id FROM Event WHERE Id = :eventRecordId];
        
        // Log the retrieved event records for debugging
        System.debug('event -> ' + eventRecords);
        
        // Check if the event record exists
        if (eventRecords.size() > 0) {
            // Delete the event record
            delete eventRecords;
            response = 'success;Record deleted;Event record deleted successfully';
        } else {
            // Set error response if the record does not exist
            response = 'error;Event deletion failed; Record does not exist';
        }
        
        // Return the response message
        return response;
    }
    
    /*
    * Function Name            : updateEventRecord
    * Purpose                  : Updates an event record based on the provided event record ID.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 31, 2024
    * Parameters               : 
    *    - eventRecordId       : Id of the event record to be updated.
    *    - startDateTime       : New start date time of the event.
    *    - endDateTime         : New end date time of the event.
    * Return                   : 
    *    - String              : A response message indicating success or failure of the deletion.
    */
    @AuraEnabled
    public static String updateEventRecord(Id eventRecordId, String startDateTime, String endDateTime) {
        String response = '';
        
        // Log the event record ID being processed for debugging
        System.debug('eventRecordId -> ' + eventRecordId);
        System.debug('startDateTime -> ' + startDateTime);
        System.debug('endDateTime -> ' + endDateTime);
        
        startDateTime = startDateTime.split('\\.').get(0);
        startDateTime = startDateTime.replace('T', ' ');
        System.debug('startDateTime -> ' + startDateTime);
        
        endDateTime = endDateTime.split('\\.').get(0);
        endDateTime = endDateTime.replace('T', ' ');
        System.debug('endDateTime -> ' + endDateTime);
        
        // Query to find the event record based on the provided ID
        List<Event> eventRecords = [SELECT Id, StartDateTime, EndDateTime FROM Event WHERE Id = :eventRecordId];
        
        List<Event> updatedEvents = new List<Event>();
        
        // Check if the event record exists
        if (eventRecords.size() > 0) {
            
            for(Event currentEvent : eventRecords) { 
                System.debug('currentEvent -> ' + currentEvent);
                currentEvent.StartDateTime = Datetime.valueOfGMT(startDateTime);
                currentEvent.EndDateTime = Datetime.valueOfGMT(endDateTime);
                updatedEvents.add(currentEvent);
                System.debug('currentEvent -> ' + currentEvent);
            }
            // Delete the event record
            update updatedEvents;
            response = 'success;Record Updated;Event record updated successfully';
        } else {
            // Set error response if the record does not exist
            response = 'error;Event updation failed; Record Not Found';
        }
        
        // Return the response message
        return response;
    }
        
    public class CalendarEvent {
        @AuraEnabled
		public String title;
        @AuraEnabled
        public DateTime startDateTime;
        @AuraEnabled
        public DateTime endDateTime;
        @AuraEnabled
        public String eventId;
        @AuraEnabled
        public String opacity = 'opacity:1.0';
        @AuraEnabled
        public String eventUrl = '/';
        @AuraEnabled
        public Boolean isShowEventRecord = false;
        @AuraEnabled
        public String titleIn12HrFormat = '';
        @AuraEnabled
        public String description;
        @AuraEnabled
        public String whoName;
		@AuraEnabled
        public List<RelatedRecordInfo> relatedRecordList;
        @AuraEnabled
        public String startTime12hrsFormat;
        @AuraEnabled
        public String subject;
        @AuraEnabled
        public String listOfWhoNames;
        @AuraEnabled
        public Integer eventDurationInMinutes;
        @AuraEnabled
        public Boolean isShowMoreEventInfo;
        

    }
    
    public class RelatedRecordInfo {
        @AuraEnabled
        public Id recordId;
        @AuraEnabled
        public String recordName;
        
        public RelatedRecordInfo() {

        }
        
        public RelatedRecordInfo(ID recordId, String recordName) {
			this.recordId = recordId;
            this.recordName = recordName;
        }
	}
}