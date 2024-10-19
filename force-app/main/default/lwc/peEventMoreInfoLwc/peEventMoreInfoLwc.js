import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class PeEventMoreInfoLwc extends NavigationMixin(LightningElement) {

    @api key;
    @api eventData;
    @api top;
    @api left;

    @track eventRecordId;
    @track eventRecordUrl;

    connectedCallback() {
        console.log("Inside PeEventMoreInfoLwc connectedcallback");
        console.log("Key -> " + this.key);
        console.log("this.eventData -> " + JSON.stringify(this.eventData));
        this.eventRecordId = this.eventData.eventId;
        this.eventRecordUrl = this.eventData.eventUrl;
        console.log("this.eventRecordId -> " + this.eventRecordId);
    }

    get boxClass() { 
        console.log("this.left -> " + JSON.stringify(this.left));
        console.log("this.top -> " + JSON.stringify(this.top));
        return `background-color:white; top:${this.top - 280}px; left:${this.left}px`;
    }

    handleEventInfoCloseButtonClick(event){
        try {
            console.log("Inside handleEventInfoCloseButtonClick ");
            this.dispatchEvent(new CustomEvent('closeeventmoreinfo', {
                detail: {
                    message: 'Closing the pop over'
                }
            }));
        } catch (error) {
            console.log("Inside handleEventInfoCloseButtonClick error -> " + JSON.stringify(error));
        }
    }

    handleEditEventRecord(event) {
        try {
            console.log("Inside handleEditEventRecord ");
            console.log("event-> " + JSON.stringify(event));
            console.log("this.eventRecordId -> " + this.eventRecordId);

            this.dispatchEvent(new CustomEvent('editeventrecord', {
                detail: {
                    message: 'Editing the event record',
                    recordId : this.eventRecordId,
                }
            }));
        } catch (error) {
            console.log("Inside handleEditEventRecord error -> " + JSON.stringify(error));
        }
    }


}