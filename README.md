# Calendar App Documentation

## Overview
This is a Calendar App built using the Lightinig Web Component frame work. You can use this simple app to manage events of a record on which this app is placed.
Inspired from the existing salesforce calendar app and Webex features.

## Why Use This Component?

The components address the limitations the existing Salesforce calendar app of being put on a record page and veiwing all the scheduled events in a calendar view.

## Features of the app:
 1. Customize your events of the record using this calendar app.
 2. This can be placed and accessed on most of the record pages (listed below).
 3. You can create events with your customers. Move (prepone/postpone) them as needed.
 4. Experience multiple views of the calendar.

 <img width="1439" alt="image" src="https://github.com/user-attachments/assets/3b05bd40-0e73-4d0e-8680-c37f39364491" />
 
 <img width="1440" alt="image" src="https://github.com/user-attachments/assets/ff73f4a0-d017-4384-b850-80e65e793a49" />

 <img width="1440" alt="image" src="https://github.com/user-attachments/assets/e1b707c0-96b1-4b93-926a-071ea7182f62" />
 
 <img width="1440" alt="image" src="https://github.com/user-attachments/assets/3a0fc2ce-1d79-4752-8f36-09efe8fdc2cd" />
 
 <img width="1440" alt="image" src="https://github.com/user-attachments/assets/5ac23edf-738b-4271-a5be-76aeddaf1d96" />

 <img width="1440" alt="image" src="https://github.com/user-attachments/assets/a97540f2-e5ed-4bcc-ae45-30f7ecd6c67c" />
 
 <img width="1440" alt="image" src="https://github.com/user-attachments/assets/1c1bab32-1cbe-4c5d-b87d-eb838eedc9fb" />

 ##
 
## Record Pages on which this calendar can be placed on are listed below:

| **Column 1**          | **Column 2**             | **Column 3**               | **Column 4**                   | **Column 5**            |  
|------------------------|--------------------------|-----------------------------|---------------------------------|--------------------------|  
| Account                | Asset                   | Asset Relationship          | Bank Account                   | Campaign                |  
| Card                   | Case                    | Change Request              | Channel Program                | Channel Program Level   |  
| Communication Subscription Consent | Comment     | Contact Request             | Contract                       | Contract Line Item      |  
| Credit Memo            | Entitlement             | External Managed Account    | Image                          | Incident                |  
| Invoice                | Legal Entity            | List Email                  | Location                       | Opportunity             |  
| Order                  | Partner Fund Allocation | Partner Fund Claim          | Partner Fund Request           | Partner Marketing Budget|  
| Party Consent          | Privacy RTBF Request    | Process Exception           | Product                        | Problem                |  
| Rebate Payout Snapshot | Service Contract        | Solution                    | Transaction                    | Transaction Type        |  
| Web Cart Document      | Work Order              | Work Order Line Item        | Work Plan                      | Work Plan Template      |  
| Work Plan Template Entry | Work Step             | Work Step Template          |                                |                         |  

The above objects are taken from the existing 'Related To' (Api Name: WhatId) standard field of the Event object. 
 
No additional fields are created on Event object.


## Unmanaged Package Link: https://login.salesforce.com/packaging/installPackage.apexp?p0=04tWU0000004oe9


## Post Installation Steps:

1. Open any record page of the above listed objects. Click on Gear Icon > Edit page.
2. Create a new tab on the page and name it accordingly.
3. Search for 'pe_CalendarLwc' component in the search bar to the left and add it.
4. Save the lightning record page.

If needed, Enable 'Allow Users to Relate Multiple Contacts to Tasks and Events' from Activity Setting in Setup. Enabling this feature lets users relate up to 50 contacts to a task or event (except a recurring task or event).

Note: Once enabled this cannot be reverted back by any org user. To disable this feature, contact the salesforce.com Support team.

##

The `sfdx-project.json` file contains useful configuration information for your project. See [Salesforce DX Project Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm) in the _Salesforce DX Developer Guide_ for details about this file.

## Read All About It

- [Salesforce Extensions Documentation](https://developer.salesforce.com/tools/vscode/)
- [Salesforce CLI Setup Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm)
- [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm)
- [Salesforce CLI Command Reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm)
