const timelineTX = {
  title:'Move to Texas',
  dateFrom:'2019-07-01', dateTo:'2023-08-15', 
  events:[
    { significance:4, label:'First Tour of Texas', dateFrom:'2017-06-23', dateTo:'2017-07-01', fadeLeft:'2017-06-24', fadeRight:'2017-06-30', color:'blue' },
    { significance:2, label:'Chi & Kim\'s anniversary', date:'2017-06-24' },
    { significance:1, label:'In San Antonio', date:'2017-06-26' },
    { significance:5, label:'Deciding to Move to Texas', dateFrom:'2019-11-02', dateTo:'2021-10-17', fadeLeft:'2021-04-30', fadeRight:'2021-10-16', color:'blue', colorRight:'green' },
    { significance:2, label:'Drove up to Bellingham and checked out Fairhaven', date:'2019-11-09' },
    { significance:1, label:'Mentioned to mom we would like to buy a house', date:'2019-11-10' },
    { significance:1, label:'First U.S. Coronavirus death at Evergreen Hospital in Kirkland', date:'2020-02-29' },
    { significance:1, label:'BLM protests, even in Bellevue', date:'2020-06-01' },
    { significance:1, label:'Savings and retirement topped $1.5m', date:'2020-06-05' },
    { significance:2, label:'Bought Buz', date:'2020-06-20' },
    { significance:4, label:'Road trip to Yellowstone', dateFrom:'2020-07-03', dateTo:'2020-07-11', fadeLeft:'2020-07-04', fadeRight:'2020-07-10', color:'green' },
    { significance:1, label:'Arrive at Aunt Carol\'s', date:'2020-07-06' },
    { significance:1, label:'Thought about retirement and moving', date:'2020-08-20' },
    { significance:1, label:'Planning to retire soon', date:'2020-09-25' },
    { significance:1, label:'Ended year at 94% of retirement goal', date:'2021-01-01' },
    { significance:1, label:'Savings and retirement topped $1.9m', date:'2021-01-09' },
    { significance:2, label:'Talked about retiring and moving with Lisa and Justin', date:'2021-01-17' },
    { significance:1, label:'End of the tunnel is in sight', date:'2021-01-22' },
    { significance:1, label:'Checked out Port Orchard and drove around the Kitsap Peninsula', date:'2021-03-26' },
    { significance:2, label:'Savings and retirement topped $2.0m', date:'2021-04-05' },
    { significance:1, label:'Anh accused me of being beholden to my family on decision to move', date:'2021-04-06' },
    { significance:1, label:'Went to Kitsap Mall in Silverdale, Poulsbo and Bainbridge Island', date:'2021-04-17' },
    { significance:1, label:'Dean resigned to remain in WA, and encouraged me to do so, too', date:'2021-04-30' },
    { significance:1, label:'Spoke to Kimberly - realtor in Dallas', date:'2021-05-02' },
    { significance:1, label:'Tin connected us with Deanna in San Antonio', date:'2021-05-04' },
    { significance:4, label:'Trip to see New Braunfels', dateFrom:'2021-06-05', dateTo:'2021-06-12', fadeLeft:'2021-06-06', fadeRight:'2021-06-11', color:'blue' },
    { significance:2, label:'Checked out Veramendi', date:'2021-06-07' },
    { significance:1, label:'South Padre Island', date:'2021-06-09' },
    { significance:1, label:'Moved $80k from brokerage account into checking account', date:'2021-06-15' },
    { significance:1, label:'Scott Felder not currently building new homes; I committed to the move', date:'2021-07-01' },
    { significance:1, label:'Spilled the beans about retiring and moving to the boys', date:'2021-07-24' },
    { significance:1, label:'Finished moving $120k into PNC account, anticipating down payment', date:'2021-08-20' },
    { significance:1, label:'Touched base with Kirk', date:'2021-08-29' },
    { significance:1, label:'Began planning exit from work', date:'2021-09-09' },
    { significance:2, label:'Checked out house in Bremerton', date:'2021-09-11' },
    { significance:1, label:'Began renting a 10\'x10\' storage unit', date:'2021-09-15' },
    { significance:1, label:'Received offer from Scott Felder to build a house in Veramendi', date:'2021-10-16' },
    { significance:5, label:'Preparing for the Move', dateFrom:'2021-10-17', dateTo:'2022-09-26', fadeLeft:'2021-10-18', fadeRight:'2022-09-25', colorLeft:'blue', color:'green', colorRight:'yellow' },
    { significance:2, label:'Finalized decision to move to TX; told mom, Dean; Anh began sorting', date:'2021-10-17' },
    { significance:1, label:'Told Chris my plans', date:'2021-10-18' },
    { significance:4, label:'Quick trip to San Antonio', dateFrom:'2021-11-14', dateTo:'2021-11-16', fadeLeft:'2021-11-15', fadeRight:'2021-11-15', color:'yellow' },
    { significance:2, label:'Design Center appointment', date:'2021-11-15' },
    { significance:1, label:'Officially resigned from work', date:'2021-12-17' },
    { significance:2, label:'Last day at work', date:'2021-12-28' },
    { significance:1, label:'Began selling furniture on Offer Up and Craigslist', date:'2022-01-19' },
    { significance:1, label:'Kenny Ripstra called - we have a start date', date:'2022-02-24' },
    { significance:2, label:'Scott Felder\'s start date', date:'2022-03-09' },
    { significance:4, label:'Flew to Texas again', dateFrom:'2022-03-13', dateTo:'2022-03-20', fadeLeft:'2022-03-14', fadeRight:'2022-03-19', color:'yellow' },
    { significance:1, label:'New Orleans', date:'2022-03-16' },
    { significance:2, label:'Pre-construction meeting', date:'2022-03-14' },
    { significance:2, label:'Sold both the Shoreline and Woodinville condos', date:'2022-05-17' },
    { significance:1, label:'Cleaned out the storage unit', date:'2022-06-14' },
    { significance:1, label:'Le moved into half-sister\'s house in Arlington', date:'2022-07-12' },
    { significance:1, label:'Packed our PODS storage unit ', date:'2022-07-20' },
    { significance:4, label:'Drove Lexi to Texas', dateFrom:'2022-07-29', dateTo:'2022-08-10', fadeLeft:'2022-07-30', fadeRight:'2022-08-09', color:'yellow' },
    { significance:1, label:'Aunt Carol\'s surgery', date:'2022-08-01' },
    { significance:2, label:'Pre-drywall walk-thru', date:'2022-08-04' },
    { significance:1, label:'First time attending Compass', date:'2022-08-07' },
    { significance:1, label:'Listed the Kirkland condo', date:'2022-08-24' },
    { significance:1, label:'Accepted offer for the Kirkland condo', date:'2022-08-31' },
    { significance:1, label:'Signed on the Kirkland condo', date:'2022-09-26' },
    { significance:5, label:'Drive to Texas', dateFrom:'2022-09-26', dateTo:'2022-10-01', fadeLeft:'2022-09-27', fadeRight:'2022-09-30', colorLeft:'green', color:'yellow', colorRight:'red' },
    { significance:1, label:'Arrived at our Tacara apartment', date:'2022-09-30' },
    { significance:5, label:'Living in Tacara apartment', dateFrom:'2022-10-01', dateTo:'2023-02-19', fadeLeft:'2022-10-02', fadeRight:'2023-02-16', colorLeft:'yellow', color:'red', colorRight:'blue' },
    { significance:1, label:'Anh started working at Pak-med', date:'2022-10-04' },
    { significance:1, label:'Anh quit Pak-med', date:'2022-10-14' },
    { significance:1, label:'Anh offered position at Christus', date:'2022-10-20' },
    { significance:2, label:'Moved into bigger, ground unit at Tacara', date:'2022-10-22' },
    { significance:1, label:'Countertops, doors, light fixtures, etc. in place at the house', date:'2022-11-05' },
    { significance:1, label:'Anh\'s first day working at Christus', date:'2022-11-07' },
    { significance:1, label:'Got TX license plates', date:'2022-11-09' },
    { significance:1, label:'Checked out Seguin', date:'2022-12-02' },
    { significance:2, label:'First time attending LifeGroup', date:'2022-12-06' },
    { significance:1, label:'Zoomed with Gina and Chris re: coming back for DTNA project', date:'2022-12-30' },
    { significance:1, label:'Got TX drivers license', date:'2023-01-03' },
    { significance:1, label:'Notified of closing date: 2/16', date:'2023-01-13' },
    { significance:1, label:'Landscaping done at the house', date:'2023-01-24' },
    { significance:1, label:'Le checked out Das Rec for the first time', date:'2023-01-27' },
    { significance:1, label:'Went through house with our inspector John Roff', date:'2023-02-06' },
    { significance:1, label:'Official walk-thru at the house', date:'2023-02-09' },
    { significance:3, label:'Closing/signing in San Antonio', date:'2023-02-16' },
    { significance:5, label:'Settling in and furnishing', dateFrom:'2023-02-19', dateTo:'2023-08-21', fadeLeft:'2023-02-22', fadeRight:'2023-06-01', colorLeft:'red', color:'blue' },
    { significance:1, label:'LifeGroup guys helped move stuff; first night spent in our house', date:'2023-02-19' },
    { significance:1, label:'The PODS unit delivered to the house', date:'2023-02-20' },
    { significance:1, label:'Water softener installed', date:'2023-02-24' },
    { significance:1, label:'King bed and office desk', date:'2023-02-28', color:'white' },
    { significance:1, label:'85" T.V. and freezer', date:'2023-03-01' },
    { significance:1, label:'Patio set', date:'2023-03-04' },
    { significance:1, label:'Anh\'s first day at Care Continuity', date:'2023-03-06' },
    { significance:1, label:'Dining room set, lawnmower', date:'2023-03-07' },
    { significance:1, label:'Couch', date:'2023-03-08' },
    { significance:1, label:'Blinds installed', date:'2023-03-13' },
    { significance:1, label:'Anh and Le got TX IDs', date:'2023-03-17' },
    { significance:2, label:'Front yard landscaped by Geiser and crew', date:'2023-05-15', color:'white' },
    { significance:1, label:'Met Renny and Rose', date:'2023-05-27' },
    { significance:4, label:'Swimming Pool', dateFrom:'2023-09-18', dateTo:'2023-10-21', fadeLeft:'2023-09-19', fadeRight:'2023-10-20', color:'green' },
    { significance:2, label:'Went to AquaMarine and agreed to buy a swimming pool', date:'2023-06-17' },
    { significance:1, label:'Workbench', date:'2023-07-14' },
    { significance:1, label:'Big credenza in the living room', date:'2023-08-09' },
    { significance:1, label:'Pool construction begins', date:'2023-09-19' },
    { significance:1, label:'Pool delivered and paid for', date:'2023-09-21' },
    { significance:2, label:'Pool and concrete pad finished', date:'2023-10-12' },
    { significance:1, label:'Pool School with Paul Hippo; back yard landscaping finished', date:'2023-10-20' },
  ]
}

