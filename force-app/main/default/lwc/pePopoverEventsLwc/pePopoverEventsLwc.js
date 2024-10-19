import { LightningElement, track , api} from 'lwc';
export default class PePopoverEventsLwc extends LightningElement {

    @track popoverEventsData;
    @track top = 50;
    @track left = 50;
    @track setRenderCallback = false;
    @track dateInfo = '';

    @api eventsData;
    @api recordId;

    connectedCallback() {
        console.log('Inside PePopoverEventsLwc connectedCallback');
        console.log('this.eventsData -> ' + JSON.stringify(this.eventsData));
        console.log("this.eventsData.date -> " + new Date(this.eventsData.date.toString()).toDateString().split(' ')[1]);
        this.dateInfo = new Date(this.eventsData.date.toString()).toDateString().split(' ')[1] + " " + this.eventsData.number;
        console.log("this.dateInfo -> " + this.dateInfo);
    }

    get boxClass() { 
        return `background-color:white; top:${this.top - 280}px; left:${this.left}px`;
    }

    renderedCallback() {
        console.log("Inside PePopoverEventsLwc renderedCallback");
    }

    handlePopoverCloseButtonClick(){
        this.dispatchEvent(new CustomEvent('closepopover', {
            detail: {
                message: 'Closing the pop over'
            }
        }));
    }

    handleOpenEventRecord(event) {
        // this.handlePopoverCloseButtonClick();
        console.log("event-> " + JSON.stringify(event));


        console.log("event.target.dataset.object -> " + event.target.dataset.object);

        this.dispatchEvent(new CustomEvent('editeventrecord', {
            detail: {
                message: 'Editing the event record',
                recordId : event.target.dataset.object,
            }
        }));

    }
}