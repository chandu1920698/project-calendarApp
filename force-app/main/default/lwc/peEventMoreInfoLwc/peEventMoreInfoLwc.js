import { LightningElement, track, wire, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class PeEventMoreInfoLwc extends NavigationMixin(LightningElement) {

    @api key;
    @api eventData;
    @api isShowCalendar;
    @api isShowCalanderDayView;
    @api isShowCalanderWeekView;
    @api isShowMoreInfoForHiddenEvent;

    @track eventRecordId;
    @track eventRecordUrl;
    @track eventStartTime;
    @track eventEndTime;
    @track childBoxClass = 'position: absolute; ';
    @track popoverNubbinClass = 'slds-popover ';
    @track mediaClassCss = 'slds-media slds-media_center slds-has-flexi-truncate ';

    connectedCallback() {
        console.log("Inside PeEventMoreInfoLwc connectedcallback");
        console.log("Key -> " + this.key);
        console.log("this.eventData -> " + JSON.stringify(this.eventData));
        this.eventRecordId = this.eventData.eventId;
        this.eventRecordUrl = this.eventData.eventUrl;
        console.log("this.eventRecordId -> " + this.eventRecordId);
        this.eventStartTime = this.convert24HrsTo12Hrs(this.eventData.startDateTime);
        this.eventEndTime = this.convert24HrsTo12Hrs(this.eventData.endDateTime);
        console.log("this.eventStartTime -> " + this.eventStartTime);
        console.log("this.eventEndTime -> " + this.eventEndTime);   

        console.log("this.isShowCalendar -> " + this.isShowCalendar);
        console.log("this.isShowMoreInfoForHiddenEvent -> " + this.isShowMoreInfoForHiddenEvent);
        console.log("this.isShowCalanderDayView -> " + this.isShowCalanderDayView);
        console.log("this.isShowCalanderWeekView -> " + this.isShowCalanderWeekView);

        if(this.isShowCalendar.toString() == 'true') {
            this.childBoxClass += 'top: -36px; left: 104%;';
            this.popoverNubbinClass += 'slds-nubbin_left-top';
            if(this.isShowMoreInfoForHiddenEvent.toString() == 'true') {
                this.mediaClassCss += ' slds-p-around_x-small';
            }
        } else if(this.isShowCalanderDayView.toString() == 'true') {
            this.childBoxClass += 'top: -0.25rem; left: -1rem;';
            this.popoverNubbinClass += 'slds-nubbin_top-left';
        } else if(this.isShowCalanderWeekView.toString() == 'true') {
            this.childBoxClass += 'top: -0.25rem; left: -1rem;';
            this.popoverNubbinClass += 'slds-nubbin_top-left';
        }

        console.log("this.childBoxClass -> " + this.childBoxClass);
        console.log("this.popoverNubbinClass -> " + this.popoverNubbinClass);
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


    /*
     * Function Name            : handleEditEventRecord
     * Purpose                  : To edit the selected event record.
     * Author Details           : Chandra Sekhar Reddy Muthumula
     * Created Date             : Oct 17, 2024
     * ------------------------- Updates to the function -------------------------
     * Modified Date             Modified By                             Changes
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
                    recordId : this.eventRecordId,
                }
            }));
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
    handleDeleteEventRecord(event) {
        try {
            console.log("Inside handleDeleteEventRecord ");
            console.log("event-> " + JSON.stringify(event));

            this.dispatchEvent(new CustomEvent('deleteeventrecord', {
                detail: {
                    message: 'Deleting the event record',
                    recordId : this.eventRecordId,
                }
            }));

        } catch(error) {
            console.log("Inside handleEditEventRecord error -> " + JSON.stringify(error));
        }
    }
}