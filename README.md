# Calendar App Documentation

## Unmanaged Package Link:

## Overview
This is a Calendar App built using the Lightinig Web Component frame work. You can use this simple app to manage events of a record on which this app is placed.
Inspired from the existing salesforce calendar app and Webex features.

## Why Use This Component?

The components address the limitations of being put on a record page and seeing all the scheduled events in a calendar view.

## Features of the app:
 1. Customize your events of the record using this calendar app.
 2. This can be placed and accessed on most of the objects (listed below).
 3. You can create events with your customers. Move (prepone/postpone) them as needed.
 4. Experience multiple views of the calendar.
 
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


## Post Installation Steps:

1. Open any record of the above listed objects. Click on Gear Icon > Edit page.
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
