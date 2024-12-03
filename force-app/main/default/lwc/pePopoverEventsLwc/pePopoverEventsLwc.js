import { LightningElement, track , api} from 'lwc';
export default class PePopoverEventsLwc extends LightningElement {

    @track popoverEventsData;
    @track top = 50;
    @track left = 50;
    @track setRenderCallback = false;
    @track dateInfo = '';
    @track hiddenEventsList = [];

    @api eventsData;
    @api recordId;

    connectedCallback() {
        console.log('Inside PePopoverEventsLwc connectedCallback');
        console.log('this.eventsData -> ' + JSON.stringify(this.eventsData));
        this.hiddenEventsList = this.eventsData.events;
        console.log("this.eventsData.date -> " + new Date(this.eventsData.date.toString()).toDateString().split(' ')[1]);
        this.dateInfo = new Date(this.eventsData.date.toString()).toDateString().split(' ')[1] + " " + this.eventsData.number;
        console.log("this.dateInfo -> " + this.dateInfo);
    }

    get boxClass() { 
        console.log("this.left -> " + JSON.stringify(this.left));
        console.log("this.top -> " + JSON.stringify(this.top));
        return `background-color:white; top:${this.top - 280}px; left:${this.left}px`;
    }

    renderedCallback() {
        console.log("Inside PePopoverEventsLwc renderedCallback");
    }

    handlePopoverCloseButtonClick(){
        console.log("Inside PePopoverEventsLwc handlePopoverCloseButtonClick");
        try {
            this.dispatchEvent(new CustomEvent('closepopover', {
                detail: {
                    message: 'Closing the pop over',
                    dayInfo : new Date(this.eventsData.date)
                }
            }));
        } catch (error) {
            console.log("Error PePopoverEventsLwc -> " + JSON.stringify(error));
        }
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
            console.log("event.target.dataset.object -> " + JSON.stringify(event.target.dataset.object));
            let selectedEventId = event.target.dataset.object.split("/")[1];
            console.log("selectedEventId -> " +selectedEventId);
            let selectedEvent;

            // Use map to return a new array with updated event objects
            this.hiddenEventsList = this.hiddenEventsList.map(currentEvent => {
                // Create a copy of the current event
                let updatedEvent = Object.assign({}, currentEvent);

                // If the event ID matches the selected event, mark it for more info display
                if (updatedEvent.isShowEventRecord === false && updatedEvent.eventId === selectedEventId) {
                    console.log(updatedEvent.eventId + " -> " + selectedEventId);
                    updatedEvent.isShowMoreEventInfo = true;
                    selectedEvent = updatedEvent;
                } else {
                    updatedEvent.isShowMoreEventInfo = false;
                }

                return updatedEvent; // Return the updated event for the new array
            });
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
     * Dec 03, 2024              Chandra Sekhar Reddy Muthumula          Removed the undeclared variable as it is not useful
     * ------------------------- Updates to the function -------------------------
     */
    handleShowMoreEventInfoClose() {
        console.log("Inside handleShowMoreEventInfoClose");
        try {
            // Use map to return a new array with updated event objects
            this.hiddenEventsList = this.hiddenEventsList.map(currentEvent => {
                // Create a copy of the current event
                let updatedEvent = Object.assign({}, currentEvent);
                updatedEvent.isShowMoreEventInfo = false;
                return updatedEvent; // Return the updated event for the new array
            });
        } catch (error) {
            console.log("handleShowMoreEventInfo error -> " + error);
        }
    }

    /*
     * Function Name            : handleEditEventRecord
     * Purpose                  : To edit the selected event record.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Oct 17, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * Oct 17, 2024              Chandra Sekhar Reddy Muthumula           Added the function
     * Nov 18, 2024              Chandra Sekhar Reddy Muthumula           Closed the component once the event record is edited.
     * ------------------------- Updates to the function -------------------------
     */
    handleEditEventRecord(event) {
        try {
            console.log("Inside handleEditEventRecord ");
            console.log("event-> " + JSON.stringify(event));
            console.log("this.eventRecordId -> " + this.eventRecordId);

            this.dispatchEvent(new CustomEvent('editeventrecord', {
                detail: {
                    message: 'Editing the event record',
                    recordId : event.detail.recordId,
                }
            }));
            this.handlePopoverCloseButtonClick();
        } catch (error) {
            console.log("Inside handleEditEventRecord error -> " + JSON.stringify(error));
        }
    }

    /*
     * Function Name            : handleEventRecordDeletion
     * Purpose                  : To delete the selected event record.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Oct 17, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
     * ------------------------- Updates to the function -------------------------
     */
    handleEventRecordDeletion(event) {
        try {
            console.log("Inside handleDeleteEventRecord ");
            this.dispatchEvent(new CustomEvent('deleteeventrecord', {
                detail: {
                    message: 'Deleting the event record',
                    recordId : event.detail.recordId,
                }
            }));

        } catch(error) {
            console.log("Inside handleEditEventRecord error -> " + JSON.stringify(error));
        }
    }
}