var token = "";
var telegramUrl = "https://api.telegram.org/bot" + token;
var webAppUrl = ""; // 2. FILL IN YOUR GOOGLE WEB APP ADDRESS
var ssId = ""; // 3. FILL IN THE ID OF YOUR SPREADSHEET
var adminID = ""; // 4. Fill in your own Telegram ID for debugging

// Function for debugging reasons - to see if Telegram API key is correct
function getMe() {
  var url = telegramUrl + "/getMe";
  var response = UrlFetchApp.fetch(url);
}

// Function for setting where Telegram is sending messages -> Google Web App
function setWebhook() {
  var url = telegramUrl + "/setWebhook?url=" + webAppUrl;
  var response = UrlFetchApp.fetch(url);
}

// Function for sending text
function sendText(id,text) {
  var url = telegramUrl + "/sendMessage?chat_id=" + id + "&text=" + encodeURIComponent(text);
  var response = UrlFetchApp.fetch(url);
}

// Function for sending photos
function sendPhoto(id,imgUrl) {
  var url = telegramUrl + "/sendPhoto?chat_id=" + id + "&photo=" + encodeURIComponent("https://drive.usercontent.google.com/u/0/uc?id=" + imgUrl + "&export=download");
  var response = UrlFetchApp.fetch(url);
}

function getExpenseCategoriesFromSheet() {
  // Get the spreadsheet by ID
  var ss = SpreadsheetApp.openById(ssId);
  
  // Get the sheet by name
  var sheet = ss.getSheetByName("Categories");
  
  // Get the range H37:H49
  var expenseRange = sheet.getRange("A2:A17");
  
  // Get the values in the range
  var values = expenseRange.getValues();

  // Filter out empty cells
  var nonEmptyValues = values.filter(function(row) {
    return row[0] !== ""; // Assuming you want to filter based on the first column in the range
  });
  
  // Initialize an empty string to store the formatted values
  var formattedValues = "";
  
  // Loop through the non-empty values and concatenate them with a hyphen and newline
  for (var i = 0; i < nonEmptyValues.length; i++) {
    formattedValues += "- " + nonEmptyValues[i][0] + "\n";
  }
  return formattedValues;
}

function getIncomeCategoriesFromSheet() {
  // Get the spreadsheet by ID
  var ss = SpreadsheetApp.openById(ssId);
  
  // Get the sheet by name
  var sheet = ss.getSheetByName("Categories");
  
  // Get the range B2:B11
  var incomeRange = sheet.getRange("B2:B11");
  
  // Get the values in the range
  var values = incomeRange.getValues();
  
  // Filter out empty cells
  var nonEmptyValues = values.filter(function(row) {
    return row[0] !== ""; // Assuming you want to filter based on the first column in the range
  });
  
  // Initialize an empty string to store the formatted values
  var formattedValues = "";
  
  // Loop through the non-empty values and concatenate them with a hyphen and newline
  for (var i = 0; i < nonEmptyValues.length; i++) {
    formattedValues += "- " + nonEmptyValues[i][0] + "\n";
  }
  return formattedValues;
}

function objectToArray(object){
  array = []
  for(key in object){
    array.push([key, object[key]])
  }
  return array
}


function getExpenses(ranges){

  // Get the spreadsheet by ID
  var ss = SpreadsheetApp.openById(ssId);
  
  // Get the sheet by name
  var sheet = ss.getSheetByName("WebHookData");
  var values = []
  
  // Get the range B2:B11
  //var incomeRange = sheet.getRange(range);
  var incomeRange = []
  ranges.forEach((range)=>{
    incomeRange.push(sheet.getRange(range));
  })
  
  // Get the values in the range
  incomeRange.forEach((range)=>{
    values.push(range.getValues())
  })

  var expensesList = []
  
  // Remove all empty rows from values array
  // And inserting to expensesList
  values.forEach((value) => {
      expensesList.push(value.filter(function(row) {
        return row[0] !== "" && row[5] == false && row[0] != "#N/A"; // Filter includes comparing date and checking if logged item was a expense 
    }))
  })

  var expenses = []

  // Flattening expenses list to 1 2D array expenses
  expensesList.forEach((expensesTemp)=> {
    expensesTemp.forEach((expense) => {
      expenses.push(expense)
    })
    
  })

  // Formatting expenses dates to 24 5 2024
  expenses.forEach((expense)=>{
    expense[0] = expense[0].getDate() + " " + (parseInt(expense[0].getMonth()) + 1) + " " + expense[0].getFullYear()
  })

  return expenses
}


