public class OpportunityRelatedListController {
	@AuraEnabled
    public static List<Opportunity> getRelatedRecords(Id accountId) {
        return [
            SELECT Id, Name, Account.Name, AccountId, Amount, CloseDate, StageName 
            FROM Opportunity 
            WHERE AccountId = :accountId
        ];
    }
}