const timelineAnh = {
  title:'Marriage to Anh',
  dateFrom:'2011-09-20', dateTo:'2013-03-16', 
  events:[
    //{ significance:6, label:'Rob and Anh', dateFrom:'2011-09-20', dateTo:'2025-09-25', fadeLeft:'2017-09-21', fadeRight:'2017-09-22', colorLeft:'green', color:'green', colorRight:'green' },
    { significance:5, label:'Dating', dateFrom:'2011-09-20', dateTo:'2012-10-27', fadeLeft:'2011-09-21', fadeRight:'2012-10-26', color:'green', colorRight:'yellow' },
    { significance:2, label:'First phone call', date:'2011-09-20' },
    { significance:3, label:'First date: Spaghetti Factory', date:'2011-09-21' },
    { significance:1, label:'Second date: Ixtapa and movie (Moneyball)', date:'2011-09-25' },
    { significance:1, label:'Anh comes to Rob\'s and makes dinner', date:'2011-09-28' },
    { significance:1, label:'Spend Saturday together', date:'2011-10-01' },
    { significance:1, label:'Spend another Saturday together', date:'2011-10-08' },
    { significance:4, label:'Rob flies to Chicago for work', dateFrom:'2011-11-14', dateTo:'2011-11-17', fadeLeft:'2011-11-15', fadeRight:'2011-11-16', color:'blue' },
    { significance:1, label:'Rob returns late from Chicago; Anh was there', date:'2011-11-17' },
    { significance:1, label:'Rob returns from airport to find Anh in his bed', date:'2011-11-27' },
    { significance:1, label:'Anh sells her Honda to Rob; Rob met Tin', date:'2011-12-05' },
    { significance:1, label:'First Christmas photo at Molbak\'s', date:'2011-12-17' },
    { significance:1, label:'Snowflake Lane in Bellevue together', date:'2011-12-23' },
    { significance:2, label:'Power outage incident', date:'2011-12-25' },
    { significance:1, label:'Rob tells his mom about Anh', date:'2011-12-29' },
    { significance:1, label:'Anh meets Lisa and family and paints Rob\'s bathroom', date:'2012-01-01' },
    { significance:1, label:'Anh shows Rob her old Bothell address', date:'2012-01-06' },
    { significance:1, label:'Anh meets Rob\'s friends at Tasha & Dona\'s house', date:'2012-01-14' },
    { significance:1, label:'Anh takes care of a sick Rob', date:'2012-01-18' },
    { significance:1, label:'Lunch at Noble Court in Bellevue and run into friends', date:'2012-01-21' },
    { significance:1, label:'Rob begins working in Portland for 2 weeks', date:'2012-01-23' },
    { significance:1, label:'Anh meets Leta at House of Hong', date:'2012-02-04' },
    { significance:1, label:'Anh joins Rob & Mom at the Macaroni Grill', date:'2012-02-11' },
    { significance:1, label:'Anh fills Rob\'s car with balloons for Valentine\'s Day', date:'2012-02-14' },
    { significance:1, label:'Anh\'s birthday: iPad and The Keg', date:'2012-02-22' },
    { significance:1, label:'Game night at Rob\'s friend Mike\'s house', date:'2012-02-25' },
    { significance:1, label:'Share Anh\'s fresh spring rolls with Lisa & family', date:'2012-03-11' },
    { significance:1, label:'Anh meets Dean', date:'2012-03-13' },
    { significance:1, label:'Anh meets Ryan & Heather at Apple Store', date:'2012-03-16' },
    { significance:1, label:'Rob plans to retire at 50 with $500-600k', date:'2012-03-18' },
    { significance:1, label:'Anh & Rob celebrate Justin\'s 50th', date:'2012-04-06' },
    { significance:1, label:'Anh attends Alderwood Church', date:'2012-04-08' },
    { significance:1, label:'Saturday together; Fremont Troll', date:'2012-04-14' },
    { significance:1, label:'Anh cuts Rob\'s hair', date:'2012-04-15' },
    { significance:1, label:'Anh interviews at Overlake', date:'2012-04-18' },
    { significance:2, label:'Tulip Festival', date:'2012-04-21' },
    { significance:1, label:'Wedding of Davi and Bob, and tour of Monroe', date:'2012-05-05' },
    { significance:1, label:'Fire in unit below Rob\'s', date:'2012-05-12' },
    { significance:4, label:'Rob in London', dateFrom:'2012-05-18', dateTo:'2012-05-27', fadeLeft:'2012-05-19', fadeRight:'2012-05-26', color:'red' },
    { significance:2, label:'Rob tells David about Anh', date:'2012-05-19' },
    { significance:1, label:'Anh goes to Folk Life with Rob\'s mom', date:'2012-05-26' },
    { significance:1, label:'Rob meets Tin\'s family at Carter\'s 6th birthday', date:'2012-06-08' },
    { significance:1, label:'Anh & Rob celebrate Jake\'s 6th birthday', date:'2012-06-10' },
    { significance:1, label:'Rob notes that Anh keeps biting his butt', date:'2012-06-12' },
    { significance:1, label:'Rob begins working in San Mateo', date:'2012-06-17' },
    { significance:1, label:'Rob sees Anh\'s storage unit', date:'2012-06-30' },
    { significance:1, label:'Anh & Rob celebrate Brooke\'s birthday', date:'2012-07-15' },
    { significance:2, label:'Rob and Anh go to Victoria on the Clipper', date:'2012-07-20' },
    { significance:1, label:'Rob back in Portland for work', date:'2012-07-22' },
    { significance:1, label:'Rob takes train back from Portland', date:'2012-07-24' },
    { significance:1, label:'Rob and Anh share an evening in Seattle', date:'2012-08-03' },
    { significance:1, label:'Anh rear-ended while Rob is in CA', date:'2012-08-16' },
    { significance:1, label:'Rob celebrates his birthday with Anh and Lisa\'s family', date:'2012-08-18' },
    { significance:1, label:'Anh gives Rob\'s mom a birthday gift', date:'2012-09-03' },
    { significance:1, label:'Anh made Vietnamese food for Rob\'s family', date:'2012-09-06' },
    { significance:2, label:'Rob\'s mom makes Anh uncomfortable with questions', date:'2012-09-07' },
    { significance:1, label:'Rob & Anh picked blackberries with Lisa and family', date:'2012-09-16' },
    { significance:1, label:'Rob & Anh get portrait taken at the mall', date:'2012-09-22' },
    { significance:1, label:'Rob & Anh buy iPhone 5s together', date:'2012-10-05' },
    { significance:1, label:'Anh takes Rob\'s mom to outlet mall', date:'2012-10-06' },
    { significance:1, label:'Rob tells his mom he\'ll marry Anh soon', date:'2012-10-11' },
    { significance:5, label:'Engaged', dateFrom:'2012-10-27', dateTo:'2012-12-12', fadeLeft:'2012-10-28', fadeRight:'2012-12-11', colorLeft:'green', color:'yellow', colorRight:'blue' },
    { significance:3, label:'Rob proposes to Anh and she says Yes', date:'2012-10-27' },
    { significance:1, label:'Rob tells family the good news', date:'2012-10-28' },
    { significance:1, label:'Got loan preapproval from Tin\'s bank', date:'2012-11-02' },
    { significance:1, label:'Rob discusses wedding with Pastor Fred', date:'2012-11-06' },
    { significance:1, label:'Rob contacts Frank Blau for photography', date:'2012-11-07' },
    { significance:1, label:'Arranged wedding cake', date:'2012-11-09' },
    { significance:1, label:'Made offer on the Bothell townhouse', date:'2012-11-10' },
    { significance:1, label:'Met with manager of Arnie\'s', date:'2012-11-15' },
    { significance:1, label:'Rob starts working at BD&A', date:'2012-11-16' },
    { significance:1, label:'Anh introduces Rob to the Wendells', date:'2012-11-18' },
    { significance:1, label:'Rob goes to Alaska for Thanksgiving', date:'2012-11-21' },
    { significance:2, label:'Get marriage license in Bothell', date:'2012-11-27' },
    { significance:1, label:'Rob gives Anh\'s car a jump at Overlake in Issaquah', date:'2012-11-29' },
    { significance:1, label:'Bank won\'t lend on Bothell townhouse', date:'2012-11-30' },
    { significance:1, label:'Rob exhanges texts with Aaron', date:'2012-12-02' },
    { significance:1, label:'Dean flies in from London', date:'2012-12-08' },
    { significance:4, label:'Entertaining wedding guests', dateFrom:'2012-12-09', dateTo:'2012-12-16', fadeLeft:'2012-12-10', fadeRight:'2012-12-15', color:'red' },
    { significance:1, label:'Parents arrive', date:'2012-12-09' },
    { significance:1, label:'Big dinner at Buca de Beppo', date:'2012-12-10' },
    { significance:2, label:'The Boys appear, surprising Rob', date:'2012-12-11' },
    //{ significance:5, label:'Married life', dateFrom:'2012-12-12', dateTo:'2025-09-25', fadeLeft:'2012-12-13', fadeRight:'2025-09-25', colorLeft:'yellow', color:'blue' },
    { significance:3, label:'Rob and Anh get married', date:'2012-12-12' },
    { significance:1, label:'Visiting and midnight showing of "The Hobbit"', date:'2012-12-13' },
    { significance:1, label:'Rescinded offer on the Bothell townhouse', date:'2012-12-14' },
    { significance:1, label:'Anh\'s parents fly home', date:'2012-12-16' },
    { significance:2, label:'Anh moves into the Shoreline condo', date:'2013-01-01' },
    { significance:1, label:'Open joint account at BECU', date:'2013-01-12' },
    { significance:1, label:'Make offer of $225k on Kirkland condo', date:'2013-01-19' },
    { significance:1, label:'Offer of $238k accepted on Kirkland condo', date:'2013-01-23' },
    { significance:1, label:'Pack up the Shoreline condo', date:'2013-02-02' },
    { significance:4, label:'Living in Lynnwood hotel', dateFrom:'2013-02-10', dateTo:'2013-03-16', fadeLeft:'2013-02-11', fadeRight:'2013-03-15', color:'red' },
    { significance:1, label:'Meet Frank at concert in Ballard', date:'2013-02-22' },
    { significance:1, label:'Celebrate Tin\'s 40th at Tables in Mill Creek', date:'2013-03-09' },
    { significance:1, label:'Sign closing docs on the Kirkland condo', date:'2013-03-13' },
    { significance:2, label:'Move out of hotel into the Kirkland condo', date:'2013-03-16' },
    { significance:4, label:'Fly to Florida', dateFrom:'2013-05-31', dateTo:'2013-06-05', fadeLeft:'2013-06-01', fadeRight:'2013-06-04', color:'yellow' },
    { significance:2, label:'First anniversary', date:'2013-12-12' },
    { significance:2, label:'Tony\'s 75th birthday', date:'2013-06-02' },
    { significance:4, label:'Honeymoon', dateFrom:'2014-05-02', dateTo:'2014-05-12', fadeLeft:'2014-05-03', fadeRight:'2014-05-11', color:'green' },
    { significance:3, label:'Arrive in Rome', date:'2014-05-02' },
    { significance:3, label:'10th Anniversary', date:'2022-12-12' }
  ]
}