function parseExpenses(expenses, days){

  var dailyExpensesSum = createTimePeriod(days)
  var expensesByCategory = {}
  var sum = 0

  expenses.forEach((expense)=>{
    sum += expense[2]
    if(expense[0] in dailyExpensesSum){
      dailyExpensesSum[expense[0]] += parseFloat(expense[2])
    } 
    if(expense[3] in expensesByCategory){
      expensesByCategory[expense[3]] += expense[2]
    } else {
      expensesByCategory[expense[3]] = expense[2]
    }
  })
  let expensesByCategorySorted = sortDictByValue(expensesByCategory)
  let dailyExpensesSumArr = objectToArray(dailyExpensesSum)

  return [sum.toFixed(2), expensesByCategorySorted, dailyExpensesSumArr]
}


function generateReport(range, days, title, daily=false){
  // Get data and build report message 
  var expenses = getExpenses(range)
  var [sum, expensesByCategory, dailyExpensesSumArr] = parseExpenses(expenses, days)
  var message = generateMessage(title, sum, expensesByCategory)
  // Generate images and fetch the IDs
  let fileId = generateSpendingPieChart(expensesByCategory)
  var lineFileId = []
  if(!daily){
    lineFileId = generateSpendingLineChart(dailyExpensesSumArr)
  }
  

  return [message, fileId, lineFileId]
}


function generateMessage(title, sum, expensesByCategory){
  var message = title + sum + "€\n\n"
  expensesByCategory.forEach((expense)=>{
    message += expense[0] + ": " + expense[1].toFixed(2) + "\n"
  })

  return message
}

// Check date objects if expense is in the same day 
function compareDate(date, today){
  return date.getFullYear() === today.getFullYear() &&
  date.getMonth() === today.getMonth() &&
  date.getDate() === today.getDate();
}

// Sorting the dictionary with expenses by value, returns array
function sortDictByValue(dict) {
  // Create items array
  var items = Object.keys(dict).map(function(key) {
    return [key, dict[key]];
  });

  // Sort the array based on the second element
  items.sort(function(first, second) {
    return second[1] - first[1];
  });

  // Create a new array with only the first 5 items
  return(items);
}


function subtractDays(date, days){
  var newTime = date.getTime() - (days * 24 * 60 * 60 * 1000);
  date.setTime(newTime)
  return date
}


function createTimePeriod(days){
  let start = subtractDays(new Date(), days)
  let monthlyExpenses = {}
  for(let i = 0; i< days; i++){
    let newDate = new Date(start);
    newDate.setDate(newDate.getDate() + i);
    monthlyExpenses[newDate.getDate() + " " + (parseInt(newDate.getMonth())+1) + " " + newDate.getFullYear()] = 0
    
  }
  return monthlyExpenses
}


function generateSpendingPieChart(expense) {

  var dataTable = Charts.newDataTable()
      .addColumn(Charts.ColumnType.STRING, "Category")
      .addColumn(Charts.ColumnType.NUMBER, "Amount");


  for (var i in expense) {
    dataTable.addRow([expense[i][0], expense[i][1]]);
  }

  var chart = Charts.newPieChart()
      .setDataTable(dataTable)
      .setTitle("Today's Spending")
      .setDimensions(600, 400)
      .build();

  var blob = chart.getAs('image/png');
  var folder = DriveApp.getFolderById('')
  var file = folder.createFile(blob).setName("SpendingChart.png");
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getId();
}


