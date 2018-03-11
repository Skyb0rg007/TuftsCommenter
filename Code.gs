// Make the SubmitGoogleFormData function run each time there is a form submission
function Initialize() { 
  try {
    var triggers = ScriptApp.getProjectTriggers();
 
    for (var i in triggers)
      ScriptApp.deleteTrigger(triggers[i]);
 
    ScriptApp.newTrigger("SubmitGoogleFormData")
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onFormSubmit().create();
  } catch (error) {
    throw new Error("Please add this code in the Google Spreadsheet");
  }
}

// Runs validations and makes fb request
function SubmitGoogleFormData(e) {
 
  if (!e) {
    throw new Error("Please go the Run menu and choose Initialize");
  }

  try {
 
 //  this is where the API code goes
        
    var ss  = SpreadsheetApp.getActiveSheet(),
        lr  = ss.getLastRow(),
        url = ss.getRange(lr, 2, 1, 1).getValue(), 
        com = ss.getRange(lr, 3, 1, 1).getValue(),
        ts  = ss.getRange(lr, 1, 1, 1).getValue();  // timestamp
    
    var graph = validate_url(url);
    
    validate_timestamp(graph, ts);
    
    var comment = validate_comment(com);
    
    var payload = {
      'message': String(comment),
      'access_token': api_token() // this function returns the API code for this app
    };
    
    var options = {
      'method': 'post',
      'payload': payload,
      'contentType': 'application/json; charset=UTF-8'
    };
    sleep(60*1000); // Make it seem like this is not a person's doing
    Logger.log(UrlFetchApp.fetch(graph, options).getContentText()); // Make the request and log the answer
    
  } catch (error) {
    Logger.log(error.toString());
  }
}

function validate_url (url) {
  url = String(url);
  var post_id = url.match(/[0-9]{15}/g);
  if (!post_id) {
    if (url === 'criticism')
      return 'https://graph.facebook.com/v2.12/806569379550623_829051647302396/comments';
    else
      throw 'URL is not valid!';
  }
  post_id = post_id[0];
  
  var post_url = 'https://www.facebook.com/TuftsSecrets/posts/' + post_id;
  var new_url = 'https://graph.facebook.com/v2.12/488379391541085_' + post_id + '/comments';

  var request = UrlFetchApp.fetch(post_url);
  
  if (request.getResponseCode() === 404)
    throw 'URL is not valid!';
  else
    return new_url;
}

function validate_timestamp (graph, ts) {

  var response = UrlFetchApp.fetch(graph, {"headers": {"Authorization": "Bearer " + api_token()}}).getContentText();
  response = JSON.parse(response);
  response = response.data;

  var curr_date = new Date(ts);
  
  var score = 100;
  
  for (var i = 0; i < response.length; i++) {
    if (response[i].from.name !== 'Tufts Secret Commenter') continue;

    var new_date = new Date(response[i].created_time);
    var diff = (curr_date - new_date)/60000; // difference in minutes
       
    if (diff > 14*60) // Ignore comments from 14+ hours ago
      continue;
    
    if (diff < 1) // Not OK if comment was posted to the same post within a minute
      throw 'Too early to make another comment!';

    if (1 - diff/60 > 0)         // 1 hour - diff
      score -= 4*(10 - diff/60)  // Subtract 4 pts for each minute earlier than an hour
  }
  return score > 0;
}

// validate_comment is ommitted to prevent abuse

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}
