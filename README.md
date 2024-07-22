# Verfassungsbooks
Verfassungsbooks is a platform to create (scientific) Books, Articles or whole Journals and exporting them as PDF, HTML or EPub.

The current alpha version is used at the [Verfassungsblog](https://verfassungsblog.de) to create our [Books](https://verfassungsblog.de/books) and [Journal "Verfassungsblatt"](https://verfassungsblog.de/blatt).

## Contact
Developer: [kd@verfassungsblog.de](mailto:kd@verfassungsblog.de)

General inquires and feedback: [oa@verfassungsblog.de](mailto:oa@verfassungsblog.de)

## Build Status
Master Branch: 
[![Master Branch](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/master.svg)](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/master?)

Staging Branch: [![Staging Branch](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/staging.svg)](https://builds.sr.ht/~verfassungsblog/Verfassungsbooks/commits/staging?)

## Build Instructions
0. Make sure that you have rustc, cargo and npm installed & in your path
1. Clone this repository
2. Install handlebars && tsc : ``npm install -g handlebars typescript``
3. cd into typescript & run ``npm install``
4. Build with cargo: ``cargo build``