function generateSpendingLineChart(data) {

  var dataTable = Charts.newDataTable()
      .addColumn(Charts.ColumnType.STRING, "Day")
      .addColumn(Charts.ColumnType.NUMBER, "Amount");
  
  for (var i in data) {
    if(isNaN(data[i][1])){
      data[i][1] = 0
    }
    dataTable.addRow([data[i][0], data[i][1]]);
  }

  var chart = Charts.newLineChart()
      .setDataTable(dataTable)
      .setTitle("Expense categories")
      .setDimensions(600, 400)
      .build();

  var blob = chart.getAs('image/png');
  var folder = DriveApp.getFolderById('')
  var file = folder.createFile(blob).setName("SpendingLineChart.png");
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getId();
}

function sendDailyReport(){
  var [message, fileId] = generateReport(["BA2:BF79"], 1, "Today you've spent: ", true)

  sendText(".message.chat.id", message)
  sendPhoto(".message.chat.id", fileId)
}

function sendWeeklyReport(){
  var [message, fileId, lineFileId] = generateReport(["O2:T108"], 7, "This week you've spent: ")

  sendText(".message.chat.id", message)
  sendPhoto(".message.chat.id", fileId)
  sendPhoto(".message.chat.id", lineFileId)
}


function sendMonthlyReport(){
  var [message, fileId, lineFileId] = generateReport(["O2:T80", "V2:AA80", "AC2:AI80", "AK2:AR80", "AT2:AY79"], 31, "This month you've spent: ")

  sendText(".message.chat.id", message)
  sendPhoto(".message.chat.id", fileId)
  sendPhoto(".message.chat.id", lineFileId)
}


function doPost(e) {
  try {
    // this is where telegram works
    var data = JSON.parse(e.postData.contents);
    var text = data.message.text;
    var id = data.message.chat.id;
    var name = data.message.chat.first_name + " " + data.message.chat.last_name;
  
    

    // REGEX check for format
    var match_expense = /^(\w+)\s+(\d+(?:\.\d+)?)(?:\s+(.*))?/.exec(text);
    var match_income = /^(in\s+)(\w+)\s+(\d+(?:\.\d+)?)(?:\s+(.*))?/i.exec(text);
    var match_help = /\bhelp\b/i.exec(text);
    var match_report = /\bdaily\b/i.exec(text);
    var match_report_weekly = /\bweekly\b/i.exec(text);
    var match_report_monthly = /\bmonthly\b/i.exec(text);


    if (match_help){
      var expenseCategories = getExpenseCategoriesFromSheet()
      var incomeCategories = getIncomeCategoriesFromSheet()
      var answer = "Enter expense in form \n" +
             "CATEGORY X.XX COMMENT\n" +
             "For income just add \"in\" phrase e.g.\n" +
             "IN CATEGORY X.XX COMMENT\n" +
             "Currently configured expense categories are:\n" + expenseCategories + "\n" +
             "Currently configured income categories are:\n" + incomeCategories;

      sendText(id,answer);
    } else if (match_expense) {
      var income = false;
      var category = match_expense[1];
      var price = match_expense[2];
      var comment = match_expense[3] || '';
      var answer = "Expense received and stored ("+ category +", "+ price +
               ", " + comment + ") Thanks " + name;
      SpreadsheetApp.openById(ssId).getSheets()[0].appendRow([new Date(),name, price, category, comment, income]);
      sendText(id,answer);
    } else if (match_income) {
      var income = true;
      var category = match_income[2];
      var price = match_income[3];
      var comment = match_income[4] || '';
      var answer = "Income received and stored ("+ category +", "+ price +
                ", " + comment + ") Thanks " + name;
      SpreadsheetApp.openById(ssId).getSheets()[0].appendRow([new Date(),name, price, category, comment, income]);
      sendText(id,answer);
    } else if (match_report){
      sendDailyReport()
    } else if (match_report_weekly){
      sendWeeklyReport()
    } else if (match_report_monthly){
      sendMonthlyReport()
    } else {
      sendText(id,"Wrong Format");
    }
    
  } catch(e) {
    sendText(adminID, JSON.stringify(e,null,4));
  }
}