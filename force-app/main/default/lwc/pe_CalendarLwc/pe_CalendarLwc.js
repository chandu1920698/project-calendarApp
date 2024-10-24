import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import CURRENTUSERID from "@salesforce/user/Id";
import getCurrentMonthCalanderEventRecords from "@salesforce/apex/GetEventsController.getCurrentMonthCalanderEvents";
import getTableViewCalanderEvents from "@salesforce/apex/GetEventsController.getTableViewCalanderEvents";
import deleteEventRecord from "@salesforce/apex/GetEventsController.deleteEventRecord";
import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import pe_CalendarLwc from "./pe_CalendarLwc.html";
import peCalendarTableView from "./peCalendarTableView.html";
import USER_TIME_ZONE from '@salesforce/i18n/timeZone';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const EVENTTABLECOLUMNS = [
    { label: 'Start Date & Time', fieldName: 'StartDateTime', sortable: true },
    { label: 'End Date & Time', fieldName: 'EndDateTime', sortable: true },
    { label: 'Subject', fieldName: 'eventUrl',type: 'url', typeAttributes: {label: { fieldName: 'Subject' }, target: '_blank'}, sortable: true },
    { label: 'Name', fieldName: 'nameUrl', type: 'url', typeAttributes: {
        label: { fieldName: 'whoName' }, target: '_blank', tooltip : {fieldName : 'whoName'}}, 
        sortable: true
    },
    { label: 'Description', fieldName: 'Description'},
    {
        type: 'action',
        typeAttributes: { rowActions: [
            { label: 'Edit', name: 'edit' },
            { label: 'Delete', name: 'delete' },
        ] },
    },
];

export default class Pe_CalendarLwc extends NavigationMixin(LightningElement) {
    
    @api recordId;

    @track isLoading;
    @track isSmallCalendarLoading;
    @track isWeekCalendarLoading;
    @track isDayCalendarLoading;
    @track currentUserId = CURRENTUSERID;
    @track userTimeZone;
    @track mainCalendarCurrentDate;
    @track firstDayOfMonth;
    @track lastDayOfMonth;
    @track weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    @track calendar = [];
    @track mainCalendarCurrentMonth = '';
    @track mainCalendarCurrentYear = '';
    @track eventOpacity = 1.0;
    @track eventRecordData;
    @track countToManipulateWire = 0;

    @track showCalendar = false;
    @track mouseHoverEventOn = false;

    @track setRenderCallback = true;

    @track showSmallCalendar = true;
    @track monthlyCalendarSize = 'slds-size_9-of-12 slds-box';

    @track datePickerCalendar = [];

    @track currentUserTimeZone = USER_TIME_ZONE;
    @track userTimeZoneOffSetHours = Number(this.getTimeZoneOffset());

    @track weekDays = [
        {fullform : 'Sunday', shortform : 'SUN', date : 0},
        {fullform : 'Monday', shortform : 'MON', date : 0},
        {fullform : 'Tuesday', shortform : 'TUE', date : 0},
        {fullform : 'Wednesday', shortform : 'WED', date : 0},
        {fullform : 'Thursday', shortform : 'THU', date : 0},
        {fullform : 'Friday', shortform : 'FRI', date : 0},
        {fullform : 'Saturday', shortform : 'SAT', date : 0}
    ];
    
    subscription = {};
    CHANNEL_NAME = '/event/Refresh_Calendar_App__e';

    constructor() {
        super();
    }

    @track intervalId;
    @track liveDateTimeStyle;
    connectedCallback() {
        console.log("Inside connectedCallback");
        console.log("Calendar - {record Id} -> " + this.recordId); 
        console.log("this.currentUserTimeZone -> " + this.currentUserTimeZone); 
        let newDate = new Date();
        console.log("this.userTimeZoneOffSetHours -> " + this.userTimeZoneOffSetHours);
        this.mainCalendarCurrentDate = new Date(newDate.setTime(newDate.getTime() + (newDate.getTimezoneOffset() * 60000) + (this.userTimeZoneOffSetHours * 60 * 60000)));
        console.log("this.mainCalendarCurrentDate -> " + this.mainCalendarCurrentDate);
        console.log("new Date(this.mainCalendarCurrentDate) -> " + new Date(this.mainCalendarCurrentDate));

        /*
         * Set the html to show the month calendar as a default one
         * These has to be set here first as these are considered in the renderedcallback 
        */
        this.showCalendar = false;
        this.showCalendarDayView = true;
        this.setRenderCallback = true;

        /*
         * Get the new month date, which is the current month by default
         * Set the month start and end dates
         * After you have the current month dates information, generate the calendar for the same 
        */
        this.refershMonthStartEndDates(new Date(this.mainCalendarCurrentDate));
        this.generateCalendar(new Date(this.mainCalendarCurrentDate));

        this.datePickerCurrentDate = new Date(this.mainCalendarCurrentDate);
        this.datePickerSelectedYear = this.datePickerCurrentDate.getFullYear();
        this.datePickerSelectedMonth = this.getCurrentMonth(this.datePickerCurrentDate).toLocaleUpperCase();
        this.datePickerSelectedDay = this.datePickerCurrentDate.getDate();
        this.selectedDateFromSmallCalendar = this.datePickerCurrentDate;

        console.log("this.datePickerCurrentDate -> " + this.datePickerCurrentDate);
        console.log("this.datePickerSelectedYear -> " + this.datePickerSelectedYear);

        /*
         * Invoke the handle subscribe functionl to subscribe to the platform events, 
         * to process event record creation, updation or deletion
        */
        this.handleSubscribe();

        /*
         * Set the week calendar info i.e start and end dates of the current week
         * Current week is calculated using the current date, which is the mainCalendarCurrentDate 
         * This has to be set first here as the current week info is used later in highlighitng the week in date picker calendar
        */
        this.getCurrentWeekStartDateEndDate(new Date(this.mainCalendarCurrentDate));

        // Generate the date picker calendar
        this.generateDatePickerCalendar(new Date(this.datePickerCurrentDate));

        /*
         * This has to be called here to set the live line indicating the current time in the day and week calendars.
         * This is refershed every 60 seconds, so that the line moved downwards accordingly 
        */
        this.intervalId = setInterval(() => {
            this.refershLiveLineCss();
        }, 60000);
        
        // Error Handler when subscribing to the platform events in here
        onError(error => {
            console.log('connectedCallback Server Error--->'+error);
        });
    }

