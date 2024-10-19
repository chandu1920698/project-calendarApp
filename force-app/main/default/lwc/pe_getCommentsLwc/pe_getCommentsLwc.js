import { LightningElement, wire, track, api } from 'lwc';
import getCommentRecords from "@salesforce/apex/CommentsController.getCommentRecords";

const commetsTableColumns = [
    { label: 'Comment Name', fieldName: 'Name', editable: false },
    { label: 'Comment', fieldName: 'CommentText__c', type: 'text', editable: true },
    // { label: 'Phone', fieldName: 'phone', type: 'phone', editable: true },
    // { label: 'CloseAt', fieldName: 'closeAt', type: 'date', editable: true },
    // { label: 'Balance', fieldName: 'amount', type: 'currency', editable: true },
];

export default class Pe_getCommentsLwc extends LightningElement {

    @track commentTableData;
    @track commetsTableColumns = commetsTableColumns;
    @track commentsExists = false;
    @api recordId;

    connectedCallback() {
        alert('Pe_getCommentsLwc connectedCallback -> ' + this.recordId);
    }

    wiredCommentRecordsresult;
    @wire(getCommentRecords, { relatedToID : '$recordId'})
    wiredCommentRecords(result) {
        this.wiredCommentRecordsresult = result;
        if(result.data){
            this.commentTableData = result.data;
            if(this.commentTableData.length > 0) {
                this.commentsExists = true;
            } else {
                this.commentsExists = false;
            }
            this.error = undefined;
        }
        else if (result.error) {
            this.error = error;
        }
    }
}