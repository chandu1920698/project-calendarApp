import { LightningElement, wire, track, api } from 'lwc';
import saveComment from "@salesforce/apex/CommentsController.createCommentRecord";
import getCommentRecords from "@salesforce/apex/CommentsController.getCommentRecords";
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { CloseActionScreenEvent } from 'lightning/actions';
import LabelSaveYourComments from '@salesforce/label/c.projectE_SaveYourComments';

const commetsTableColumns = [
    { label: 'Comment Name', fieldName: 'Name', editable: false },
    { label: 'Comment', fieldName: 'CommentText__c', type: 'text', editable: true },
    // { label: 'Phone', fieldName: 'phone', type: 'phone', editable: true },
    // { label: 'CloseAt', fieldName: 'closeAt', type: 'date', editable: true },
    // { label: 'Balance', fieldName: 'amount', type: 'currency', editable: true },
];

export default class Pe_saveYourCommentsLwc extends LightningElement {
    LABLE = {
        LabelSaveYourComments
    };
    @api recordId;
    @track error;
    @track commentText = '';
    @track commentTableData;
    @track commetsTableColumns = commetsTableColumns;
    

    handleInputChange(event) {
        this.commentText = event.detail.value;
    }
    handleCloseCommentPopup() {
        this.commentText = '';
    }

    handleClearText() {
        this.commentText = '';
    }
    wiredCommentRecordsresult;
    @wire(getCommentRecords, { relatedToID : '$recordId'})
    wiredCommentRecords(result) {
        this.wiredCommentRecordsresult = result;
        if(result.data){
            // alert('37');
            console.log('37 -> ' + JSON.stringify(result.data));
            this.commentTableData = result.data;
            this.error = undefined;
        }
        else if (result.error) {
            this.error = error;
            // alert('42');
            console.log('42 -> ' + JSON.stringify(result.error));
        }
    }

    connectedCallback() {
        console.log('connectedCallback ->');
        console.log(this.commentData);

    }

    handleSaveComment() {
        console.log('23 this.commentText -> ' + this.commentText);
        if(this.commentText.length == 0 || this.commentText === "") {
            this.showToast('warning', 'Please enter your comment', "Opps !");
            return;
        }
        saveComment({commentText : this.commentText, relatedToID : this.recordId})
            .then((result) => {
                result = result.split('@');
                console.log('26 -> ' + result);
                console.log(result);
                this.refreshData(this.wiredCommentRecordsresult);
                this.showToast(result[1], result[0], result[2]);
                
            })
            .catch((error) => {
                this.error = error;
                console.log('30 -> ' + this.error);
                console.log(this.error);
            });
        this.commentText = '';
        this.dispatchEvent(new CloseActionScreenEvent());
    }

    handleInputFocus(event) {
        // modify parent to properly highlight visually
        const classList = event.target.parentNode.classList;
        classList.add('lgc-highlight');
    }

    handleInputBlur(event) {
        // modify parent to properly remove highlight
        const classList = event.target.parentNode.classList;
        classList.remove('lgc-highlight');
    }
    showToast(toastVariant, toastMessage, toastTitle) {
        const event = new ShowToastEvent({
            title: toastTitle,
            message: toastMessage,
            variant: toastVariant,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    refreshData(data) {
        alert('refresh apex start');
        return refreshApex(data);
    }
}