const timelineRob = {
  title:'Life of Rob Innes',
  dateFrom:'1969-08-06', dateTo:'2025-10-14', 
  events:[
    { significance:6, label:'Childhood', dateFrom:'1969-08-06', dateTo:'1981-08-06', fadeRight:'1980-07-23', color:'blue', colorRight:'green' },
    { significance:6, label:'The Boys', dateFrom:'1981-08-06', dateTo:'1987-09-01', fadeLeft:'1982-08-06', fadeRight:'1987-08-01', colorLeft:'blue', color:'green', colorRight:'yellow' },
    { significance:6, label:'Rock \'n\' Roll', dateFrom:'1987-09-01', dateTo:'1997-01-01', fadeLeft:'1988-11-01', fadeRight:'1996-08-31', colorLeft:'green', color:'yellow', colorRight:'orange' },
    { significance:6, label:'Career as a Programmer', dateFrom:'1997-01-01', dateTo:'2006-06-30', fadeLeft:'1997-07-28', fadeRight:'2005-06-01', colorLeft:'yellow', color:'orange', colorRight:'red' },
    { significance:6, label:'World of Warcraft', dateFrom:'2006-06-30', dateTo:'2012-10-27', fadeLeft:'2007-04-15', fadeRight:'2011-09-20', colorLeft:'orange', color:'red', colorRight:'purple' },
    { significance:6, label:'Married Life', dateFrom:'2012-10-27', dateTo:'2025-10-14', fadeLeft:'2012-12-12', colorLeft:'red', color:'purple' },
    { significance:3, label:'Born in Seward, AK', date:'1969-08-06' },
    { significance:3, label:'Dad died', date:'1980-05-27' },
    { significance:3, label:'Met Dean Carignan', date:'1980-07-23' },
    { significance:2, label:'Mom married Bo Bennett', date:'1983-04-04' },
    { significance:3, label:'Graduate high school', date:'1987-05-21' },
    { significance:3, label:'First concert', date:'1988-01-30' },
    { significance:2, label:'Took Lisa to Butthole Surfers concert', date:'1988-10-28' },
    { significance:2, label:'First Lollapalooza', date:'1991-08-28' },
    { significance:3, label:'First journal entry', date:'1992-12-02' },
    { significance:2, label:'Bought first PC', date:'1995-02-28' },
    { significance:2, label:'First day at IPC', date:'1997-04-21' },
    { significance:3, label:'Offered programming job at IPC', date:'1997-07-28' },
    { significance:2, label:'Opened brokerage account', date:'1999-05-28' },
    { significance:3, label:'Bought World of Warcraft', date:'2005-07-26' },
    { significance:3, label:'Marriage to Anh', date:'2012-12-12' },
    { significance:3, label:'Move to Texas', date:'2022-09-30' },
    { significance:3, label:'Retired', date:'2021-12-28' }
  ]
}