    /*
     * ------------------------- Functionality Details -------------------------
     * Function Name                  : getTimeZoneOffset
     * Purpose                        : Fetches time zone offset for the current user browser time.
     * Author                         : Chandra Sekhar Reddy Muthumula
     * Created Date                   : Sep 12, 2024
     * @return {Number}               : Adds fetched event data to the calendar UI.
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 12, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    getTimeZoneOffset() {
        // Create a new Date object representing the current time
        const date = new Date();
    
        // Use Intl.DateTimeFormat to get the time zone offset for 'America/Tijuana'
        const usertimeZone = new Intl.DateTimeFormat(undefined, {
            timeZone: this.currentUserTimeZone,
            timeZoneName: 'short'
        }).formatToParts(date);
    
        // Extract the offset from the formatted parts
        const offsetString = usertimeZone.find(part => part.type === 'timeZoneName').value;
    
        let offset = offsetString.split("GMT")[1];
        
        // Extract the sign
        const sign = offset[0]; // '+' or '-'
        
        // Check if the offset contains minutes
        let [hours, minutes] = offset.slice(1).split(':').map(Number);
       
        // If there are no minutes, set minutes to 0
        if (isNaN(minutes)) {
            minutes = 0;
        }
   
        // Convert hours and minutes to decimal hours
        let decimalHours = hours + (minutes / 60);
   
        // If the offset is negative, make the decimal hours negative
        if (sign === '-') {
           decimalHours *= -1;
        }
       return decimalHours;
    }

    /*
     * Function Name            : refershLiveLineCss
     * Purpose                  : This is used to move the live line downwards as the time changes. This is set to be updated every 60 seconds.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 18, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 18, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    refershLiveLineCss() {
        try {
            console.log("Inside refershLiveLineCss");
            // Get the current time based on user time zone
            let newDate = new Date();
            let currentLiveTime = new Date(newDate.setTime(newDate.getTime() + (newDate.getTimezoneOffset() * 60000) + (this.userTimeZoneOffSetHours * 60 * 60000)));

            // Calculate the total minutes passed by now
            let totalMinutesOfCurrentTime = (currentLiveTime.getHours() * 60) + currentLiveTime.getMinutes();
            // console.log("totalMinutesOfCurrentTime -> " + totalMinutesOfCurrentTime);

            // Calculate the pixels based on the minutes and the live line is to be set from the top.
            let pixelsFromTop = 'top: ' + ((this.hourHeightInDayViewCalendar / 60) * totalMinutesOfCurrentTime) + 'px;';
            // console.log("pixelsFromTop -> " + pixelsFromTop);

            this.liveDateTimeStyle = pixelsFromTop;

            // Adjust the width of the live line as per the day and week calendar
            if(this.showCalendarWeekView == true) {
                this.liveDateTimeStyle +='border: solid 1px red; position: absolute; z-index: 1;';
            } else if(this.showCalendarDayView == true) {
                this.liveDateTimeStyle += 'border: solid 1px red; position: absolute; right: 0.5rem; z-index: 1;';
            }
            // console.log("this.liveDateTimeStyle -> " + this.liveDateTimeStyle);
        } catch (error) {
            // Catch block to show id any error occurs
            console.log("Inside refershLiveLineCss - error -> " + error);
        }
        
    }



    /*
     * ------------------------- Functionality Details -------------------------
     * @wire Method Name              : wiredEventRecords
     * Purpose                        : Fetches calendar event records for the given start and end date range and adds them to the calendar. The result is automatically refreshed when any of the parameters change.
     * Author                         : Chandra Sekhar Reddy Muthumula
     * Created Date                   : Sep 12, 2024
     * 
     * @param {Date} startDate        : Start date for the current month (this.firstDayOfMonth).
     * @param {Date} endDate          : End date for the current month (this.lastDayOfMonth).
     * @param {String} currentUserId  : ID of the current user (this.currentUserId).
     * @param {Integer} count         : Counter used to manipulate wire results (this.countToManipulateWire).
     * @param {String} recordId       : ID of a related record for filtering events (this.recordId).
     * 
     * @return {void}                 : Adds fetched event data to the calendar UI.
     * @throws                        : Alerts the user with an error message if the data retrieval fails.
     * 
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 12, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    wiredEventRecordsresult;
    @wire(getCurrentMonthCalanderEventRecords, { startDate : '$firstDayOfMonth', endDate : '$lastDayOfMonth', count : '$countToManipulateWire', relatedRecordId : '$recordId'})
    wiredEventRecords(result) {
        // Check if data is successfully retrieved
        this.isLoading = true;
        if(result.data){
            // console.log(JSON.stringify(result.data));
            // Assign the fetched data to the variable
            this.wiredEventRecordsresult = result.data;

            /*
             * Calls a method to update the calendar with the fetched event records
             * This will map the events fetched to dates
            */
            this.addEventsToCalendarInfo();
            console.log("wiredEventRecordsresult -> " + JSON.stringify(this.wiredEventRecordsresult));
            console.log(this.wiredEventRecordsresult);
            this.isLoading = false;
        }
        else if (result.error) {;
            alert('error -> wiredEventRecordsresult' + JSON.stringify(result.error));
        }
    }

    /*
     * Function Name            : handleSubscribe
     * Purpose                  : This function subscribes to a Salesforce EMP API channel and listens for new event messages. Based on the message payload, it triggers different calendar views or a table view update.
     * Author                   : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 21, 2024
     * 
     * ------------------------- Functionality Details -------------------------
     * 
     * @method handleSubscribe
     * Purpose                   : Subscribes to the EMP API channel to listen for incoming messages. When a message is received, it checks the payload and refreshes the UI accordingly by updating the calendar or table view.
     * 
     * @param {String} CHANNEL_NAME : The name of the EMP API channel to subscribe to.
     * @param {Object} response      : The event message received through the EMP API subscription, containing the payload with event details.
     * @param {String} Event_Record_Id__c : The ID of the event record from the message payload, used to determine whether the event update is valid and triggers further actions.
     * 
     * @return {void}             : Subscribes to the channel and processes the incoming messages to update the calendar or table view UI.
     * 
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 21, 2024              Chandra Sekhar Reddy Muthumula          Initial creation of the handleSubscribe method and added functionality for different calendar and table views.
    */
    async handleSubscribe() {
        // Callback invoked whenever a new event message is received
            const messageCallback = async (response) => {
            console.log('New message received: ', JSON.stringify(response));
            console.log('New message received: ' + JSON.stringify(response.data.payload.Event_Record_Id__c));
            if(response.data.payload.Event_Record_Id__c !== null && response.data.payload.Event_Record_Id__c !== '') {
                console.log('response.data.payload.Event_Record_Id__c: ' + JSON.stringify(response.data.payload.Event_Record_Id__c));
                
                if(this.selectHTMLTemplateName === "pe_CalendarLwc") {
                    console.log('refreshApex before');
                    await this.getCurrentMonthCalanderEventRecordsImperativeMethod();
                    console.log('refreshApex after');
                    if(this.showCalendar == true) {
                        this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
                    } else if(this.showCalendarWeekView == true) {
                        this.getCurrentWeekStartDateEndDate(new Date(this.currentWeekStartDate));
                        this.generateWeekViewCalendarData();
                    } else if(this.showCalendarDayView == true) {
                        this.generateCalendarDayView('daySource', new Date(this.datePickerCurrentDate));
                    }
                } else if(this.selectHTMLTemplateName === 'peCalendarTableView') {
                    this.tableRowLimit = 50;
                    this.tableRowOffset = 0;
                    this.originalTableViewEventsRecordsData = [];
                    await this.getTableViewEventRecords();
                }
            }
            // Response contains the payload of the new message received
        };

        // Invoke subscribe method of empApi. Pass reference to messageCallback
        subscribe(this.CHANNEL_NAME, -1, messageCallback).then((response) => {
            // Response contains the subscription information on subscribe call
            console.log(
                'Subscription request sent to: ',
                JSON.stringify(response.channel)
            );
            console.log('subscribe ---> '+JSON.stringify(response));
            this.subscription = response;
        });
        onError(error => {
            // alert('onError ---> '+ JSON.stringify(error));
        });
    }

    /*
    * Function Name            : async getCurrentMonthCalanderEventRecordsImperativeMethod
    * Purpose                  : This function retrieves event records for the current month 
    *                            based on the user's calendar date range (start and end of the month).
    *                            It updates the calendar without regenerating it from scratch.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @return {void}           : This function does not return a value but updates the calendar events.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    async getCurrentMonthCalanderEventRecordsImperativeMethod() {
        this.countToManipulateWire += 1;
        this.isLoading = true;
        console.log('start -> Inside getCurrentMonthCalanderEventRecordsImperativeMethod');
        try {
            /*
             * Here there is no need to generate the calendars again, as we are not changing any dates, but only creating events. 
             * So just getting the new data from DB will suffice
             */
            // this.generateCalendar(new Date(this.mainCalendarCurrentDate));
            // this.refershMonthStartEndDates(new Date(this.mainCalendarCurrentDate));
            // Fetch new event records for the current month from the database based on the start and end dates
            this.wiredEventRecordsresult = await getCurrentMonthCalanderEventRecords({
                startDate : this.firstDayOfMonth,    // Start date of the current month
                endDate : this.lastDayOfMonth,      // End date of the current month
                count : this.countToManipulateWire, // Counter to refresh wire results
                relatedRecordId : this.recordId     // Related record ID for filtering
            });
            console.log('async getCurrentMonthCalanderEventRecordsImperativeMethod - this.wiredEventRecordsresult - ' + JSON.stringify(this.wiredEventRecordsresult));
            // Add the newly fetched events to the calendar
            this.addEventsToCalendarInfo();
            this.isLoading = false;
        } catch (error) {
            alert('error - Inside getCurrentMonthCalanderEventRecordsImperativeMethod' + JSON.stringify(error));
        }
        console.log('end -> Inside getCurrentMonthCalanderEventRecordsImperativeMethod');
    }

    /*
     * Function Name            : generateCalendar
     * Purpose                  : This function generates monthly calendar for the current JavaScript date
     * Author                   : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 12, 2024
     * 
     * ------------------------- Functionality Details -------------------------
     * @param {Date} currentDate :  The date for which the month has to be generated
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 21, 2024              Chandra Sekhar Reddy Muthumula          Initial creation of the generateCalendar function.
    */

    generateCalendar(currentDate) {
        try {
            console.log('INsied generateCalendar');
            this.mainCalendarCurrentMonth = this.getCurrentMonth(currentDate);
            this.mainCalendarCurrentYear = currentDate.getFullYear();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth(); 
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);

            const firstDayOfWeek = firstDayOfMonth.getDay();
            const lastDateOfMonth = lastDayOfMonth.getDate();
            console.log("currentDate -> " + currentDate);
            
            let days = [];
            let dateOfMonth = 1;
            
            // This will be in current browser's time zone
            let newDate = new Date(); 
            // This will be now in salesforce user time zone
            newDate.setMinutes(newDate.getMinutes() + (-1 * newDate.getTimezoneOffset()) + (-60 * this.userTimeZoneOffSetHours)); 
            // console.log("day -> " + day + " newDate -> " + newDate);

            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            for (let i = 0; i < 6; i++) {
                let week = { weekNumber: i, days: [] };

                for (let j = 0; j < 7; j++) {
                    if ((i === 0 && j < firstDayOfWeek) || dateOfMonth > lastDateOfMonth) {
                        week.days.push({ date: '', number: '', day : '', today : false, dayhasMoreThanThreeEvents : false, showPopoverEventsOnHover : false});
                    } else {
                        const day = new Date();
                        day.setFullYear(year);
                        day.setMonth(month);
                        day.setDate(dateOfMonth);
                        day.setHours(0);
                        day.setMinutes(0);
                        day.setSeconds(0);
                        // Removing the current local time zone off set
                        day.setMinutes(day.getMinutes() + (-1 * day.getTimezoneOffset()));
                        const classes = ['day'];
                        let todayStatus = false;
                        if (day.toDateString() === newDate.toDateString()) {
                            todayStatus = true;
                        }
                        week.days.push({ date: day, number: dateOfMonth, day : dayNames[day.getDay()], today : todayStatus, dayhasMoreThanThreeEvents : false, showPopoverEventsOnHover : false});
                        dateOfMonth++;

                    }
                }
                if((days.length === 4 || days.length === 5) && week.days[0].date !== '' && week.days[0].date !== null) {
                    days.push(week);
                } else if(week.days[6].date !== '' && week.days[6].date !== null) {
                    days.push(week);
                }
            }
            this.calendar = days;
            console.log(" generateCalendar - this.calendar -> " + JSON.stringify(this.calendar));
        } catch (error) {
            alert('Error in generateCalendar -> ' + JSON.stringify(error));
        }
    }

    /*
     * Function Name            : handleMonthChange
     * Purpose                  : Updates the month calendar based on change in the dates
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 12, 2024
     * ------------------------- Functionality Details -------------------------
     * @param {Date} date       :  The date for which the month has to be generated
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 13, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    async handleMonthChange(date) {
        this.isLoading = true;
        this.countToManipulateWire += 1;
        this.refershMonthStartEndDates(new Date(date));
        this.wiredEventRecordsresult = await getCurrentMonthCalanderEventRecords({ startDate : this.firstDayOfMonth, endDate : this.lastDayOfMonth, count : this.countToManipulateWire, relatedRecordId : this.recordId});
        this.generateCalendar(new Date(date));
        this.addEventsToCalendarInfo();
        this.isLoading = false;
    }

    /*
     * Function Name            : handlePrevDayWeekMonth
     * Purpose                  : Updates the Month, Week and Day calendar when the previous button is clicked on the calendar highlights panel.
                                  Also updates the dates of all the calendar types accordingly.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 12, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 13, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    handlePrevDayWeekMonth() {
        console.log("Inside handlePrevDayWeekMonth");
        if(this.showCalendar == true) {
            
            /*
             * When the previous button on calendar highlights panel is clicked, then month is increased by 1 in main calendar current date
             * Month handler function is called to show the next month details.
            */
            this.mainCalendarCurrentDate.setMonth(this.mainCalendarCurrentDate.getMonth() - 1);
            this.handleMonthChange(new Date(this.mainCalendarCurrentDate));
            /*
             * Once the month calendar is updated, then date picker current date is set to the day of the previous month
             * Accordingly current week start and end dates are also updated, to show the info related to the previous month if user navigates to day or week calendar view
            */
            this.datePickerCurrentDate = new Date(this.mainCalendarCurrentDate);
            this.getUpdatedDatePickerDayMonthYear();
            this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
        } else if(this.showCalendarWeekView == true) {
            /*
             * When the previous button is clicked, then the date picker current date is subtracted with 7 days.
             * And then new week start and end dates are generated using this.getCurrentWeekStartDateEndDate function.
             * Then the previous week calendar is generated.
             * The main calendar current date is updated with date picker current date
            */
            this.datePickerCurrentDate.setDate(this.datePickerCurrentDate.getDate() - 7);
            console.log("this.currentWeekStartDate -> " + this.currentWeekStartDate);
            this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
            this.generateWeekViewCalendarData();
            this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
        } else if(this.showCalendarDayView == true) {
            /*
             * When the previous button is clicked, then the date picker current date is subtracted with 1 day.
             * Then the previous week calendar is generated.
             * The main calendar current date is updated with date picker current date
            */
            this.datePickerCurrentDate.setDate(this.datePickerCurrentDate.getDate() - 1);
            this.getUpdatedDatePickerDayMonthYear();
            this.generateCalendarDayView('daySource', new Date(this.datePickerCurrentDate));
            /*
             * The new week start and end dates are generated using this.getCurrentWeekStartDateEndDate function.
             */
            if((this.currentWeekStartDate <= this.datePickerCurrentDate && this.datePickerCurrentDate <= this.currentWeekEndDate) == false) {
                this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
            }
            this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
        }
        console.log("this.mainCalendarCurrentDate -> " + this.mainCalendarCurrentDate);
        this.handleDatePickerPrevMonthClick("calendarHighlightPanel", new Date(this.datePickerCurrentDate));
        this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
    }
    
    /*
     * Function Name            : handleNextDayWeekMonth
     * Purpose                  : Updates the Month, Week and Day calendar when the next button is clicked on the calendar highlights panel.
                                  Also updates the dates of all the calendar types accordingly.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 12, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 13, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    handleNextDayWeekMonth() {
        console.log("Inside handleNextDayWeekMonth");
        if(this.showCalendar == true) {
            /*
             * When the next button on calendar highlights panel is clicked, then month is increased by 1 in main calendar current date
             * Month handler function is called to show the next month details.
            */
            this.mainCalendarCurrentDate.setMonth(this.mainCalendarCurrentDate.getMonth() + 1);
            this.handleMonthChange(new Date(this.mainCalendarCurrentDate));
            /*
             * Once the month calendar is updated, then date picker current date is set to the day of the next month
             * Accordingly current week start and end dates are also updated, to show the info related to the next month if user navigates to day or week calendar view
            */
            this.datePickerCurrentDate = new Date(this.mainCalendarCurrentDate);
            this.getUpdatedDatePickerDayMonthYear();
            this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
        } else if(this.showCalendarWeekView == true) {
            /*
             * When the next button is clicked, then the date picker current date is added with 7 days.
             * And then new week start and end dates are generated using this.getCurrentWeekStartDateEndDate function.
             * Then the next week calendar is generated.
             * The main calendar current date is updated with date picker current date
            */
            this.datePickerCurrentDate.setDate(this.datePickerCurrentDate.getDate() + 7);
            this.getUpdatedDatePickerDayMonthYear();
            this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
            this.generateWeekViewCalendarData();
            this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
        } else if(this.showCalendarDayView == true) {
            /*
             * When the next button is clicked, then the date picker current date is added with 1 day.
             * Then the next week calendar is generated.
             * The main calendar current date is updated with date picker current date
            */
            this.datePickerCurrentDate.setDate(this.datePickerCurrentDate.getDate() + 1);
            this.getUpdatedDatePickerDayMonthYear();
            this.generateCalendarDayView('daySource', new Date(this.datePickerCurrentDate));
            /*
             * The new week start and end dates are generated using this.getCurrentWeekStartDateEndDate function.
             */
            if((this.currentWeekStartDate <= this.datePickerCurrentDate && this.datePickerCurrentDate <= this.currentWeekEndDate) == false) {
                this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
            }
            this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
        }
        console.log("this.mainCalendarCurrentDate -> " + this.mainCalendarCurrentDate);
        this.handleDatePickerNextMonthClick("calendarHighlightPanel", new Date(this.datePickerCurrentDate));
        this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
    }

    get mainCalendarCurrentDay() {
        return this.mainCalendarCurrentDate.getDate();
    }

    /*
    * Function Name            : handleRefreshClick
    * Purpose                  : Refreshes the calendar view and reloads the events for the current date.
    *                            This method recalculates the month start and end dates, and updates the calendar events.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @return {void}           : This function does not return a value but refreshes the calendar and event data.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    async handleRefreshClick() {
        console.log("Inside handleRefreshClick");
        this.isLoading = true;
        this.countToManipulateWire += 1;

        // Refreshes the start and end dates for the current month based on the main calendar date
        this.refershMonthStartEndDates(new Date(this.mainCalendarCurrentDate));
        
        // Regenerates the calendar for the current main calendar date
        this.generateCalendar(new Date(this.mainCalendarCurrentDate));

        this.wiredEventRecordsresult = await getCurrentMonthCalanderEventRecords({ startDate : this.firstDayOfMonth, endDate : this.lastDayOfMonth, count : this.countToManipulateWire, relatedRecordId : this.recordId});

        // Adds the events to the updated calendar view
        this.addEventsToCalendarInfo();
        
        this.isLoading = false;
    }

    /*
     * Function Name            : getCurrentMonth
     * Purpose                  : Get the month name from a given date
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 12, 2024
     * @param {date} date       : Input date to fetch the month name
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 13, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    getCurrentMonth(date) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[date.getMonth()];
    }

    /*
    * Function Name            : handleEventCreate
    * Purpose                  : Handles the creation of a new event when triggered by the user from the UI.
    *                            This function determines the start and end date/time of the event, depending on the context (calendar type),
    *                            and invokes the record creation popup with default values.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {Object} event    : The event object that contains the data from the UI elements and context in which the event was created.
    * @return {void}           : This function does not return a value but triggers the event creation process.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    handleEventCreate(event) {
        console.log("Inside handleEventCreate");

        try {
            console.log('event.target 1 - > ' + JSON.stringify(event.target));
            console.log(event.target);

            let eventStartDateTime;
            let eventEndDateTime;
            let newDate = new Date();
            let currentDateTimeInUserTimeZone = new Date(newDate.setTime(newDate.getTime() + (newDate.getTimezoneOffset() * 60000) + (this.userTimeZoneOffSetHours * 60 * 60000)));
            console.log('currentDateTimeInUserTimeZone - > ' + currentDateTimeInUserTimeZone);
            if(event.target.dataset.object !== null && event.target.dataset.object !== undefined) {
                /*
                 * If the JS event is not null then it means an Event record is being created from the Calendar UI.
                */
                console.log('event.target.dataset.object - > ' + JSON.stringify(event.target.dataset.object));

                /*
                 * Set the default date value for the new event coming from the UI element data-object parameter.
                 * It does not matter from which calendar type the event is being created. New Event start date time remains the same.
                 * So we need not check the current active calendar type.
                */
                // eventStartDateTime = new Date(new Date(event.target.dataset.object).toISOString().split('T')[0]);
                eventStartDateTime = new Date(event.target.dataset.object);
                /*
                 * If the Event is being created in the past dates, do not allow creating the event record.
                 * Checking if the new event start date is less then current day date
                */

                
                // if(eventStartDateTime.getFullYear() < currentDateTimeInUserTimeZone.getFullYear() || 
                //     (eventStartDateTime.getFullYear() == currentDateTimeInUserTimeZone.getFullYear() && eventStartDateTime.getMonth() < currentDateTimeInUserTimeZone.getMonth()) ||
                //     (eventStartDateTime.getMonth() == currentDateTimeInUserTimeZone.getMonth() && eventStartDateTime.getDate() < currentDateTimeInUserTimeZone.getDate())
                    
                //     ) {
                //     alert('Time travel is not possible in java script');
                //     console.log("eventStartDateTime -> " + eventStartDateTime); // Outputs the first date
                //     console.log("currentDateTimeInUserTimeZone -> " + currentDateTimeInUserTimeZone); // Outputs the first date
                //     console.log("eventEndDateTime -> " + eventEndDateTime); // Outputs the second date
                //     return;
                // } 
            
                // else if (date1 > date2) {
                // console.log('date1 is later than date2');
                // } else if (date1.getTime() === date2.getTime()) {
                // console.log('date1 is equal to date2');
                // } else {
                // console.log('Something went wrong with the date comparison');
                // }

                /*
                 * Here we need to check from which calendar type the event is being created.
                 * Because the end time needs to be set differently for Monthly calendar and the other calendar types.
                 * Event end time is set in the same manner for Week and Day calendar types.
                */
                eventStartDateTime.setMinutes(0);
                if(this.showCalendar == true) {
                    /*
                     * As we do not have access to the hours in Monthly calendar, the event start time needs to be set for the next hour
                     * Eg. If current time is 1:19 PM, the event start date has to be 2:00 PM
                    */
                    eventStartDateTime.setHours(currentDateTimeInUserTimeZone.getHours() + 1);
                } else if(this.showCalendarWeekView == true || this.showCalendarDayView == true) { 
                    /*
                     * As we have access to the hours info on Week and Day Calendars, we need to get them from the UI elements and set the event start time.
                    */
                    console.log("event.target.id : hours -> " + event.target.id.split('-')[0]);
                    eventStartDateTime.setHours(event.target.id.split('-')[0]);
                }
                let totalOffsetInMinutes = (-1 * this.userTimeZoneOffSetHours * 60) + (-1 * eventStartDateTime.getTimezoneOffset());
                eventStartDateTime.setMinutes(eventStartDateTime.getMinutes() + totalOffsetInMinutes);

                
            } else { 
                /*
                 * If the JS event is null then it means an Event record is being created from "New Event" button on the calendar highlights panel.
                 * Then the event start date has to be from this.mainCalendarCurrentDate
                 * No need to check for active calendar type as they are not involved.
                */
                eventStartDateTime = new Date(this.mainCalendarCurrentDate);
                eventStartDateTime.setMinutes(0);
                let totalOffsetInMinutes = (-1 * this.userTimeZoneOffSetHours * 60) + (-1 * eventStartDateTime.getTimezoneOffset());
                eventStartDateTime.setMinutes(eventStartDateTime.getMinutes() + totalOffsetInMinutes + 60);
            }
            eventStartDateTime.setSeconds(0);

            /*
             * Set the event time period to one hour as default.
             * User can still change the start and end times as per the need from the event record create popup.
            */
            eventEndDateTime = new Date(eventStartDateTime);
            eventEndDateTime.setDate(eventStartDateTime.getDate());
            eventEndDateTime.setMinutes(eventStartDateTime.getMinutes() + 60);

            console.log("eventStartDateTime - > " + eventStartDateTime); // Outputs the first date
            console.log("currentDateTimeInUserTimeZone - > " + currentDateTimeInUserTimeZone); // Outputs the first date
            console.log("eventEndDateTime -> " + eventEndDateTime); // Outputs the second date
            /*
              * Set the values of the event
            */
            const defaultValues = {
                StartDateTime : eventStartDateTime.toISOString(),
                EndDateTime: eventEndDateTime.toISOString(),
                Subject : 'Call', 
                WhoId : null,
                WhatId : null
            };

            /*
              * If the current record page is of type Contact (003) or a Lead (00Q), set the Name field (WhoId),
              * Else set RelatedTo (WhatId) field
            */
            if(this.recordId.substring(0,3) === '003' || this.recordId.substring(0,3) === '00Q') {
                defaultValues['WhoId'] = this.recordId;
            } else {
                defaultValues['WhatId'] = this.recordId;
            }

            console.log('defaultValues -> ' + JSON.stringify(defaultValues));

            const encodedDefaultValues = encodeDefaultFieldValues(defaultValues);
            /*
             * Invoke navigationMixinHelper function to open the Event record create popup.
            */
            this.navigationMixinHelper('standard__objectPage', 'Event', 'new', encodedDefaultValues);
        } catch (error) {
            alert('inside handleEventCreate - 328 -> ' + error)
        }
        
    }

    /*
    * Function Name            : navigationMixinHelper
    * Purpose                  : This helper function simplifies the use of the Salesforce NavigationMixin for navigating to different Salesforce
    *                            objects or actions, such as creating a new record with pre-populated field values.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {String} type     : The type of navigation, e.g., 'standard__objectPage'.
    * @param {String} objectApiName : The API name of the Salesforce object, e.g., 'Event' or 'Account'.
    * @param {String} actionName : The action to perform, e.g., 'new' for creating a new record.
    * @param {Object} defaultValues : An object containing default field values to be populated in the new record form.
    * @return {void}           : This function does not return a value, but it triggers a navigation action.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    navigationMixinHelper(type, objectApiName, actionName, defaultValues) {
        this[NavigationMixin.Navigate]({
            type: type, // Defines the navigation type (e.g., 'standard__objectPage')
            attributes: {
                objectApiName: objectApiName, // Specifies the Salesforce object API name (e.g., 'Event', 'Account')
                actionName: actionName, // Specifies the action (e.g., 'new' for creating a new record)
            },
            state: {
                // count: '1',
                // nooverride: '1',
                // useRecordTypeCheck : '1',
                // defaultFieldValues holds the default values to populate in the new record form.
                defaultFieldValues: defaultValues,
                
                // Optionally, navigationLocation can be set to 'RELATED_LIST' to navigate to a related list of the object.
                navigationLocation: 'RELATED_LIST'
            }
        }); 
    }

    @track firstDateofTheMonthUSerTimeZone;
    @track lastDateofTheMonthUSerTimeZone;

    /*
    * Function Name            : refershMonthStartEndDates
    * Purpose                  : This function calculates the start and end dates of the current month in both GMT and the user's timezone.
    *                            These dates are used for fetching events from Salesforce and displaying them correctly in the user's local timezone.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {Date} newDate    : The current date for which the month start and end dates are being calculated.
    * @return {void}           : This function does not return a value, but it updates instance variables related to month start/end dates.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    refershMonthStartEndDates(newDate) {
        try {
            console.log('Inside refershMonthStartEndDates');
            console.log('newDate -> ', newDate);
            
            // Adjust the current date by subtracting the user timezone offset to get the correct date in GMT.
            // newDate.setMinutes(newDate.getMinutes() - (this.userTimeZoneOffSetHours * 60));

            // Now we have the GMT date, which is used because Salesforce stores event datetimes in GMT.
            const currentDateInGMT = newDate;
            console.log('currentDateInGMT -> ', currentDateInGMT);

            // Get the first day of the current month in GMT.
            const firstDayOfMonth = new Date(currentDateInGMT.getFullYear(), currentDateInGMT.getMonth(), 1);

            firstDayOfMonth.setHours(0);
            firstDayOfMonth.setMinutes(0);
            firstDayOfMonth.setSeconds(0);

            // Get the last day of the current month in GMT.
            const lastDayOfMonth = new Date(currentDateInGMT.getFullYear(), currentDateInGMT.getMonth() + 1, 1);

            lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
            lastDayOfMonth.setHours(0);
            lastDayOfMonth.setMinutes(0);
            lastDayOfMonth.setSeconds(0);

            // // Adjust the dates for Salesforce's 1-day offset.
            firstDayOfMonth.setDate(firstDayOfMonth.getDate() + 1);
            lastDayOfMonth.setDate(lastDayOfMonth.getDate() + 1);

            // console.log('First date of the month :', firstDayOfMonth);
            // console.log('Last date of the month :', lastDayOfMonth);

            // Format the dates to 'YYYY-MM-DD' to send to Apex.
            this.firstDayOfMonth = firstDayOfMonth.toISOString().split('T')[0];
            this.lastDayOfMonth = lastDayOfMonth.toISOString().split('T')[0];

            console.log('this.firstDayOfMonth :', this.firstDayOfMonth);
            console.log('this.lastDayOfMonth :', this.lastDayOfMonth);

            // Calculate the first day of the month in the user's time zone.
            const firstDayOfMonthUTZ = new Date(currentDateInGMT.getFullYear(), currentDateInGMT.getMonth(), 1);
            firstDayOfMonthUTZ.setHours(0);
            firstDayOfMonthUTZ.setMinutes(0);
            firstDayOfMonthUTZ.setSeconds(0);

            // Calculate the last day of the month in the user's time zone.
            const lastDayOfMonthUTZ = new Date(currentDateInGMT.getFullYear(), currentDateInGMT.getMonth() + 1, 0);
            lastDayOfMonthUTZ.setDate(lastDayOfMonthUTZ.getDate() + 1);
            lastDayOfMonthUTZ.setHours(0);
            lastDayOfMonthUTZ.setMinutes(0);
            lastDayOfMonthUTZ.setSeconds(0);

            // Set the user's timezone first and last day of the month.
            this.firstDateofTheMonthUSerTimeZone = firstDayOfMonthUTZ;
            this.lastDateofTheMonthUSerTimeZone = lastDayOfMonthUTZ;

            console.log('this.firstDateofTheMonthUSerTimeZone :', this.firstDateofTheMonthUSerTimeZone);
            console.log('this.lastDateofTheMonthUSerTimeZone :', this.lastDateofTheMonthUSerTimeZone);

        } catch (error) {
            console.log('Inside refershMonthStartEndDates error -> ' + error);
        }
    }


    /*
    * Function Name            : addEventsToCalendarInfo
    * Purpose                  : This function iterates through the calendar data and adds events to the corresponding days.
    *                            It checks for events in each day and appends them if available. It also manages displaying 
    *                            more than two events with a "+ More" indicator.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @return {void}           : This function does not return a value, but it updates the calendar days with the event data.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    addEventsToCalendarInfo() {
        console.log('Inside addEventsToCalendarInfo');
        try {
            // Loop through each week in the calendar.
            this.calendar.forEach(week => {
                // For each week, loop through each day.
                // console.log('week -> ' + JSON.stringify(week));
                week.days.forEach(day => {
                    // Ensure that the day has a valid date.
                    if (day.date != null && day.date !== '') {
                        // Check if there are events in the `wiredEventRecordsresult` for the current day.
                        if (this.wiredEventRecordsresult.hasOwnProperty(day.date.toJSON().split('T')[0])) {
                            // Add the events for the day from the `wiredEventRecordsresult`.
                            day.events = this.wiredEventRecordsresult[day.date.toJSON().split('T')[0]];

                            // If there are more than 2 events for the day, set a flag and display the remaining events.
                            if (day.events.length > 2) {
                                day.dayhasMoreThanThreeEvents = true;
                                day.remainingEvents = '+ ' + (day.events.length - 2) + ' More'; // Shows how many additional events exist excluding the first two.
                            }
                        }
                    }
                });
            });

            // Log the updated calendar with events.
            console.log("Inside addEventsToCalendarInfo - this.calendar -> " + JSON.stringify(this.calendar));

            // Refresh the view for month, week, or day calendar depending on which one is currently active.
            this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
            console.log("this.showCalendar : " + this.showCalendar + " - " + "this.showCalendarDayView : " + this.showCalendarDayView);

        } catch (error) {
            // Log and alert if an error occurs during the process.
            alert('Inside addEventsToCalendarInfo error -> ' + JSON.stringify(error));
        }
    }



    /*
    * Function Name            : handleOpenEventRecord
    * Purpose                  : Handles the event when a user clicks to open an event record from the calendar.
    *                            It extracts the record ID from the event's dataset and navigates to the event record edit page.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {Object} event    : The click event object that contains details about the clicked element.
    * @return {void}
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    handleOpenEventRecord(event) {
        console.log('event.target -> ' + JSON.stringify(event.target));
        console.log(event.target);

        // Extract the dataset object (usually a URL-like string) that contains the event record ID.
        console.log('event.target.dataset.object -> ' + JSON.stringify(event.target.dataset.object));

        // Extract the event record ID from the dataset object and pass it to edit the event record.
        this.editEventRecord(event.target.dataset.object.split('/')[1]);
    }


    /*
    * Function Name            : editEventRecord
    * Purpose                  : Navigates to the Event record's edit page in Salesforce using NavigationMixin.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {String} eventRecordId : The ID of the Event record to be edited.
    * @return {Promise}         : Returns a Promise that resolves once navigation is initiated.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    editEventRecord(eventRecordId) {
        // Return a promise to handle the asynchronous navigation.
        return new Promise((resolve) => {
            // Use NavigationMixin to navigate to the Event record edit page.
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage', // Indicates that we're navigating to a record page.
                attributes: {
                    recordId: eventRecordId,     // The ID of the event record to edit.
                    objectApiName: 'Event',      // The object API name (Event in this case).
                    actionName: 'edit'           // The action is 'edit', meaning it will open the record in edit mode.
                },
            });
        });
    }


    /*
    * Function Name            : handleOpenEventRecordFromPopup
    * Purpose                  : Handles the event to open the event record when triggered from a popup.
    *                            It extracts the record ID from the event detail and calls the editEventRecord function.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {Object} event    : The event object that contains details passed from the popup, including the record ID.
    * @return {void}
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    handleOpenEventRecordFromPopup(event) {
        // Log the event and its details to inspect the popup's data.
        console.log("event -> " + JSON.stringify(event));
        console.log("event.detail -> " + JSON.stringify(event.detail));

        // Extract the event record ID from the event detail and call editEventRecord to open it.
        this.editEventRecord(event.detail.recordId);
    }


    /*
    * Function Name            : disconnectedCallback
    * Purpose                  : This method unsubscribes from any active subscriptions and clears intervals when the component is destroyed.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    disconnectedCallback() {
        // Unsubscribes from the channel to avoid memory leaks or unnecessary operations when the component is destroyed.
        unsubscribe(this.subscription, () => {
            console.log('Unsubscribed Channel');
        });

        // Clears any interval that was set, to avoid performance issues or unwanted behaviors after the component is destroyed.
        clearInterval(this.intervalId);
    }

    @track fadesmallCalendar = "slds-size_3-of-12 slds-border_top transitiontime";
    /*
    * Function Name            : handleShowSmallCalendar
    * Purpose                  : Toggles between displaying and hiding the small calendar. Adjusts the size of the calendar accordingly.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    handleShowSmallCalendar() {
        // Toggles the visibility of the small calendar.
        this.showSmallCalendar = !this.showSmallCalendar;
    
        // Adjust the size and classes depending on whether the small calendar is shown or hidden.
        if (this.showSmallCalendar === true) {
            this.monthlyCalendarSize = 'slds-size_9-of-12 slds-box transitiontime';  // Shrink the main calendar.
            this.fadesmallCalendar = 'slds-size_3-of-12 slds-border_top transitiontime';  // Show the small calendar.
        } else {
            this.monthlyCalendarSize = 'slds-size_12-of-12 slds-box transitiontime'; // Expand the main calendar.
            this.fadesmallCalendar = 'slds-size_0-of-12 transitiontime';  // Hide the small calendar.
        }
    }

    @track showCalendarDayView = true;
    @track showCalendarWeekView = true;
    /*
    * Function Name            : handleSwitchCalendarView
    * Purpose                  : Switches between different calendar views (month, week, day, table) and triggers the respective view generation logic.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {Object} event    : Event object containing the value of the selected calendar view.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    async handleSwitchCalendarView(event) {
        console.log('Inside handleSwitchCalendarView');
        console.log('event.detail.value -> ' + event.detail.value);
    
        // Update the selected calendar view and mark it as checked in the UI.
        this.calendarTypesList.forEach(calendarType => {
            if (event.detail.value === calendarType.name) {
                calendarType.isSelected = 'checked';
                console.log('calendarType -> ' + JSON.stringify(calendarType));
            } else {
                calendarType.isSelected = '';
            }
        });
        
        // Refresh Calendar
        await this.handleRefreshClick();

        // Based on the selected view, trigger the appropriate calendar data generation and view rendering.
        if (event.detail.value === 'month') {
            this.selectHTMLTemplateName = "pe_CalendarLwc";
            this.loadMonthWeekDayTableCalanderView(true, false, false);  // Month view
        } else if (event.detail.value === 'week') {
            this.selectHTMLTemplateName = "pe_CalendarLwc";
            this.generateWeekViewCalendarData();  // Week view data generation
            this.loadMonthWeekDayTableCalanderView(false, true, false);  // Week view
        } else if (event.detail.value === 'day') {
            this.selectHTMLTemplateName = "pe_CalendarLwc";
            this.getUpdatedDatePickerDayMonthYear();  // Updates the date picker for day view
            this.generateCalendarDayView('daySource', new Date(this.datePickerCurrentDate));  // Generate day view
            this.loadMonthWeekDayTableCalanderView(false, false, true);  // Day view
        } else if (event.detail.value === 'table') {
            this.eventSearchKeyword = '';
            this.getTableViewEventRecords();  // Load the event records for the table view
            this.selectHTMLTemplateName = "peCalendarTableView";  // Switch to table view
        }
    }

    /*
    * Function Name            : loadMonthWeekDayTableCalanderView
    * Purpose                  : Loads the respective calendar view (month, week, day) based on the passed parameters.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {Boolean} month   : Determines if the month view should be loaded.
    * @param {Boolean} week    : Determines if the week view should be loaded.
    * @param {Boolean} day     : Determines if the day view should be loaded.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    loadMonthWeekDayTableCalanderView(month, week, day) {
        console.log("Inside loadMonthWeekDayTableCalanderView");

        // Ensure the correct HTML template is selected if not already done.
        if (this.selectHTMLTemplateName == "pe_CalendarLwc") {
            // Update the visibility of the calendar views based on the passed parameters (month, week, day).
            if (month === true) {
                this.showCalendar = !month;
                this.showCalendarWeekView = month;
                this.showCalendarDayView = month;
            } else if (week === true) {
                this.showCalendar = week;
                this.showCalendarWeekView = !week;
                this.showCalendarDayView = week;
            } else if (day === true) {
                this.showCalendar = day;
                this.showCalendarWeekView = day;
                this.showCalendarDayView = !day;
            }

            // Toggle the view and refresh the component.
            this.toggleBetweenMonthWeekDay = true;
            this.setRenderCallback = true;
            this.renderedCallback();
        } else if(this.selectHTMLTemplateName == "peCalendarTableView") {
            // Do nothing for now
        }
    }

    /*
    * Function Name            : renderedCallback
    * Purpose                  : Ensures the component's state and UI are updated correctly after rendering.
    *                            Also ensures that the appropriate calendar view is visible based on the selected state.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    @track toggleBetweenMonthWeekDay = true;

    renderedCallback() {
        console.log('Inside renderedCallback -> setRenderCallback : ' + this.setRenderCallback);

        // If setRenderCallback is true, proceed with re-rendering.
        if (this.setRenderCallback == true) {
            this.setRenderCallback = false;

            // Show the date picker calendar if not already visible.
            if (this.showDatePickerCalendar === false) {
                this.showDatePickerCalendar = true;
                console.log("Inside renderedCallback - showDatePickerCalendar : " + this.showDatePickerCalendar);
            }

            // Show the calendar table view if not already visible.
            if (this.showCalendarTableView === false) {
                this.showCalendarTableView = true;
            }

            // Toggle between the month, week, and day views based on the component's state.
            if (this.toggleBetweenMonthWeekDay == true) {
                if (this.showCalendar === false && this.showCalendarDayView === true && this.showCalendarWeekView == true) {
                    this.showCalendar = true;
                    this.showCalendarDayView = false;
                    this.showCalendarWeekView = false;
                    console.log("Inside renderedCallback - showCalendar : " + this.showCalendar);
                } else if (this.showCalendarDayView === true && this.showCalendar === true && this.showCalendarWeekView == false) {
                    this.showCalendarDayView = false;
                    this.showCalendar = false;
                    this.showCalendarWeekView = true;
                    console.log("Inside renderedCallback - showCalendarWeekView : " + this.showCalendarWeekView);
                } else if (this.showCalendarDayView === false && this.showCalendar === true && this.showCalendarWeekView == true) {
                    this.showCalendarDayView = true;
                    this.showCalendar = false;
                    this.showCalendarWeekView = false;
                    console.log("Inside renderedCallback - showCalendarDayView : " + this.showCalendarDayView);
                }
                this.toggleBetweenMonthWeekDay = false;
                this.refershLiveLineCss();  // Refresh CSS for the calendar view.
            }
        }
    }


    @track popoverEventsData = [];
    @track showPopoverEvents = false;
    @track left;
    @track top;

    /*
    * Function Name            : handleOpenPopoverEventsLwc
    * Purpose                  : Handles the opening of a popover displaying events for a specific day
    *                            when the user interacts with a date in the calendar.
    *                            It retrieves the relevant date information, checks for matching
    *                            events, and sets the popover's visibility and position accordingly.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 14, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 19, 2024              Chandra Sekhar Reddy Muthumula          Added the else condition to show more event info on popup
    * ------------------------- Updates to the function -------------------------
    */
    handleOpenPopoverEventsLwc(event) {
        console.log("Inside handleOpenPopoverEventsLwc");
        
        console.log('event.currentTarget.tagName -> ' + JSON.stringify(event.currentTarget.tagName));
        console.log('event.target.tagName -> ' + JSON.stringify(event.target.tagName));
    
        try {
            if (event.target.tagName === 'A') {
                console.log('The event object is an <a> tag.');
                console.log('event -> ' + JSON.stringify(event));
                console.log(event);
                console.log('event.target -> ' + JSON.stringify(event.target));
                console.log(event.target);
                
                // Retrieve the date information from the event's current target
                console.log('event.currentTarget.dataset.dateinfo -> ' + JSON.stringify(event.currentTarget.dataset.dateinfo));

                // Loop through each week in the calendar
                this.calendar.forEach(week => {
                    // console.log('week -> ' + JSON.stringify(week));
                    week.days.forEach(day => {
                        // Check if the day has a valid date
                        // console.log('day -> ' + JSON.stringify(day));
                        if (day.date !== null && day.date !== '') {
                            // Compare the current day's date with the date from the event's dataset
                            // console.log('day.date -> ' + new Date(day.date));
                            // console.log('day.date -> ' + new Date(day.date).toISOString().split(','));
                            
                            if (day.date.toDateString() === new Date(event.currentTarget.dataset.dateinfo).toDateString()) {
                                // If a match is found, set the popover event data for the matched day
                                day.showPopoverEventsOnHover = true; // Show popover indicator
                                this.popoverEventsData = day; // Set the popover data to the day's events
                                this.showPopoverEvents = true; // Make the popover visible

                                // Set the popover position based on the mouse cursor's location
                                this.left = event.clientX;
                                this.top = event.clientY;
        
                                console.log("Inside handleOpenPopoverEventsLwc - this.popoverEventsData -> " + JSON.stringify(this.popoverEventsData));
                                console.log("this.left -> " + JSON.stringify(this.left));
                                console.log("this.top -> " + JSON.stringify(this.top));
                            } else {
                                // If the day does not match, hide the popover indicator
                                day.showPopoverEventsOnHover = false;
                            }
                        }
                    });
                });

            }
        } catch (error) {
            // Log any errors that occur and display an alert to the user
            console.log('Inside handleOpenPopoverEventsLwc error -> ' + JSON.stringify(error));
            alert('Inside handleOpenPopoverEventsLwc error -> ' + JSON.stringify(error));
        }
    }

    @track showAllDayEventPopover = false;

    /*
    * Function Name            : handleClosePopover
    * Purpose                  : Closes the popover displaying events and resets the related data.
    *                            This function is triggered when the user decides to close the popover.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 14, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    handleClosePopover(event) {
        // Hide the popover by setting the visibility flag to false
        this.showPopoverEvents = false;
        
        // Reset the popover event data to an empty array
        this.popoverEventsData = [];
    }

    @track datePickerCurrentDate;
    @track datePickerSelectedYear;
    @track datePickerSelectedMonth;
    @track datePickerSelectedDay;
    @track showDatePickerCalendar = false;


    @track calendarTypesList = [
        {name : 'day', lable : 'Day', isSelected : ''},
        {name : 'week', lable : 'Week', isSelected : ''},
        {name : 'month', lable : 'Month', isSelected : 'checked'},
        {name : 'table', lable : 'Table', isSelected : ''},
    ];

    get listOfDatePickerYears() {
        console.log("Inside listOfDatePickerYears");
        // console.log("this.datePickerCurrentDate -> " + this.datePickerCurrentDate);
        let currentYear = this.datePickerCurrentDate.getFullYear();
        // console.log("currentYear -> " + currentYear);
        let years = [];
        for (let i = currentYear - 100; i<= currentYear + 99; i++) {
            if(i === currentYear) {
                years.push({ value : i, isSelected : true});
            } else {
                years.push({ value : i, isSelected : false});
            }
            
        }
        // console.log("years -> " + JSON.stringify(years));
        return years;
    }

    /*
     * Function Name            : handleDatePickerPrevMonthClick
     * Purpose                  : Updates the Month, Week and Day calendar when a day is clicked/selected from the date picker calendar. 
                                  Also updates the dates of all the calendar types accordingly.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 10, 2024
     * @param {source} String   : Source of invocation
     * @param {date} date       : Input date to update the date picker calendar
     * @return {void}           : Returns nothing
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 11, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    handleDatePickerPrevMonthClick(source, date) {
        console.log("Inside handleDatePickerPrevMonthClick");
        console.log("source, date -> " + source + ', ' + date);
        if(source === "calendarHighlightPanel" && date !== null) {
            /*
             * Nothing needs to be done all the variables are already updated on the parent method call.
            */
            console.log("Inside handleDatePickerPrevMonthClick this.datePickerCurrentDate -> " + this.datePickerCurrentDate);
        } else {
            this.datePickerCurrentDate.setMonth(this.datePickerCurrentDate.getMonth() - 1);
        }
        this.generateDatePickerCalendar(new Date(this.datePickerCurrentDate));
        console.log("Inside handleDatePickerPrevMonthClick this.datePickerCurrentDate -> " + this.datePickerCurrentDate);
        this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
    }

    /*
     * Function Name            : handleDatePickerNextMonthClick
     * Purpose                  : Updates the Month, Week and Day calendar when a day is clicked/selected from the date picker calendar. 
                                  Also updates the dates of all the calendar types accordingly.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 10, 2024
     * @param {source} String   : Source of invocation
     * @param {date} date       : Input date to update the date picker calendar
     * @return {void}           : Returns nothing
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 11, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    handleDatePickerNextMonthClick(source, date){
        this.showDatePickerCalendar = false;
        console.log("Inside handleDatePickerNextMonthClick");
        console.log("source, date -> " + source + ', ' + date);
        if(source === "calendarHighlightPanel" && date !== null) {
            /*
             * Nothing needs to be done all the variables are already updated on the parent method call.
            */
            console.log("Inside handleDatePickerNextMonthClick this.datePickerCurrentDate -> " + this.datePickerCurrentDate);
        } else {
            /*
             * This else condition executes when the date picker next month button is clicked.
             * Adds one month to the date picker current date
            */
            this.datePickerCurrentDate.setMonth(this.datePickerCurrentDate.getMonth() + 1);
        }
        this.generateDatePickerCalendar(new Date(this.datePickerCurrentDate));
        console.log("Inside handleDatePickerNextMonthClick this.mainCalendarCurrentDate -> " + this.mainCalendarCurrentDate);
        this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
    }

    /*
    * Function Name            : getUpdatedDatePickerDayMonthYear
    * Purpose                  : Updates the selected day, month, and year values based on the current date
    *                            of the date picker. It retrieves the current date's month in uppercase
    *                            and logs the selected day and year for debugging purposes.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 14, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    getUpdatedDatePickerDayMonthYear() {
        console.log("Inside getUpdatedDatePickerDayMonthYear");
        this.datePickerSelectedMonth = this.getCurrentMonth(this.datePickerCurrentDate).toLocaleUpperCase();
        this.datePickerSelectedDay = this.datePickerCurrentDate.getDate();
        this.datePickerSelectedYear = this.datePickerCurrentDate.getFullYear();
        console.log("this.datePickerCurrentDate -> " + this.datePickerCurrentDate);
        console.log("this.datePickerSelectedMonth -> " + this.datePickerSelectedMonth);
        console.log("this.datePickerSelectedDay -> " + this.datePickerSelectedDay);
        console.log("this.datePickerSelectedYear -> " + this.datePickerSelectedYear);
    }

    /*
    * Function Name            : handleDatePickerYearSelect
    * Purpose                  : Handles the event when a user selects a new year in the date picker.
    *                            It updates the current date to the selected year and regenerates 
    *                            the date picker calendar based on the updated date.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 14, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    handleDatePickerYearSelect(event) {
        console.log("Inside handleDatePickerYearSelect -> " + JSON.stringify(event));
        console.log("event.target.value -> " + event.target.value);
        this.datePickerCurrentDate.setFullYear(event.target.value);
        this.generateDatePickerCalendar(new Date(this.datePickerCurrentDate));
    }


    /*
    * Function Name            : generateDatePickerCalendar
    * Purpose                  : Generates the calendar view for the date picker based on the given 
    *                            current date. It calculates the first and last days of the month, 
    *                            determines which days to display, and checks for today's date 
    *                            and the current month. The calendar is structured into weeks, 
    *                            and each day object contains information about the date, 
    *                            day name, and styling classes.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 14, 2024
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * ------------------------- Updates to the function -------------------------
    */
    generateDatePickerCalendar(datePickerCurrentDate) {
        try {
            console.log('Inside generateDatePickerCalendar');    
            this.isSmallCalendarLoading = true;
            // Update the selected day, month, and year based on the current date
            this.getUpdatedDatePickerDayMonthYear();
            
            console.log("datePickerCurrentDate -> " + datePickerCurrentDate);
            
            // Extract the year and month from the provided date
            const year = datePickerCurrentDate.getFullYear();
            const month = datePickerCurrentDate.getMonth(); 
            
            // Determine the first and last days of the current month
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
    
            // Get the day of the week for the first day of the month and the last date of the month
            const firstDayOfWeek = firstDayOfMonth.getDay();
            const lastDateOfMonth = lastDayOfMonth.getDate();
            
            let days = []; // Array to hold the weeks of the month
            let dateOfMonth = 1; // Start from the 1st of the month
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; // Array of day names
            
            // Create a new date object for the current date
            let newDate = new Date();
            
            // Adjust the current date to the user's timezone
            let currentDateInUserTimeZone = new Date(newDate.setTime(newDate.getTime() + (newDate.getTimezoneOffset() * 60000) + (this.userTimeZoneOffSetHours * 60 * 60000)));
        
            // Loop through 6 weeks (maximum possible in a month)
            for (let i = 0; i < 6; i++) {
                let week = { weekNumber: i, days: [] }; // Initialize a week object
                
                // Loop through 7 days of the week
                for (let j = 0; j < 7; j++) {
                    // Check if we are before the first day of the month or after the last day of the month
                    if ((i === 0 && j < firstDayOfWeek) || dateOfMonth > lastDateOfMonth) {
                        // Push an empty day object for non-existent days
                        week.days.push({
                            date: '',
                            number: '',
                            day: '',
                            today: false,
                            currentMonth: false,
                            isSelectedDayFromSmallCalendar: false,
                            dayCssClass: 'datePickerTextalignCenter ',
                            dayLayoutCss: 'datepickercalweekday '
                        });
                    } else {
                        // Create a new date object for the current day
                        const dailyDate = new Date(year, month, dateOfMonth);
                        // Adjust hours, minutes, and seconds to match the user's timezone
                        dailyDate.setHours(currentDateInUserTimeZone.getHours());
                        dailyDate.setMinutes(currentDateInUserTimeZone.getMinutes());
                        dailyDate.setSeconds(currentDateInUserTimeZone.getSeconds());
    
                        // Initialize flags for today and current month status
                        let todayStatus = false;
                        let monthStatus = false;
    
                        // Initialize CSS classes for styling
                        let css = 'datePickerTextalignCenter ';
                        let layoutCss = 'datepickercalweekday ';
                        
                        // console.log("dailyDate -> " + dailyDate);
                        // console.log("currentDateInUserTimeZone -> " + currentDateInUserTimeZone);
                        
                        // Check if the current day is today
                        if (dailyDate.toDateString() === currentDateInUserTimeZone.toDateString()) {
                            // console.log("dailyDate.toDateString() -> " + dailyDate.toDateString());
                            // console.log("currentDateInUserTimeZone.toDateString() -> " + currentDateInUserTimeZone.toDateString());
                            todayStatus = true; // Mark as today
                        }
    
                        // Check if the current day is in the current month
                        if (month === currentDateInUserTimeZone.getMonth() && year === currentDateInUserTimeZone.getFullYear()) {
                            monthStatus = true; // Mark as current month
                            layoutCss += 'slds-theme_shade '; // Add shading for current month days
                        }
    
                        // Check if the current day is within the current week
                        if (!monthStatus && (this.currentWeekStartDate <= dailyDate && dailyDate <= this.currentWeekEndDate)) {
                            // console.log("this.currentWeekStartDate -> " + this.currentWeekStartDate);
                            // console.log("this.currentWeekEndDate -> " + this.currentWeekEndDate);
                            console.log("new Date(day) -> " + dailyDate);
                            layoutCss += 'slds-theme_shade '; // Shade the days in the current week
                        }
                        
                        let isSelectedDay = false; // Flag to indicate if this is a selected day
                        
                        // Check if the current day is selected from the small calendar
                        if (!todayStatus && dailyDate.toDateString() === new Date(this.selectedDateFromSmallCalendar).toDateString()) {
                            console.log("dailyDate.toDateString() -> " + dailyDate.toDateString());
                            console.log("this.selectedDateFromSmallCalendar.toDateString() -> " + this.selectedDateFromSmallCalendar.toDateString());
                            isSelectedDay = true; // Mark as selected day
                            css += 'isSelectedDayFromSmallCalendar '; // Add CSS class for selected day
                        }
    
                        // Push the day object into the week's days array
                        week.days.push({
                            date: dailyDate,
                            number: dateOfMonth,
                            day: dayNames[dailyDate.getDay()],
                            today: todayStatus,
                            currentMonth: monthStatus,
                            isSelectedDayFromSmallCalendar: isSelectedDay,
                            dayCssClass: css,
                            dayLayoutCss: layoutCss
                        });
                        dateOfMonth++; // Move to the next day of the month
                    }
                }
                
                // Add the week to the days array if it contains valid day objects
                if ((days.length === 4 || days.length === 5) && week.days[0].date !== '' && week.days[0].date !== null) {
                    days.push(week);
                } else if (week.days[6].date !== '' && week.days[6].date !== null) {
                    days.push(week);
                }
            }
    
            // Assign the generated calendar to the datePickerCalendar property
            this.datePickerCalendar = days;
            
            console.log("generateDatePickerCalendar - this.datePickerCalendar -> " + JSON.stringify(this.datePickerCalendar));
            setTimeout(() => {
                this.isSmallCalendarLoading = false;
            }, 500);

            // Set the render callback flag to true to update the UI
            this.setRenderCallback = true;
            // Call the rendered callback to refresh the UI
            this.renderedCallback();

        } catch (error) {
            // Catch and alert any errors that occur during the process
            alert('Error in generateDatePickerCalendar -> ' + JSON.stringify(error));
        }
    }
    

    /*
     * Function Name            : handleDatePickerDayClick
     * Purpose                  : Updates the Month, Week and Day calendar when a day is clicked/selected from the date picker calendar. 
                                  Also updates the dates of all the calendar types accordingly.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 10, 2024
     * @param {event} event     : Event is an onclick java script object
     * @return {void}           : Returns nothing
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 11, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * Sep 12, 2024              Chandra Sekhar Reddy Muthumula          Week calendar scenario : Updated the function to check if the date selected from the small calendar is with in the current week or not.
                                                                         If not then only generate the new week calendar.
     * ------------------------- Updates to the function -------------------------
    */

    handleDatePickerDayClick(event) {
        console.log("Inside handleDatePickerDayClick");
        console.log('event.target.dataset.object - > ' + JSON.stringify(event.target.dataset.object));
        this.selectedDateFromSmallCalendar = new Date(event.target.dataset.object);
        /*
         * Once the day is selected from the small calendar, then the main calendar info is updated with the new selected date from small calendar
         * Both this.mainCalendarCurrentDate and this.currentWeekStartDate are updated
        */
        this.datePickerCurrentDate = new Date(event.target.dataset.object);
        /*
         * Update small (date picker) calendar day, month and year info
        */
        this.getUpdatedDatePickerDayMonthYear();
        /*
         * The current function behaves differently for different calendar types
        */
        if(this.showCalendar == true) {
            if(this.mainCalendarCurrentDate.getMonth() != this.datePickerCurrentDate.getMonth() || this.mainCalendarCurrentDate.getFullYear() != this.datePickerCurrentDate.getFullYear()) {
                /*
                * This will just refersh the montly calendar with the updated this.mainCalendarCurrentDate
                * This does not need to refersh the month calendar if the day selected from the date picker calendar is of the same month
                */
                this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
                this.handleRefreshClick();
            }
            if(this.mainCalendarCurrentDate.getDate() != this.datePickerCurrentDate.getDate()) {
                this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
            }
            /*
             *  The week calendar days have to be newly set as per the new selected date from the selected date
            */
            this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
        } else if(this.showCalendarDayView == true) {
            /*
             * This will just refersh the day calendar with the updated this.datePickerCurrentDate
            */
            this.generateCalendarDayView('daySource', new Date(this.datePickerCurrentDate));
            /*
             *  The month calendar date has to be newly set as per the new selected date from the selected date
            */
            this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
            /*
             *  The week calendar days have to be newly set as per the new selected date from the small calendar
            */
            this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
        } else if(this.showCalendarWeekView == true) {
            console.log("this.datePickerCurrentDate.getDate() -> " + this.datePickerCurrentDate.getDate());
            if(this.mainCalendarCurrentDate.getMonth() != this.datePickerCurrentDate.getMonth() || this.mainCalendarCurrentDate.getFullYear() != this.datePickerCurrentDate.getFullYear() || (this.currentWeekStartDate.getDate() <= this.datePickerCurrentDate.getDate() && this.datePickerCurrentDate.getDate() <= this.currentWeekEndDate.getDate()) == false) {
                /*
                * This will get the start and end dates of the week for the selected day in the date picker calendar
                * This does not need to refersh the week calendar if the day selected from the date picker calendar is of the same week
                */
                this.getCurrentWeekStartDateEndDate(new Date(this.datePickerCurrentDate));
                /*
                * This will just refersh the week calendar with the updated this.currentWeekStartDate from the above function
                */
                this.generateWeekViewCalendarData();
            }
            /*
             *  The month calendar date has to be newly set as per the new selected date from the selected date
            */
            this.mainCalendarCurrentDate = new Date(this.datePickerCurrentDate);
        }

        /*
         * The below for loop highlights the selected day in the date picker calendar. 
         * Iterates through all days in the date picker calendar and if the current date is found, then the dayCssClass param is updated accordingly
        */
        let tempSmallCalInfo = [...this.datePickerCalendar];
        tempSmallCalInfo.forEach(week => {
            week.days.forEach(day => {
                day.dayCssClass = 'datePickerTextalignCenter ';
                day.dayLayoutCss = 'datepickercalweekday ';
                // console.log("day -> " + JSON.stringify(day));
                // if(day.date != null && day.date != '' && day.date.toISOString().split('T')[0] === this.datePickerCurrentDate.toISOString().split('T')[0]) {
                if(day.date != null && day.date != '' && day.date.toISOString().split('T')[0] === this.selectedDateFromSmallCalendar.toISOString().split('T')[0]) {
                    console.log(day.date.toISOString().split('T')[0] + " -> " + this.selectedDateFromSmallCalendar.toISOString().split('T')[0]);
                    day.dayCssClass += 'isSelectedDayFromSmallCalendar ';
                    day.isSelectedDayFromSmallCalendar = true;
                } else {
                    day.isSelectedDayFromSmallCalendar = false;
                    day.dayCssClass += '';
                }
                // console.log("day.currentMonth -> " + day.currentMonth);
                if(day.currentMonth == true) {
                    day.dayLayoutCss += 'slds-theme_shade ';
                }
                // console.log("this.currentWeekStartDate.getDate() -> " + this.currentWeekStartDate.getDate() + " this.datePickerCurrentDate.getDate() => " + this.datePickerCurrentDate.getDate() + " this.currentWeekEndDate.getDate() -> " + this.currentWeekEndDate.getDate());
                if(day.currentMonth == false && (day.date != null && day.date != '' && this.currentWeekStartDate <= new Date(day.date) && new Date(day.date) <= this.currentWeekEndDate)) {
                    day.dayLayoutCss += 'slds-theme_shade ';
                }
            });
        });
        this.datePickerCalendar = [];
        this.datePickerCalendar = tempSmallCalInfo;
        console.log("this.datePickerCalendar -> " + JSON.stringify(this.datePickerCalendar));
    }

    /*
     * Function Name            : render
     * Purpose                  : This is used to switch between .html files in the same lightining component, conditionally.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 09, 2024
     * @param {event} event     : Event is an onclick java script object
     * @return {void}           : Returns nothing
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 11, 2024              Chandra Sekhar Reddy Muthumula          Added the conditions to render the .html files in this bundle
     * ------------------------- Updates to the function -------------------------
    */

    @track selectHTMLTemplateName = "pe_CalendarLwc";
    render(){
        console.log('Inside render to change the HTML');
        if(this.selectHTMLTemplateName === "pe_CalendarLwc") {
            return pe_CalendarLwc;
        }
        if(this.selectHTMLTemplateName === "peCalendarTableView") {
            return peCalendarTableView;
        }
    }

    
    /*
     * Function Name            : convert24HrsTo12Hrs
     * Purpose                  : This function is used to convert the 24 hrs format to 12 hrs format
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 12, 2024
     * @param {Date} dateTime   : The dateTime value to be converted
     * @return {String}         : The converted dateTime value in 12 hrs format
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 12, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
    */
    convert24HrsTo12Hrs(dateTime) {
        try {
            // console.log("Inside convert24HrsTo12Hrs");
            // console.log(" dateTime -> " + JSON.stringify(dateTime));
            let tempDateTime = dateTime;
            let tempDate = tempDateTime.split('T')[0];
            // console.log("tempDate -> " + JSON.stringify(tempDate));
            let tempTime = tempDateTime.split('T')[1].split('.')[0];
            // console.log("tempTime -> " + JSON.stringify(tempTime));
            let tempDateSplit = tempDate.split('-');
            // console.log("tempDateSplit -> " + JSON.stringify(tempDateSplit));
            let tempTimeSplit = tempTime.split(':');
            // console.log("tempTimeSplit -> " + JSON.stringify(tempTimeSplit));
            let hours = tempTimeSplit[0];
            // console.log(" hours -> " + hours);
            let suffix = "AM";
            if (hours >= 12) {
                suffix = 'PM';
                hours -= 12;
            }
            
            if(suffix == 'AM' && hours == 0) {
                hours = 12;
            }
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            // console.log(`${tempDateTimeSplit[1]} ${tempDateTimeSplit[2]} ${tempDateTimeSplit[3]}, ${hours}:${tempDateTime.getMinutes()} ${suffix}`);
            return `${months[Number(tempDateSplit[1]) - 1]} ${tempDateSplit[2]} ${tempDateSplit[0]}, ${hours}:${tempTimeSplit[1]} ${suffix}`;
            
        } catch(error) {
            console.log('Inside convert24HrsTo12Hrs Error -> ' + JSON.stringify(error));
        }
        
    }

    @track tableViewEventsRecordsData = [];
    @track originalTableViewEventsRecordsData = [];
    @track showCalendarTableView = false;
    @track tableRowLimit = 50;
    @track tableRowOffset = 0;
    @track isLoadMoreData = false;
    @track enableInfiniteLoading = true;
    eventTablecolumns = EVENTTABLECOLUMNS;

    /*
     * Function Name            : getTableViewEventRecords
     * Purpose                  : Fetches event records for the table view based on the current user ID, related record ID, and any search keywords.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 08, 2024
     * @return {Promise<void>}  : Returns a promise that resolves when the event records are fetched and processed.
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 12, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * Sep 27, 2024              Chandra Sekhar Reddy Muthumula          Updated the code to process the new date from apex everytime 
                                                                         and then append it to the data table info
     * ------------------------- Updates to the function -------------------------
     */
    async getTableViewEventRecords() {
        console.log("Inside getTableViewEventRecords"); // Log entry into the function
        try {
            // Call the Apex method to get event records based on user ID, related record ID, and search keyword
            const data = await getTableViewCalanderEvents({
                count : 0, 
                relatedRecordId : this.recordId, 
                limitSize : this.tableRowLimit,
                offset : this.tableRowOffset
            });
            // console.log("Data -> " + JSON.stringify(data)); // Log the fetched data
            // console.log("this.tableRowLimit -> " + this.tableRowLimit);
            // console.log("this.tableRowOffset -> " + this.tableRowOffset);
            let formattedEventsDataFromApex = []; // Initialize an array to hold formatted event records
            this.enableInfiniteLoading = (data.length == this.tableRowLimit || data.length != 0);

            data.forEach(item => {
                // Iterate through the fetched data to format it for the table view
                let newItem = {}; // Spread operator to clone the item
                newItem.Id = item.Id;
                newItem.eventUrl = `/${item.Id}`;
                newItem.nameUrl = item.Who ? `/${item.Who.Id}` : '';
                newItem.whoName = item.Who ? item.Who.Name : '';
                newItem.relatedtoUrl = item.What ? `/${item.What.Id}` : '';
                newItem.whatName = item.What ? item.What.Name : '';
                newItem.Subject = item.Subject ? item.Subject : '';
                newItem.IsAllDayEvent = item.IsAllDayEvent ? item.IsAllDayEvent : '';
                newItem.Description = item.Description ? item.Description : '';
                newItem.StartDateTime = item.StartDateTime ? this.convert24HrsTo12Hrs(item.StartDateTime) : '';
                newItem.EndDateTime = item.EndDateTime ? this.convert24HrsTo12Hrs(item.EndDateTime) : '';
                // Push the formatted event record into the temporary array
                formattedEventsDataFromApex.push(newItem);
            });

            this.originalTableViewEventsRecordsData = [...this.originalTableViewEventsRecordsData, ...formattedEventsDataFromApex];

            if(this.eventSearchKeyword != '' || this.eventSearchKeyword != null) {
                this.tableViewEventsRecordsData = this.originalTableViewEventsRecordsData.filter((currentEvent) => currentEvent.Subject.includes(this.eventSearchKeyword ));
            } else {
                this.tableViewEventsRecordsData = this.originalTableViewEventsRecordsData;
            }

            console.log("this.originalTableViewEventsRecordsData -> " + JSON.stringify(this.originalTableViewEventsRecordsData));
            return this.tableViewEventsRecordsData; // Return the formatted event records
        } catch (error) {
            // Handle any errors that occur during the fetch
            alert("Inside getTableViewEventRecords error -> " + JSON.stringify(error));
            return null; // Return null in case of an error
        }
    }

    /*
    * Function Name            : loadMoreData
    * Purpose                  : This function loads more event records for the table view by increasing the offset based on the row limit.
    *                            It ensures that no simultaneous data fetches are triggered while loading more data is in progress.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Sep 13, 2024
    * @param {Event} event     : The event object that triggers this function, although not directly used in the current implementation.
    * @return {Promise<void>}  : Returns a promise that resolves once additional event records are fetched and processed.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Sep 13, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
    * ------------------------- Updates to the function -------------------------
    */
    async loadMoreData(event) {
        console.log("Inside loadMoreData");

        try {
            // Ensure that only one data fetch is happening at any given time
            // If the data is already being loaded, exit the function
            if (this.isLoadMoreData) {
                // Prevents simultaneous calls to load more data
                return; 
            }

            // Indicate that data fetching is in progress
            this.isLoadMoreData = true;

            console.log("this.tableRowLimit -> " + this.tableRowLimit + " " + 
                        "this.tableRowOffset -> " + this.tableRowOffset + 
                        " this.tableViewEventsRecordsData.length => " + this.tableViewEventsRecordsData.length);

            // Increment the tableRowOffset by the limit value to fetch the next set of records
            this.tableRowOffset += this.tableRowLimit;

            // Call the method to fetch more event records using the updated offset and row limit
            await this.getTableViewEventRecords();
        } catch (error) {
            console.log("Inside loadMoreData error -> " + JSON.stringify(error));
        } finally {
            // Reset the flag indicating that data fetching has completed or failed
            this.isLoadMoreData = false;
        }
    }


    @track eventSearchKeyword = '';
    /*
    * Function Name            : handleEventSearch
    * Purpose                  : This function handles the search functionality for events in the table view.
    *                            It filters the event records based on the search keyword entered by the user.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Sep 14, 2024
    * @param {Event} event     : The event object that contains the search keyword entered by the user.
    * @return {void}           : No return value. The function updates the table view records dynamically based on the search keyword.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Sep 14, 2024              Chandra Sekhar Reddy Muthumula          Added comments and handled null/empty keyword check
    * ------------------------- Updates to the function -------------------------
    */
    handleEventSearch(event) {
        console.log("Inside handleEventSearch");
        console.log("Search event object -> " + JSON.stringify(event));
        console.log("Search keyword -> " + JSON.stringify(event.detail.value));

        // Convert the search keyword to lowercase for case-insensitive search
        this.eventSearchKeyword = event.detail.value.toLowerCase();

        // Check if the search keyword is not empty or null
        if (this.eventSearchKeyword !== '' && this.eventSearchKeyword !== null) {
            // Filter the original table view records based on the keyword found in the Subject or Description fields (case-insensitive)
            this.tableViewEventsRecordsData = this.originalTableViewEventsRecordsData.filter((currentEvent) => (currentEvent.Subject.toLowerCase().includes(this.eventSearchKeyword) || currentEvent.Description.toLowerCase().includes(this.eventSearchKeyword)));
        } else {
            // If the search keyword is empty or null, reset the table view to the original event records
            this.tableViewEventsRecordsData = this.originalTableViewEventsRecordsData;
        }
    }

    /*
    * Function Name            : handleRowAction
    * Purpose                  : Handles row-level actions (like 'edit' and 'delete') triggered by the user on a table view.
    *                            Depending on the action, it either navigates to the edit page or deletes the selected event record.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {Event} event     : The event object containing details of the row action triggered by the user (like delete or edit).
    * @return {Promise<void>}  : The function returns a promise due to the asynchronous delete operation and record fetch process.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added comments and structured row action handling
    * ------------------------- Updates to the function -------------------------
    */
    async handleRowAction(event) {
        console.log("Inside handleRowAction");

        // Extract the action name (either 'delete' or 'edit') from the event details
        const actionName = event.detail.action.name;
        console.log("actionName -> " + actionName);
        console.log(event);

        // Extract the record Id of the row where the action was triggered
        const row = event.detail.row.Id;
        // console.log(row);

        // Switch-case structure to handle different actions based on the action name
        switch (actionName) {
            case 'delete':
                // If the action is 'delete', call the deleteEventRecord Apex method to delete the selected event
                const response = await deleteEventRecord({ eventRecordId: event.detail.row.Id });

                // Reset table properties and fetch the updated list of event records after deletion
                this.tableRowLimit = 50;
                this.tableRowOffset = 0;
                this.originalTableViewEventsRecordsData = [];
                this.getTableViewEventRecords();

                // Split the response message (assuming it's formatted as 'status;title;message') and show a toast notification
                const splitResponse = response.split(';');
                this.showToast(splitResponse[1], splitResponse[0], splitResponse[2]);
                break;

            case 'edit':
                // If the action is 'edit', navigate to the record edit page using NavigationMixin
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: event.detail.row.Id,    // Record Id of the selected row
                        objectApiName: 'Event',           // Object type (Event)
                        actionName: 'edit'                // Action to navigate to the edit page
                    },
                });
                break;

            default:
                // Nothing as of now
        }

        
    }


    /*
    * Function Name            : showToast
    * Purpose                  : This function triggers a toast notification in the Lightning web component.
    *                            It allows displaying a message to the user with a title, message body, and variant (success, error, warning, etc.).
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {String} title    : The title of the toast notification.
    * @param {String} variant  : The variant of the toast (e.g., 'success', 'error', 'warning', 'info') which determines the styling and icon.
    * @param {String} message  : The main message to be displayed in the toast notification.
    * @return {void}           : This function does not return any value. It dispatches an event to display the toast notification.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added comments to the function
    * ------------------------- Updates to the function -------------------------
    */
    showToast(title, variant, message) {
        // Create a new ShowToastEvent with the provided title, message, and variant
        const event = new ShowToastEvent({
            title: title,      // The title to be displayed in the toast notification
            message: message,  // The body message of the toast notification
            variant: variant   // The type or style of the toast notification (e.g., 'success', 'error', 'warning', 'info')
        });

        // Dispatch the toast event so it can be handled by the LWC to display the notification
        this.dispatchEvent(event);
    }


    @track dayInfo = {hourRowsInfo : [], isToday : false};
    @track hourHeightInDayViewCalendar = 50;
    @track selectedDateFromSmallCalendar;

    /*
    * Function Name            : generateCalendarDayView
    * Purpose                  : This function generates the day view of the calendar, including populating events 
    *                            for the given date. It processes the events based on the calendar data and handles 
    *                            scenarios where the selected date falls outside of the current month.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @param {String} source   : Specifies the source of the date selection (e.g., daySource).
    * @param {Date} date       : The selected date for which the day view needs to be generated.
    * @return {Object}         : Returns an object containing day information and associated events for each hour of the day.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments and optimized event processing.
    * ------------------------- Updates to the function -------------------------
     */
    async generateCalendarDayView(source, date) {
        console.log("Inside generateCalendarDayView");
        this.isDayCalendarLoading = true;
        console.log("date -> " + date);
        
        // If the source is 'daySource', set the selected date from the small calendar
        if (source == 'daySource') {
            this.selectedDateFromSmallCalendar = date;
        }

        const day = {date : date, events : []};
        console.log("day -> " + JSON.stringify(day));
        console.log("date.getMonth() -> " + date.getMonth());
        console.log("this.mainCalendarCurrentDate.getMonth() -> " + this.mainCalendarCurrentDate.getMonth());
        
        // This flag is used to iterate through the calendar until the correct day is found
        let iterateThroughCalendarOnlyUntilDayIsMatched = true;
    
        console.log("this.firstDateofTheMonthUSerTimeZone ->" + this.firstDateofTheMonthUSerTimeZone);
        console.log("this.lastDateofTheMonthUSerTimeZone ->" + this.lastDateofTheMonthUSerTimeZone);

        // Check if the selected date falls within the current month's range
        if(this.firstDateofTheMonthUSerTimeZone <= date && date < this.lastDateofTheMonthUSerTimeZone) {
            // Eat five star and do nothing
            console.log("Eat five star and do nothing -> " + date);
        } else {
            console.log("The date does not fall in the curent month -> " + date);
            // If the date falls outside the current month, update the calendar for the new month as per the date
            await this.handleMonthChange(new Date(date));
        }

        // Iterate through the weeks and days in the calendar to find the matching day and its events
        for(let calendarCurrentWeek of this.calendar) {
            for(let calendarCurrentDay of calendarCurrentWeek.days) {
                // console.log("calendarCurrentDay.date - " + calendarCurrentDay.date + " <-> " + " date " + date);
                if(iterateThroughCalendarOnlyUntilDayIsMatched == true && calendarCurrentDay.date != null && calendarCurrentDay.date != '' && calendarCurrentDay.date.toDateString() == date.toDateString() && calendarCurrentDay.hasOwnProperty('events')) {
                    console.log(" iterateThroughCalendarOnlyUntilDayIsMatched -> " + new Date(calendarCurrentDay.date).toDateString() + " -> " + new Date(date).toDateString());
                    console.log("Found the day events");
                    day.events = calendarCurrentDay.events;
                    // Stop iterating after matching the day
                    iterateThroughCalendarOnlyUntilDayIsMatched = false;
                }
            }
        }
        // Initialize the structure for the day's hourly view
        this.dayInfo = {hourRowsInfo : [], isToday : false};

        let tempDayHourRows = [
            {hoursValue : '00', hoursValue12hrs : '12 AM', events : [], hasEvents : false},
            {hoursValue : '01', hoursValue12hrs : '1 AM', events : [], hasEvents : false},
            {hoursValue : '02', hoursValue12hrs : '2 AM', events : [], hasEvents : false},
            {hoursValue : '03', hoursValue12hrs : '3 AM', events : [], hasEvents : false},
            {hoursValue : '04', hoursValue12hrs : '4 AM', events : [], hasEvents : false},
            {hoursValue : '05', hoursValue12hrs : '5 AM', events : [], hasEvents : false},
            {hoursValue : '06', hoursValue12hrs : '6 AM', events : [], hasEvents : false},
            {hoursValue : '07', hoursValue12hrs : '7 AM', events : [], hasEvents : false},
            {hoursValue : '08', hoursValue12hrs : '8 AM', events : [], hasEvents : false},
            {hoursValue : '09', hoursValue12hrs : '9 AM', events : [], hasEvents : false},
            {hoursValue : '10', hoursValue12hrs : '10 AM', events : [], hasEvents : false},
            {hoursValue : '11', hoursValue12hrs : '11 AM', events : [], hasEvents : false},
            {hoursValue : '12', hoursValue12hrs : '12 AM', events : [], hasEvents : false},
            {hoursValue : '13', hoursValue12hrs : '1 PM', events : [], hasEvents : false},
            {hoursValue : '14', hoursValue12hrs : '2 PM', events : [], hasEvents : false},
            {hoursValue : '15', hoursValue12hrs : '3 PM', events : [], hasEvents : false},
            {hoursValue : '16', hoursValue12hrs : '4 PM', events : [], hasEvents : false},
            {hoursValue : '17', hoursValue12hrs : '5 PM', events : [], hasEvents : false},
            {hoursValue : '18', hoursValue12hrs : '6 PM', events : [], hasEvents : false},
            {hoursValue : '19', hoursValue12hrs : '7 PM', events : [], hasEvents : false},
            {hoursValue : '20', hoursValue12hrs : '8 PM', events : [], hasEvents : false},
            {hoursValue : '21', hoursValue12hrs : '9 PM', events : [], hasEvents : false},
            {hoursValue : '22', hoursValue12hrs : '10 PM', events : [], hasEvents : false},
            {hoursValue : '23', hoursValue12hrs : '11 PM', events : [], hasEvents : false},
        ];

        // Process each event and assign it to the corresponding hour
        day.events.forEach(event => {
            let tempEvent = {};
            tempEvent.endDateTime = event.endDateTime;
            tempEvent.eventId = event.eventId;
            tempEvent.eventUrl = event.eventUrl;
            tempEvent.isShowEventRecord = event.isShowEventRecord;
            tempEvent.opacity = event.opacity;
            tempEvent.startDateTime = event.startDateTime;
            tempEvent.title = event.title;
            tempEvent.subject = event.title.split(' - ')[1];
            tempEvent.isShowMoreEventInfo = false;
            tempEvent.description;
            tempEvent.whoName;
            tempEvent.emptySpaceCssOnTop =  '';
            tempEvent.emptySpaceCssOnBottom =  '';
            tempEvent.eventDuration = event.eventDurationInMinutes;
            tempEvent.eventHeight = (event.eventDurationInMinutes/60) * this.hourHeightInDayViewCalendar;
            tempEvent.relatedrecordsInfo = {truncatedListOfRelatedRecords : '', relatedRecordsList : []};
            tempEvent.isShowDescription = false;
            tempEvent.isShowRelatedRecords = false;

            // Check if event height allows showing description and related records
            if(tempEvent.eventHeight >= 30) {
                console.log("tempEvent.eventHeight -> " + tempEvent.eventHeight);
                tempEvent.isShowDescription = true;
                tempEvent.isShowRelatedRecords = true;

                // Populate related records
                for(let i = 0; i < event.relatedRecordList.length; i++) {
                    let currentRelatedRecord = event.relatedRecordList[i];
                    tempEvent.relatedrecordsInfo.relatedRecordsList.push({
                        recordId : currentRelatedRecord.recordId,
                        recordUrl : '/' + currentRelatedRecord.recordId,
                        recordName : currentRelatedRecord.recordName,
                        isLastRecord : false
                    });
                    if(i != event.relatedRecordList.length - 1) {
                        tempEvent.relatedrecordsInfo.truncatedListOfRelatedRecords += currentRelatedRecord.recordName + ', ';
                    }else if(i == event.relatedRecordList.length - 1) {
                        tempEvent.relatedrecordsInfo.relatedRecordsList[i].isLastRecord = true;
                        tempEvent.relatedrecordsInfo.truncatedListOfRelatedRecords += currentRelatedRecord.recordName;
                    }
                }

            } else if(tempEvent.eventHeight >= 25) {
                tempEvent.isShowDescription = true;
            }
            // Check if the event has a description and add it if present
            if(event.hasOwnProperty('description')) {
                tempEvent.description = event.description;
            }
            // Check if the event has a 'whoName' field and add it if present
            if(event.hasOwnProperty('whoName')) {
                tempEvent.whoName = event.whoName;
            }

            tempEvent.titleIn12HrFormat = event.titleIn12HrFormat;
            // tempEvent.paddingTop = 'padding-top:' + (new Date(tempEvent.startDateTime).toISOString().split('T')[1].split(':')[1]/60) * this.hourHeightInDayViewCalendar + 'px;'
            // Style the event for the hourly calendar view
            tempEvent.eventClass = 'position : relative;' + 
            'height : ' +  ((tempEvent.eventDuration/60) * this.hourHeightInDayViewCalendar) + 'px;' +
            // 'margin-top : ' + (new Date(tempEvent.startDateTime).toISOString().split('T')[1].split(':')[1]/60) * this.hourHeightInDayViewCalendar + 'px;' +
            // 'left : 100px;' + /
            'margin-left:1px;' +
            // 'border : groove;' +
            'z-index : 1;' +
            'text-align: left;' +
            'border: 0.01px solid lightblue;' +
            event.opacity + ';';
            // console.log("tempEvent -> " + JSON.stringify(tempEvent));

            // Place event in the appropriate hour slot
            tempDayHourRows.forEach(hour => {
                if(hour.hoursValue == new Date(tempEvent.startDateTime).toISOString().split('T')[1].split(':')[0]) {
                    hour.events.push(tempEvent);
                }
            });
        });

        // Adjust event width and layout for hours with multiple events
        tempDayHourRows.forEach(hour => {
            if(hour.events.length > 0) {
                let eventsCount = hour.events.length;
                console.log("eventsCount -> " + eventsCount);
                hour.hasEvents = true;
                hour.events.forEach(event => {
                    event.eventWidth = ' width : ' + ((1/eventsCount) * 100) + '%;' + 'position : relative;'; 
                    // event.eventClass = event.eventClass + ' width : ' + ((1/eventsCount) * 100) + '%;'; 
                    
                    event.emptySpaceCssOnTop = 'height: '+ ((new Date(event.startDateTime).toISOString().split('T')[1].split(':')[1]/60) * this.hourHeightInDayViewCalendar) + 'px;';
                    event.emptySpaceCssOnBottom = 'height: '+  ((1 - (new Date(event.startDateTime).toISOString().split('T')[1].split(':')[1]/60)) * this.hourHeightInDayViewCalendar - event.eventHeight) + 'px;';
                    
                    console.log("event.emptySpaceCssOnTop -> " + JSON.stringify(event.emptySpaceCssOnTop));
                    console.log("event.emptySpaceCssOnBottom -> " + JSON.stringify(event.emptySpaceCssOnBottom));
                });
            }
            
        });

        // Create day info object with the processed hour rows
        let tempDayInfo = {hourRowsInfo : [...tempDayHourRows], isToday : false};

        console.log("this.datePickerCurrentDate -> " + this.datePickerCurrentDate);
        console.log("this.userTimeZoneOffSetHours -> " + this.userTimeZoneOffSetHours);

        let newDate = new Date();
        let currentLocalDateTimeInUserTimeZone = new Date(newDate.setTime(newDate.getTime() + (newDate.getTimezoneOffset() * 60000) + (this.userTimeZoneOffSetHours * 60 * 60000)));
        let currentDayInWeekCalendar = new Date(date);

        console.log("currentLocalDateTimeInUserTimeZone -> " + currentLocalDateTimeInUserTimeZone);
        console.log("currentDayInWeekCalendar -> " + currentDayInWeekCalendar);

        // Determine if the selected date is today
        if(currentLocalDateTimeInUserTimeZone.getFullYear() == currentDayInWeekCalendar.getFullYear() && currentLocalDateTimeInUserTimeZone.getMonth() == currentDayInWeekCalendar.getMonth() && currentLocalDateTimeInUserTimeZone.getDate() == currentDayInWeekCalendar.getDate() ) {
            tempDayInfo.isToday = true;
        }

        // Update the day info with processed events and hours
        this.dayInfo = tempDayInfo;

        console.log("this.selectedDateFromSmallCalendar -> " + this.selectedDateFromSmallCalendar);
        console.log("this.dayInfo -> " + JSON.stringify(this.dayInfo));

        setTimeout(() => {
            this.isDayCalendarLoading = false;
        }, 500) ;

        // Load the updated calendar view if the source is 'daySource'
        if(source == 'daySource') {
            this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
        }
        
        return tempDayInfo;
    }


    @track weekViewCalendarData = [];

    /*
    * Function Name            : async generateWeekViewCalendarData
    * Purpose                  : This function generates the week view of the calendar by processing and 
    *                            gathering event information for each day in the current week. 
    *                            It retrieves data for each day using the generateCalendarDayView function.
    * Author Details           : Chandra Sekhar Reddy Muthumula
    * Created Date             : Oct 8, 2024
    * @return {void}           : This function does not return a value but updates the week view data.
    * ------------------------- Updates to the function -------------------------
    * Modified Date             Modified By                             Changes
    * Oct 8, 2024               Chandra Sekhar Reddy Muthumula          Added detailed comments for better clarity.
    * ------------------------- Updates to the function -------------------------
    */
    async generateWeekViewCalendarData() {
        console.log("Inside generateWeekViewCalendarData");
        this.isWeekCalendarLoading = true;
        console.log("this.currentWeekStartDate -> " + this.currentWeekStartDate);
        console.log("this.mainCalendarCurrentDate -> " + this.mainCalendarCurrentDate);
        
        // Initialize an array to hold week data
        let tempWeekData = [];
        
        // Create a new date object starting from the current week's start date
        let tempWeekDate = new Date(this.currentWeekStartDate);
        console.log("tempWeekDate -> " + tempWeekDate);

        // Loop through all 7 days of the week (Sunday to Saturday)
        for(let i = 0; i <= 6; i++) {
            // Create an object to store the day and its event information
            let tempDayInfo = {day : null, dayInfo : {}};
            
            // Set the current day's date
            tempDayInfo.day = new Date(tempWeekDate);
            console.log("tempDayInfo.day -> " + tempDayInfo.day);
            
            // Set the date for each day in the weekDays array
            this.weekDays[i].date = tempWeekDate.getDate();

            // Fetch event data for the current day by calling generateCalendarDayView
            const testData = await this.generateCalendarDayView('weekCalendarView', new Date(tempDayInfo.day));
            
            // Assign the returned day information to tempDayInfo
            tempDayInfo.dayInfo = testData;
            
            // Add the current day's info to the temporary week data array
            tempWeekData.push(tempDayInfo);
            
            // Move to the next day by incrementing the date
            tempWeekDate.setDate(tempWeekDate.getDate() + 1);
            console.log('tempWeekDate -> ' + JSON.stringify(tempWeekDate));
        }
        
        // After processing all days, assign the collected data to the weekViewCalendarData
        this.weekViewCalendarData = [...tempWeekData];

        setTimeout(() => {
            this.isWeekCalendarLoading = false;
        }, 500);
        
        // Log the current state of the main calendar and week view calendar data
        console.log("this.mainCalendarCurrentDate -> " + JSON.stringify(this.mainCalendarCurrentDate));
        console.log("this.weekViewCalendarData -> " + JSON.stringify(this.weekViewCalendarData));
    }

    
    @track currentWeekStartDate;
    @track currentWeekStartDay;
    @track currentWeekStartMonth;
    @track currentWeekStartYear;
    @track currentWeekEndDate;
    @track currentWeekEndDay;
    @track currentWeekEndMonth;
    @track currentWeekEndYear;

    /*
     * Function Name            : getCurrentWeekStartDateEndDate
     * Purpose                  : Updates the current week start and end date information.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Sep 20, 2024
     * @param {Date} inputDate  : The inputDate value is a date value of a day in the week.
     * @return {Promise<void>}  : Returns nothing
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Sep 20, 2024              Chandra Sekhar Reddy Muthumula          Added comments to the function
     * ------------------------- Updates to the function -------------------------
     */

    getCurrentWeekStartDateEndDate(inputDate){
        console.log("Inside getCurrentWeekStartDate");
        let date = inputDate;
        console.log("getCurrentWeekStartDate date -> " + date);
        //weekStartDate is the difference between the current date value and the day of the week.
        let weekStartDate = date.getDate() - date.getDay();

        /*
         * Set the current start date value.
         * Set the current start date hours, minutes and seconds to 0.
         * So this will be a sunday.
         * Refresh the current week start day, month and year values
        */
        this.currentWeekStartDate = new Date(date.setDate(weekStartDate));
        this.currentWeekStartDate.setHours(0);
        this.currentWeekStartDate.setMinutes(0);
        this.currentWeekStartDate.setSeconds(0);
        console.log("this.currentWeekStartDate- > " + this.currentWeekStartDate);
        this.currentWeekStartDay = this.currentWeekStartDate.getDate();
        this.currentWeekStartMonth = this.getCurrentMonth(this.currentWeekStartDate);
        this.currentWeekStartYear = this.currentWeekStartDate.getFullYear();
        

        /*
         * Set the current week end date value to start date.
         * Set the current week end date value to end of the week by adding 6 days.
         * So this will be a Saturday.
         * Set the current week end date hours, minutes and seconds to 23:59:59
         * Refresh the current week end day, month and year values
        */
        this.currentWeekEndDate = new Date(this.currentWeekStartDate);
        this.currentWeekEndDate.setDate(this.currentWeekEndDate.getDate() + 6);
        this.currentWeekEndDate.setHours(23);
        this.currentWeekEndDate.setMinutes(59);
        this.currentWeekEndDate.setSeconds(59);
        console.log("this.currentWeekEndDate -> " + this.currentWeekEndDate);
        this.currentWeekEndDay = this.currentWeekEndDate.getDate();
        this.currentWeekEndMonth = this.getCurrentMonth(this.currentWeekEndDate);
        this.currentWeekEndYear = this.currentWeekEndDate.getFullYear();
    }

    /*
     * Function Name            : handleShowMoreEventInfo
     * Purpose                  : To show more event information.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Oct 17, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * ------------------------- Updates to the function -------------------------
     */
    handleShowMoreEventInfo(event) {
        console.log("Inside handleShowMoreEventInfo");
        try {
            console.log("event -> " + JSON.stringify(event));
            console.log(event);
            console.log(event.target);
            console.log(event.target.id); 
            console.log("event.target.dataset.object -> " + JSON.stringify(event.target.dataset.object));
            let selectedEventId = event.target.dataset.object.split("/")[1];
            console.log("selectedEventId -> " +selectedEventId);

            let selectedEvent;
            if(this.showCalendar == true) {
                 // Loop through each week in the calendar
                this.calendar.forEach(week => {
                    // console.log('week -> ' + JSON.stringify(week));
                    week.days.forEach(day => {
                        // Check if the day has events
                        if (day.hasOwnProperty('events')) {
                            // Create a new array of events (immutably updating)
                            day.events = day.events.map(currentEvent => {
                                // Create a copy of the current event
                                let updatedEvent = Object.assign({}, currentEvent);

                                // If the event ID matches the selected event, mark it for more info display
                                if (updatedEvent.eventId == selectedEventId) {
                                    console.log(updatedEvent.eventId + " -> " + selectedEventId);
                                    updatedEvent.isShowMoreEventInfo = true;
                                    selectedEvent = updatedEvent;
                                } else {
                                    updatedEvent.isShowMoreEventInfo = false;
                                }
                                return updatedEvent; // Return the updated event for the new array
                            });
                        }
                    });
                });
            } else if(this.showCalendarDayView == true) {
                this.dayInfo.hourRowsInfo.forEach(currentHour => {
                    currentHour.events = currentHour.events.map(currentEvent => {
                        // Create a copy of the current event
                        let updatedEvent = Object.assign({}, currentEvent);

                        // If the event ID matches the selected event, mark it for more info display
                        if (updatedEvent.eventId == selectedEventId) {
                            console.log(updatedEvent.eventId + " -> " + selectedEventId);
                            updatedEvent.isShowMoreEventInfo = true;
                            selectedEvent = updatedEvent;
                        } else {
                            updatedEvent.isShowMoreEventInfo = false;
                        }
                        return updatedEvent; // Return the updated event for the new array

                    });
                });
            } else if(this.showCalendarWeekView == true) {
                this.weekViewCalendarData.forEach(currentDay => {
                    currentDay.dayInfo.hourRowsInfo.forEach(currentHour => {
                        currentHour.events = currentHour.events.map(currentEvent => {
                            // Create a copy of the current event
                            let updatedEvent = Object.assign({}, currentEvent);
    
                            // If the event ID matches the selected event, mark it for more info display
                            if (updatedEvent.eventId == selectedEventId) {
                                console.log(updatedEvent.eventId + " -> " + selectedEventId);
                                updatedEvent.isShowMoreEventInfo = true;
                                selectedEvent = updatedEvent;
                            } else {
                                updatedEvent.isShowMoreEventInfo = false;
                            }
                            return updatedEvent; // Return the updated event for the new array
    
                        });
                    });
                });
            }
           
            // this.loadMonthWeekDayTableCalanderView(this.showCalendar, this.showCalendarWeekView, this.showCalendarDayView);
            console.log("selectedEvent -> " + JSON.stringify(selectedEvent));
        } catch (error) {
            console.log("handleShowMoreEventInfo error -> " + error);
        }
    }

    /*
     * Function Name            : handleShowMoreEventInfoClose
     * Purpose                  : To close more event information.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Oct 17, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * ------------------------- Updates to the function -------------------------
     */
    handleShowMoreEventInfoClose() {
        if(this.showCalendar == true) {
            this.calendar.forEach(week => {
                // console.log('week -> ' + JSON.stringify(week));
                week.days.forEach(day => {
                    // Check if the day has events
                    if (day.hasOwnProperty('events')) {
                        // Create a new array of events (immutably updating)
                        day.events = day.events.map(currentEvent => {
                            // Create a copy of the current event
                            let updatedEvent = Object.assign({}, currentEvent);
                            if (updatedEvent.isShowMoreEventInfo) {
                                updatedEvent.isShowMoreEventInfo = false;
                            }
                            return updatedEvent; // Return the updated event for the new array
                        });
                    }
                });
            });
        } else if(this.showCalendarDayView == true) {

            this.dayInfo.hourRowsInfo.forEach(currentHour => {
                currentHour.events = currentHour.events.map(currentEvent => {
                    // Create a copy of the current event
                    let updatedEvent = Object.assign({}, currentEvent);
                    if (updatedEvent.isShowMoreEventInfo) {
                        updatedEvent.isShowMoreEventInfo = false;
                    }
                    return updatedEvent; // Return the updated event for the new array
                });
            });

        } else if(this.showCalendarWeekView == true) {
            this.weekViewCalendarData.forEach(currentDay => {
                currentDay.dayInfo.hourRowsInfo.forEach(currentHour => {
                    currentHour.events = currentHour.events.map(currentEvent => {
                        // Create a copy of the current event
                        let updatedEvent = Object.assign({}, currentEvent);
                        if (updatedEvent.isShowMoreEventInfo) {
                            updatedEvent.isShowMoreEventInfo = false;
                        }
                        return updatedEvent; // Return the updated event for the new array
                    });
                });
            });
        }
        
    }

    async handleEventRecordDeletion(event) {
        try {
            console.log("Inside handleEventRecordDeletion");
            console.log("Event -> " + JSON.stringify(event));
            console.log("event.detail -> " + JSON.stringify(event.detail));
            console.log("event.detail.message -> " + event.detail.message);
            console.log("event.detail.recordId ->" + event.detail.recordId);

            await deleteEventRecord({ eventRecordId: event.detail.recordId });

            await this.handleRefreshClick();

        } catch (error) {
            console.log("Error -> " + JSON.stringify(error));
        }
    }
}