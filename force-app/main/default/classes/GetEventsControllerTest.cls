@isTest 
public class GetEventsControllerTest {
	@TestSetup
    static void testSetupMethod() {
        
        Account acc = new Account();
        acc.Name = 'Test Account';
        INSERT acc;
        
        Contact con = new Contact();
        con.FirstName = 'FN';
        con.LastName = 'LN' + DateTime.now();
        con.AccountId = acc.Id;
        INSERT con;

		List<Event> eventlist = new List<Event>();
        for(Integer i = 0; i < 2; i++) {
			Event evt = new Event();
            evt.Subject = 'Event - ' + i;
            evt.StartDateTime = DateTime.now();
            if(Math.Mod(i, 2) == 1) {
                evt.StartDateTime = DateTime.now().addDays(-2);
            }
            evt.EndDateTime = evt.StartDateTime.addHours(1);
            evt.WhatId = acc.Id;
            evt.WhoId = con.Id;
            eventlist.add(evt);
        }
        
        INSERT eventlist;
	}
    
    @isTest
    static void testMethod1() {
        //Test for GetEventsController.getCurrentMonthCalanderEvents
        
        Account acct = [SELECT Id FROM Account LIMIT 1];
        
        String startDate = (Date.Today() - 1).toString().split(' ')[0];
        String endDate = (Date.Today() + 1).toString().split(' ')[0];
        Integer count = 0;
        Id relatedRecordId = acct.Id;
        
        System.debug('startDate - > ' + startDate);
		System.debug('endDate -> ' + endDate);
        
        Test.StartTest();
        Assert.areNotEqual(NULL, GetEventsController.getCurrentMonthCalanderEvents(startDate, endDate, count, relatedRecordId));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod2() {
        //Test for GetEventsController.deleteEventRecord - SUCCESSFUL DELETE SCENARIO
        
        Event evt = [SELECT ID FROM Event LIMIT 1];
        
        Test.StartTest();
        Assert.areEqual('success;Record deleted;Event record deleted successfully', GetEventsController.deleteEventRecord(evt.ID));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod3() {
        //Test for GetEventsController.deleteEventRecord - UNSUCCESSFUL DELETE SCENARIO
        
        Event evt = [SELECT ID FROM Event LIMIT 1];
        DELETE evt;
        
        Test.StartTest();
        Assert.areEqual('error;Event deletion failed; Record does not exist', GetEventsController.deleteEventRecord(evt.ID));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod4() {
        //Test for GetEventsController.getTableViewCalanderEvents
        
        Account acct = [SELECT Id FROM Account LIMIT 1];
        
        Id currentUserId = UserInfo.getUserId();
        Integer count = 0;
        Id relatedRecordId = acct.Id;
        Integer limitSize = 25;
        Integer offset = 0;
        
        Test.StartTest();
        Assert.areNotEqual(NULL, GetEventsController.getTableViewCalanderEvents(count, relatedRecordId, limitSize, offset));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod6() {
        //Test for GetEventsController.convertTo12HourFormat - Invalid DateTime format 2024-10-09 13:05:57
        
        Account acct = [SELECT Id FROM Account LIMIT 1];
        
        Id currentUserId = UserInfo.getUserId();
        Integer count = 0;
        Id relatedRecordId = acct.Id;
        String searchKeyword = 'Event'; 
        Integer limitSize = 0;
        Integer offset = 25;
        
        Test.StartTest();
        Assert.areEqual('Invalid Event Time Format', GetEventsController.convertTo12HourFormat('invalidDateTimeFormat'));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod7() {
        //Test for GetEventsController.convertTo12HourFormat - 12:00 AM Time - 2024-10-09 00:05:57
        
        Account acct = [SELECT Id FROM Account LIMIT 1];
        
        Id currentUserId = UserInfo.getUserId();
        Integer count = 0;
        Id relatedRecordId = acct.Id;
        String searchKeyword = 'Event'; 
        Integer limitSize = 0;
        Integer offset = 25;
        
        Test.StartTest();
        Assert.areEqual('12:05 AM', GetEventsController.convertTo12HourFormat('2024-10-09 00:05:57'));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod8() {
        //Test for GetEventsController.convertTo12HourFormat - 12:00 AM Time - 2024-10-09 17:05:57
        
        Account acct = [SELECT Id FROM Account LIMIT 1];
        
        Id currentUserId = UserInfo.getUserId();
        Integer count = 0;
        Id relatedRecordId = acct.Id;
        String searchKeyword = 'Event'; 
        Integer limitSize = 0;
        Integer offset = 25;
        
        Test.StartTest();
        Assert.areEqual('5:05 PM', GetEventsController.convertTo12HourFormat('2024-10-09 17:05:57'));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod9() {
        //Test for GetEventsController.updateEventRecord - 12:00 AM Time - 2024-10-09 17:05:57
        
        Event event = [SELECT Id, StartDateTime, EndDateTime FROM Event LIMIT 1];
        
        String startDateTime = event.StartDateTime.toString().split('\\.').get(0);
        startDateTime = startDateTime.replace('T', ' ');
        
        String endDateTime = event.EndDateTime.toString().split('\\.').get(0);
        endDateTime = endDateTime.replace('T', ' ');
        
        System.debug('startDateTime -> ' + event.StartDateTime.toString());
        System.debug('endDateTime -> ' + event.EndDateTime.toString());
        
        // String startDate = (Date.Today() - 1).toString().split(' ')[0];
        // String endDate = (Date.Today() + 1).toString().split(' ')[0];
                
        Test.StartTest();
        Assert.areEqual('success;Record Updated;Event record updated successfully', GetEventsController.updateEventRecord(event.id, startDateTime, endDateTime));
        Test.StopTest();
    }
    
    @isTest
    static void testMethod10() {
        //Test for GetEventsController.updateEventRecord - Error scenario
        
        Event event = [SELECT Id, StartDateTime, EndDateTime FROM Event LIMIT 1];
        
        String startDateTime = event.StartDateTime.toString().split('\\.').get(0);
        startDateTime = startDateTime.replace('T', ' ');
        
        String endDateTime = event.EndDateTime.toString().split('\\.').get(0);
        endDateTime = endDateTime.replace('T', ' ');
        
        System.debug('startDateTime -> ' + event.StartDateTime.toString());
        System.debug('endDateTime -> ' + event.EndDateTime.toString());
                
        Test.StartTest();
        Assert.areEqual('error;Event updation failed; Record Not Found', GetEventsController.updateEventRecord('00UWU000000ing12AC', startDateTime, endDateTime));
        Test.StopTest();
    }
    
}