const eventsIS = [
  { significance:6, label:'Pre-State: Zionist Movement & British Mandate', dateFrom:'1897-08-29', dateTo:'1948-05-14', fadeLeft:'1920-01-15', fadeRight:'1948-05-14', color:'blue' },
  { significance:6, label:'David Ben-Gurion (I)', dateFrom:'1948-05-14', dateTo:'1953-12-07', color:'green' },
  { significance:6, label:'Moshe Sharett', dateFrom:'1953-12-07', dateTo:'1955-11-03', color:'yellow' },
  { significance:6, label:'David Ben-Gurion (II)', dateFrom:'1955-11-03', dateTo:'1963-06-26', color:'green' },
  { significance:6, label:'Levi Eshkol', dateFrom:'1963-06-26', dateTo:'1969-03-17', fadeRight:'1969-02-26', color:'blue', colorRight:'yellow' },
  { significance:5, label:'Yigal Allon (acting PM)', dateFrom:'1969-02-26', dateTo:'1969-03-17', fadeLeft:'1969-03-01', fadeRight:'1969-03-12', color:'green' },
  { significance:6, label:'Golda Meir', dateFrom:'1969-03-17', dateTo:'1974-06-03', color:'yellow' },
  { significance:6, label:'Yitzhak Rabin (I)', dateFrom:'1974-06-03', dateTo:'1977-06-21', fadeRight:'1977-04-22', color:'green', colorRight:'yellow' },
  { significance:2, label:'Shimon Peres (acting PM)', date:'1977-04-22' },
  { significance:6, label:'Menachem Begin', dateFrom:'1977-06-21', dateTo:'1983-10-10', color:'yellow' },
  { significance:6, label:'Yitzhak Shamir (I)', dateFrom:'1983-10-10', dateTo:'1984-09-13', color:'blue' },
  { significance:6, label:'Shimon Peres', dateFrom:'1984-09-13', dateTo:'1986-10-20', color:'purple' },
  { significance:6, label:'Yitzhak Shamir (II)', dateFrom:'1986-10-20', dateTo:'1992-07-13', color:'blue' },
  { significance:6, label:'Yitzhak Rabin (II)', dateFrom:'1992-07-13', dateTo:'1995-11-04', color:'green' },
  { significance:2, label:'Shimon Peres PM', date:'1995-11-22' },
  { significance:6, label:'Shimon Peres', dateFrom:'1995-11-04', dateTo:'1996-06-18', fadeLeft:'1995-11-22', color:'purple' },
  { significance:6, label:'Benjamin Netanyahu (I)', dateFrom:'1996-06-18', dateTo:'1999-07-06', color:'blue' },
  { significance:6, label:'Ehud Barak', dateFrom:'1999-07-06', dateTo:'2001-03-07', color:'green' },
  { significance:6, label:'Ariel Sharon', dateFrom:'2001-03-07', dateTo:'2006-01-04', color:'yellow' },
  { significance:2, label:'Ehud Olmert PM', date:'2006-04-14' },
  { significance:6, label:'Ehud Olmert', dateFrom:'2006-01-04', dateTo:'2009-03-31', fadeLeft:'2006-04-14', fadeRight:'2009-03-31', colorLeft:'yellow', color:'purple' },
  { significance:6, label:'Benjamin Netanyahu (II)', dateFrom:'2009-03-31', dateTo:'2021-06-13', color:'blue' },
  { significance:6, label:'Naftali Bennett', dateFrom:'2021-06-13', dateTo:'2022-06-30', color:'yellow' },
  { significance:6, label:'Yair Lapid', dateFrom:'2022-07-01', dateTo:'2022-12-29', color:'green' },
  { significance:6, label:'Benjamin Netanyahu (III)', dateFrom:'2022-12-29', dateTo:'2025-09-26', color:'blue' },
  { significance:3, label:'First Zionist Congress (Basel)', dateFrom:'8/9/1897', dateTo:'8/31/1897', fadeLeft:'8/15/1897', fadeRight:'8/25/1897' },
  { significance:3, label:'Balfour Declaration', date:'1917-11-02' },
  { significance:3, label:'San Remo Conference assigns Mandate to Britain', date:'1920-04-25' },
  { significance:3, label:'League of Nations Mandate for Palestine approved', date:'1922-07-24' },
  { significance:3, label:'British Mandate enters into force', date:'1923-09-29' },
  { significance:5, label:'Arab Revolt in Palestine', dateFrom:'1936-04-19', dateTo:'1939-10-01', fadeLeft:'1936-08-19', fadeRight:'1939-06-01', color:'green' },
  { significance:3, label:'British White Paper limits Jewish immigration', date:'1939-05-17' },
  { significance:3, label:'King David Hotel bombing', date:'1946-07-22' },
  { significance:3, label:'UN Partition Plan (GA 181)', date:'1947-11-29' },
  { significance:3, label:'Israeli Declaration of Independence', date:'1948-05-14' },
  { significance:5, label:'1948 Arab-Israeli War', dateFrom:'1948-05-15', dateTo:'1949-07-20', fadeLeft:'1948-05-15', fadeRight:'1949-02-24', color:'red' },
  { significance:4, label:'Rhodes Armistice Agreements', dateFrom:'1949-02-24', dateTo:'1949-07-20' },
  { significance:3, label:'Israel admitted to United Nations', date:'1949-05-11' },
  { significance:2, label:'Luxembourg Reparations Agreement with West Germany', date:'1952-09-10' },
  { significance:3, label:'Law of Return enacted', date:'1950-07-05' },
  { significance:5, label:'Suez Crisis / Operation Kadesh', dateFrom:'1956-10-29', dateTo:'1957-03-07', fadeLeft:'1956-11-29', fadeRight:'1957-02-07', color:'yellow' },
  { significance:3, label:'Eichmann capture in Argentina', date:'1960-05-11' },
  { significance:5, label:'Eichmann trial', dateFrom:'1961-04-11', dateTo:'1962-06-01', fadeLeft:'1961-09-11', color:'yellow' },
  { significance:3, label:'Eichmann execution', date:'1962-06-01' },
  { significance:2, label:'Dimona nuclear reactor publicly acknowledged', date:'1960-12-21' },
  { significance:3, label:'Palestine Liberation Organization founded', date:'1964-05-28' },
  { significance:5, label:'Six-Day War', dateFrom:'1967-06-05', dateTo:'1967-06-10', fadeLeft:'1967-06-06', fadeRight:'1967-06-09', color:'red' },
  { significance:2, label:'Jerusalem reunification (IDF enters Old City)', date:'1967-06-07' },
  { significance:3, label:'Yom Kippur War', dateFrom:'1973-10-06', dateTo:'1973-10-25', fadeLeft:'1973-10-11', fadeRight:'1973-10-20' },
  { significance:3, label:'Camp David Accords', date:'1978-09-17' },
  { significance:3, label:'Egypt-Israel Peace Treaty', date:'1979-03-26' },
  { significance:3, label:'Jerusalem Law (Basic Law)', date:'1980-07-30' },
  { significance:3, label:'Operation Opera strikes Iraqi Osirak reactor', date:'1981-06-07' },
  { significance:5, label:'First Lebanon War (invasion phase)', dateFrom:'1982-06-06', dateTo:'1982-08-30', fadeLeft:'1982-06-21', fadeRight:'1982-08-15', color:'red' },
  { significance:3, label:'Sabra and Shatila massacre', dateFrom:'1982-09-16', dateTo:'1982-09-18' },
  { significance:5, label:'Operation Moses airlift of Ethiopian Jews', dateFrom:'1984-11-21', dateTo:'1985-01-05', fadeLeft:'1984-12-01', fadeRight:'1984-12-25', color:'yellow' },
  { significance:5, label:'First Intifada', dateFrom:'1987-12-09', dateTo:'1993-09-13', fadeLeft:'1988-01-09', fadeRight:'1993-08-13', color:'red' },
  { significance:4, label:'Gulf War Scud attacks on Israel', dateFrom:'1991-01-18', dateTo:'1991-02-25', fadeLeft:'1991-01-28', fadeRight:'1991-02-15', color:'yellow' },
  { significance:3, label:'Operation Solomon airlift of Ethiopian Jews', dateFrom:'1991-05-24', dateTo:'1991-05-25' },
  { significance:3, label:'Madrid Peace Conference', dateFrom:'1991-10-30', dateTo:'1991-11-01' },
  { significance:3, label:'Oslo I Accord (Declaration of Principles)', date:'1993-09-13' },
  { significance:3, label:'Israel-Jordan Peace Treaty (Wadi Araba)', date:'1994-10-26' },
  { significance:3, label:'Oslo II Accord', date:'1995-09-28' },
  { significance:3, label:'Assassination of PM Yitzhak Rabin', date:'1995-11-04' },
  { significance:3, label:'Hebron Protocol', date:'1997-01-15' },
  { significance:3, label:'Wye River Memorandum', date:'1998-10-23' },
  { significance:3, label:'IDF withdrawal from southern Lebanon', date:'2000-05-24' },
  { significance:3, label:'Camp David Summit (final-status talks)', dateFrom:'2000-07-11', dateTo:'2000-07-25', fadeLeft:'2000-07-15', fadeRight:'2000-07-21', color:'blue' },
  { significance:5, label:'Second Intifada', dateFrom:'2000-09-28', dateTo:'2005-02-08', fadeLeft:'2000-10-28', fadeRight:'2005-01-08', color:'red' },
  { significance:4, label:'Operation Defensive Shield (West Bank)', dateFrom:'2002-03-29', dateTo:'2002-05-10', fadeLeft:'2002-04-04', fadeRight:'2002-05-05', color:'red' },
  { significance:3, label:'West Bank barrier construction begins', date:'2002-06-16' },
  { significance:5, label:'Gaza Disengagement', dateFrom:'2005-08-15', dateTo:'2005-09-12', fadeLeft:'2005-08-20', fadeRight:'2005-09-07', color:'green' },
  { significance:5, label:'Second Lebanon War', dateFrom:'2006-07-12', dateTo:'2006-08-14', fadeLeft:'2006-07-17', fadeRight:'2006-08-09', color:'red' },
  { significance:3, label:'Hamas takeover of Gaza', dateFrom:'2007-06-14', dateTo:'2007-06-15' },
  { significance:5, label:'Operation Cast Lead (Gaza)', dateFrom:'2008-12-27', dateTo:'2009-01-18', fadeLeft:'2009-01-02', fadeRight:'2009-01-13', color:'red' },
  { significance:3, label:'Gaza flotilla raid', date:'2010-05-31' },
  { significance:5, label:'Operation Pillar of Defense (Gaza)', dateFrom:'2012-11-14', dateTo:'2012-11-21', fadeLeft:'2012-11-16', fadeRight:'2012-11-19', color:'red' },
  { significance:5, label:'Operation Protective Edge (Gaza)', dateFrom:'2014-07-08', dateTo:'2014-08-26', fadeLeft:'2014-07-13', fadeRight:'2014-08-21', color:'red' },
  { significance:3, label:'US Embassy moves to Jerusalem', date:'2018-05-14' },
  { significance:2, label:'Basic Law: Nation-State of the Jewish People', date:'2018-07-19' },
  { significance:5, label:'Operation Guardian of the Walls (Gaza)', dateFrom:'2021-05-10', dateTo:'2021-05-21', fadeLeft:'2021-05-12', fadeRight:'2021-05-19', color:'red' },
  { significance:5, label:'Abraham Accords normalization (UAE/Bahrain/Morocco)', dateFrom:'2020-09-15', dateTo:'2020-12-10', fadeLeft:'2020-09-30', fadeRight:'2020-11-25', color:'green' },
  { significance:3, label:'Israel-Lebanon maritime border agreement', date:'2022-10-27' },
  { significance:4, label:'Judicial overhaul protests in Israel', dateFrom:'2023-01-07', dateTo:'2023-12-31', fadeLeft:'2023-02-07', fadeRight:'2023-11-30', color:'yellow' },
  { significance:5, label:'Operation Shield and Arrow (Gaza vs PIJ)', dateFrom:'2023-05-09', dateTo:'2023-05-13', fadeLeft:'2023-05-10', fadeRight:'2023-05-12', color:'red' },
  { significance:3, label:'Oct 7th Hamas Attack', date:'2023-10-07' },
  { significance:5, label:'Israel-Hamas War', dateFrom:'2023-10-07', dateTo:'2025-09-26', fadeLeft:'2023-10-15', fadeRight:'2025-09-26', color:'red' },
  { significance:5, label:'Hostage-prisoner pause and exchanges', dateFrom:'2023-11-24', dateTo:'2023-11-30', color:'black' },
  { significance:3, label:'Iran direct attack with drones and missiles', date:'2024-04-14' },
  { significance:2, label:'Hezbollah pager attack', dateFrom:'2024-09-17', dateTo:'2024-09-18' }
];

