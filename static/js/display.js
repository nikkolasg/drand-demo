const latestDiv = document.querySelector('#latest');
const roundDiv = document.querySelector('#round');
const nodesListDiv = document.querySelector('#nodes');
var locationMap = new Map();

window.verified = false;

//interval id for bar progress
var idBar = -1;

async function newRandomness(identity,round) {
    let requestURL = identity.Address;
    console.log(identity);
    if (identity.TLS == true) {
        requestURL = "https://" + requestURL; 
    } else {
        requestURL = "http://" + requestURL;
    }
    requestURL = requestURL + "/public/" + round
    return fetch(requestURL)
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
           console.log("display.js: received fetch results:",data);
           window.verified = data.verified;
           printRound(data.randomness, data.previous_signature, data.round, data.signature, true);
           return Promise.resolve(data);
    }).catch(function(e) {
           var p = document.createElement("pre");
           var textnode = document.createTextNode("error fetching randomness at" + round);
           p.appendChild(textnode);
           latestDiv.replaceChild(p, latestDiv.childNodes[0]);
           console.log("ERROR : " + data.error);
    });
}

/**
* displayRandomness is the main function which display
* the latest randomness and nodes when opening the page
* the first contacted node is picked at random from group file
**/
async function displayRandomness() {
  window.identity = window.identity || await findFirstNode();
  startProgressBar();
  //print randomness and update verfified status
  console.log("display.js fecthing randomness - from ", window.identity);
  requestFetch(window.identity);
  //printNodesList(window.identity);
}

function requestFetch(id, round) {
    if (round == null) {
        setRound("fetching latest round...");
        round = "latest"
    } else {
        setRound(round);
    }
    setRandomness("...\n...");
    newRandomness(id,round);
}

/**
* startProgressBar handles the progress bar
**/
function startProgressBar() {
  var elem = document.getElementById("myBar");
  var width = 0;
  if (idBar != -1) {
    window.clearInterval(idBar);
  }
  idBar = setInterval(frame, 60);
  function frame() {
    if (width >= 100) {
      clearInterval(idBar);
    } else {
      width += 0.1;
      elem.style.width = width + '%';
    }
  }
}

function setRandomness(str) {
  var p = document.createElement("pre");
    var textnode = document.createTextNode(str);
  p.appendChild(textnode);
  latestDiv.replaceChild(p, latestDiv.childNodes[0]);
  return p;
}

function sliceRandomness(randomness) {
  var quarter = Math.ceil(randomness.length/2);
  var s1 = randomness.slice(0, quarter);
  var s2 = randomness.slice(quarter, 2*quarter);
  var randomness_4lines =  s1 + '\n' + s2;
  return randomness_4lines;
}

/**
* printRound formats and prints the given randomness with interactions
**/
function printRound(randomness, previous, round, signature, verified) {
  //print randomness as current
  var r4l = sliceRandomness(randomness);
  var p = setRandomness(r4l);
  //print JSON when clicked
  p.onmouseover = function() { p.style.textDecoration = "underline"; p.style.cursor = "pointer"};
  p.onmouseout = function() {p.style.textDecoration = "none";};
  var jsonStr = '{"round":'+round+',"previous":"'+previous+'","signature":"'+signature+'","randomness":"'+randomness+'"}';
  var modal = document.getElementById("myModal");
  p.onclick = function() {
    if (window.identity.TLS){
      var reqURL = 'https://'+ window.identity.Address + '/api/public';
    } else {
      var reqURL = 'http://'+ window.identity.Address + '/api/public';
    }
    var modalcontent = document.getElementById("jsonHolder");
    modalcontent.innerHTML = 'Request URL: <strong>'+ reqURL + '</strong> <br> Raw JSON: <pre>' + JSON.stringify(JSON.parse(jsonStr),null,2) + "</pre>";
    modal.style.display = "block";
  };
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }

  //index info
  setRound(round);
}

/**
* isUp decides if node is reachable by trying to fetch randomness
**/
async function isUp(addr, tls) {
    try {
        await drandjs.fetchLatest({Address: addr, TLS: tls})
        console.log(addr," is up !");
        return true;
    } catch (e) {
        console.log(addr, ": error reaching out: ",e);
        throw e;
    }
}

/**
* goToPrev navigates to previous randomness output
**/
function goToPrev() {
  var round = getRound() - 1;
  //stop the 60s chrono and progress bar
  window.clearInterval(id);
  window.clearInterval(idBar);
  var elem = document.getElementById("myBar");
  elem.style.width = 0 + '%';
  //print previous rand
  
  console.log("display.js fetching previous randomness");
  requestFetch(window.identity, round);
}

/**
* goToNext navigates to next randomness output
**/
function goToNext() {
  getLatestIndex().then((latestRound) => {
    if (getRound() == latestRound) {
      console.log("display.js: goToNext returns since already at latest round");
      //we cannot go further
      return
    }
    //update index
    var round = getRound() + 1;
    //stop the 60s chrono and progress bar
    window.clearInterval(id);
    window.clearInterval(idBar);
    var elem = document.getElementById("myBar");
    elem.style.width = 0 + '%';
    //print next rand
    console.log("display.js sending command to fetch next round",round);
    requestFetch( window.identity, round);
  });
}

/**
* refresh goes back to latest output
**/
function refresh() {
  window.clearInterval(id);
  displayRandomness();
  window.setInterval(displayRandomness, 60000);
}

/**
* getLatestIndex returns the index of the latest randomness
* used to get upper bound for the prev/next navigation
**/
function getLatestIndex() {
  return new Promise(function(resolve, reject) {
    newRandomness(window.identity).then((rand) => {resolve(rand.round);})
  });
}

function setRound(round) {
  var p2 = document.createElement("pre");
  var textnode2 = document.createTextNode(round);
  p2.appendChild(textnode2);
  roundDiv.replaceChild(p2, roundDiv.childNodes[0]);
}

function getRound() {
  return parseInt(roundDiv.childNodes[0].innerText);
}

/**
* sleep makes the main thread wait ms milliseconds before continuing
**/
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
* getLoc communicates with dns-js.com and geoIP.com APIs
**/
function getLoc(domain, callback) {
  return;
  var xhr = new XMLHttpRequest();
  URL = "https://www.dns-js.com/api.aspx";
  xhr.open("POST", URL);
  xhr.onreadystatechange = function () {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      let data = JSON.parse(xhr.response);
      var ip = data[0].Address;
      setIPAddressParameter(ip);
      setExcludesParameter("ip");
      setFieldsParameter("country_code2");
      getGeolocation(callback, "ca50c203abfa45a39fe376f3ba9d0a3f");
    }
  }
  xhr.send(JSON.stringify({Action: "Query", Domain: domain,Type: 1}));
}
