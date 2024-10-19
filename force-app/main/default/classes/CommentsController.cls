public class CommentsController {
    @AuraEnabled(cacheable=false)
    public static String createCommentRecord(String commentText, Id relatedToID) {
        try {
            List<Comment__c > commentList = new List<Comment__c >();
            Comment__c  comment = new Comment__c ();
            comment.CommentText__c = commentText;
            comment.Related_To__c  = relatedToID;
        	commentList.add(comment);
            
            insert commentList;
            
            return 'Comment Saved@success@Saved your comment successfully';
        } catch (Exception ex) {
            return 'Opps !@error@ Could not save your comment';
        } finally {
            
        }
	}
    
    @AuraEnabled(cacheable=true)
    public static List<Comment__c> getCommentRecords(Id relatedToID) {
    	return [SELECT ID, Name, CommentText__c, CreatedDate FROM Comment__c WHERE Related_To__c  =: relatedToID ORDER BY CreatedDate DESC];

	}
    
    
    
    private class CommentWrapper {
        private String commentText;
        private Id relatedToId;
    }
}