const eventsMOM = [
  { significance:3, label:'Born in Orlando, FL', date:'1942-09-17' },
  { significance:6, label:'Orlando, FL', dateFrom:'1942-09-17', dateTo:'1943-03-15', fadeLeft:'1942-09-17', fadeRight:'1943-01-15', color:'yellow', colorRight:'green' },
  { significance:6, label:'Denver, CO', dateFrom:'1943-03-16', dateTo:'1945-06-15', fadeLeft:'1943-05-15', fadeRight:'1945-03-15', colorLeft:'yellow', color:'green', colorRight:'blue' },
  { significance:3, label:'Sister Sandy born', date:'1944-10-05' },
  { significance:6, label:'Seymore Texas (farm)', dateFrom:'1945-06-16', dateTo:'1957-12-31', fadeLeft:'1945-09-30', fadeRight:'1957-12-01', colorLeft:'green', color:'blue', colorRight:'yellow' },
  { significance:6, label:'Iowa Park', dateFrom:'1958-01-01', dateTo:'1960-06-15', fadeLeft:'1958-01-31', fadeRight:'1960-01-01', colorLeft:'blue', color:'yellow', colorRight:'red' },
  { significance:6, label:'Alamosa', dateFrom:'1960-06-15', dateTo:'1962-06-15', fadeLeft:'1960-11-15', fadeRight:'1962-02-15', colorLeft:'yellow', color:'red', colorRight:'purple' },
  { significance:3, label:'Graduated High School', dateFrom:'1961-05-01', dateTo:'1961-05-30', fadeLeft:'1961-05-10', fadeRight:'1961-05-20' },
  { significance:6, label:'Colorado Springs', dateFrom:'1962-06-16', dateTo:'1964-05-15', fadeLeft:'1962-09-15', fadeRight:'1964-05-01', colorLeft:'red', color:'purple', colorRight:'blue' },
  { significance:5, label:'Dating Bob Innes', dateFrom:'1962-06-15', dateTo:'1964-07-23', fadeLeft:'1962-06-30', fadeRight:'1964-07-23', color:'yellow' },
  { significance:6, label:'Huntington Beach', dateFrom:'1964-05-16', dateTo:'1964-07-15', fadeLeft:'1964-05-30', fadeRight:'1964-07-01', colorLeft:'purple', color:'blue', colorRight:'green' },
  { significance:4, label:'Move to Alaska', dateFrom:'1964-07-01', dateTo:'1964-07-23', fadeLeft:'1964-07-08', fadeRight:'1964-07-15', color:'green' },
  { significance:6, label:'Anchorage', dateFrom:'1964-07-16', dateTo:'1966-06-15', fadeLeft:'1964-07-30', fadeRight:'1966-03-01', colorLeft:'blue', color:'green', colorRight:'yellow' },
  { significance:3, label:'Married Bob', date:'1964-07-23' },
  { significance:6, label:'Valdez', dateFrom:'1966-06-15', dateTo:'1967-06-15', fadeLeft:'1966-09-01', fadeRight:'1967-03-01', colorLeft:'green', color:'yellow', colorRight:'red' },
  { significance:6, label:'Kenai - Beaver Loop', dateFrom:'1967-06-16', dateTo:'1974-06-16', fadeLeft:'1967-12-15', fadeRight:'1974-01-15', colorLeft:'yellow', color:'red', colorRight:'purple' },
  { significance:3, label:'Birth of son Rob', date:'1969-08-06' },
  { significance:3, label:'Birth of daughter Lisa', date:'1971-02-03' },
  { significance:3, label:'Birth of son Scott', date:'1973-04-14' },
  { significance:6, label:'Strawberry Road', dateFrom:'1974-06-17', dateTo:'2025-09-29', fadeLeft:'1974-08-30', fadeRight:'2025-09-29', colorLeft:'red', color:'purple' },
  { significance:3, label:'Husband Bob dies', date:'1980-05-27' },
  { significance:5, label:'Marriage to Bo', dateFrom:'1983-04-04', dateTo:'1987-12-31', fadeLeft:'1983-04-04', fadeRight:'1985-09-30', color:'red' },
  { significance:2, label:'Wedding', date:'1983-04-04' },
  { significance:4, label:'McKinley Park', dateFrom:'1983-06-10', dateTo:'1983-08-20', fadeLeft:'1983-06-20', fadeRight:'1983-08-10', color:'green' },
  { significance:5, label:'Marriage to Richard', dateFrom:'1989-10-15', dateTo:'1991-02-15', fadeLeft:'1990-01-15', fadeRight:'1990-11-15', color:'red' },
  { significance:2, label:'20 year high school reunion', dateFrom:'1981-05-01', dateTo:'1981-05-30', fadeLeft:'1981-05-10', fadeRight:'1981-05-20' },
  { significance:5, label:'Trip to Machu Picchu', dateFrom:'2001-08-27', dateTo:'2001-09-07', color:'yellow' },
  { significance:2, label:'Sister Sandy died at 30', dateFrom:'1975-01-01', dateTo:'1975-01-31', fadeLeft:'1975-01-10', fadeRight:'1975-01-20' },
  { significance:5, label:'Barstow, CA', dateFrom:'1965-01-15', dateTo:'1965-05-15', fadeLeft:'1965-01-31', fadeRight:'1965-05-01', color:'yellow' },
  { significance:4, label:'Inca Trail trek', dateFrom:'2001-09-03', dateTo:'2001-09-06', color:'blue' },
  { significance:1, label:'Fly to Cuzco', date:'2001-08-30' },
  { significance:2, label:'Explore Machu Picchu ruins', date:'2001-09-06' },
  { significance:2, label:'Passed through SeaTac airport', date:'1983-03-25' },
  { significance:2, label:'Visited Rob at SeaTac', date:'1993-03-29' },
  { significance:5, label:'Trip to see relatives', dateFrom:'1993-07-08', dateTo:'1993-07-24', color:'green' },
  { significance:4, label:'Staying in Seattle with Rob', dateFrom:'1993-07-08', dateTo:'1993-07-10', color:'yellow' },
  { significance:4, label:'Back at Rob\'s in Seattle', dateFrom:'1993-07-20', dateTo:'1993-07-24', color:'yellow' },
  { significance:5, label:'Visit Rob in Seattle', dateFrom:'1993-10-27', dateTo:'1993-10-28', color:'green' },
  { significance:2, label:'Christmas at home with the whole family', date:'1993-12-25' },
  { significance:5, label:'Visit Rob in Seattle', dateFrom:'1994-08-26', dateTo:'1994-09-06', color:'green' },
  { significance:4, label:'Trip to Victoria, BC', dateFrom:'1994-09-01', dateTo:'1994-09-03', color:'red' },
  { significance:1, label:'Hurricane Ridge', date:'1994-09-01' },
  { significance:1, label:'Butchart Gardens', date:'1994-09-02' },
  { significance:1, label:'Rainier Park', date:'1994-09-05' },
  { significance:2, label:'Christmas at home with the whole family', date:'1994-12-25' },
  { significance:5, label:'Scott\'s graduation', dateFrom:'1995-05-17', dateTo:'1995-06-02', color:'green' },
  { significance:4, label:'Fly to Seattle', date:'1995-05-17' },
  { significance:2, label:'Fly home', date:'1995-06-02' },
  { significance:4, label:'Trip to New Haven, CT', dateFrom:'1995-05-18', dateTo:'1995-05-28', color:'yellow' },
  { significance:2, label:'Commencement ceremony', date:'1995-05-22' },
  { significance:3, label:'First grandchild (Brooke)', date:'2004-07-15' },
  { significance:3, label:'Lisa\'s wedding', date:'2002-08-03' }
];


function parseLabel(label) {
  // attempt to minimize label width by splitting longer values up
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  const labelWidth = ctx.measureText(label).width;
  const words = label.split(" "); // what about hyphens?
  let line = "", labels = [], maxWidth = 0;

  // parse label by words, start a new line when width exceeds MAX_LABEL_WIDTH
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > MAX_LABEL_WIDTH && n > 0) {
      line = line.trimEnd();
      if (ctx.measureText(line).width > maxWidth) maxWidth = ctx.measureText(line).width;
      labels.push(line);
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  line = line.trimEnd();
  labels.push(line);
  if (ctx.measureText(line).width > maxWidth) maxWidth = ctx.measureText(line).width;

  // if there are 2 rows, try to balance the widths
  if (labels.length === 2) {
    const words = labels[0].split(" ");
    let try0 = labels[0], try1 = labels[1];
    for (w = words.length-1; w > 0; w--) {
      const word = words[w];
      try0 = try0.slice(0, (word.length+1) * -1);
      try1 = word + " " + try1;
      if (ctx.measureText(try1).width > ctx.measureText(try0).width) break;
      labels[0] = try0; labels[1] = try1;
      maxWidth = ctx.measureText(try0).width;
    }
  }

  return {labels, width:maxWidth, labelWidth};
}

function initializeEvent(e) {
  // Establish properties for positioning labels
  const parsed = parseLabel(e.label);
  e.labelWidth = parsed.labelWidth;
  e.parsedLabel = parsed.labels;
  e.parsedWidth = parsed.width;
  e.yOffset = null;

  // When only date supplied, convert to a small span in the middle of that day; extend all 'spanning' events to noon on either side
  const d = Date.parse(e.date), h = 60*60*1000;
  e.tFrom = (e.dateFrom === undefined) ? d + (8 * h) : Date.parse(e.dateFrom) + (12 * h);
  e.tTo = (e.dateTo === undefined) ? d + (16 * h) : Date.parse(e.dateTo) + (12 * h);
  e.fLeft = (e.fadeLeft === undefined) ? ((e.dateFrom === undefined) ? d + (11 * h) : e.tFrom) : Date.parse(e.fadeLeft) + (12 * h);
  e.fRight = (e.fadeRight === undefined) ? ((e.dateTo === undefined) ? d + (13 * h) : e.tTo) : Date.parse(e.fadeRight) + (12 * h);
  e.dateTime = (e.date === undefined) ? (e.fRight + e.fLeft) / 2 : d + (12 * h);
  e.x = timeToPx(e.dateTime);  // used only to position labels in relation to each other
};

function initializeTimeline(tl) {
  timelines.push(tl);  // to do: 
  //const tl = timelines[timelines.length - 1];

  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  tl.labelWidth = ctx.measureText(tl.title).width;
  
  //events.sort((a, b) => a.significance - b.significance);  // attempt get small dots registered for hover first

  //tl.events.forEach(initializeEvent);
  for (const event of tl.events) {
    event.timeline = tl;
    initializeEvent(event);
  }
}

function timelineString(tl) {
  // Additional properties have been added to the original timeline object;
  // reduce back to original form for export
  const txt = {
    title: tl.title,
    dateFrom: tl.dateFrom,
    dateTo: tl.dateTo,
    events: tl.events.map(({significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight}) => ({
                            significance, label, date, dateFrom, dateTo, fadeLeft, fadeRight, color, colorLeft, colorRight
    }))
  };
  return JSON.stringify(txt, null, 2);
}