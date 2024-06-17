 var _queue;
var _telephoneNumbers = [];
var _currentUserId = "";
var _currentPhoneNumber = "";
var _currentCallIdKey = "";
var _cubsWebServiceURL = window.location.protocol + "//" + window.location.host + "/WCFCubs/svrPostdataToCubs.svc/WCFCubs/svrPostdataToCubs.svc";

function navigateToFrame() {
    //window.open("http://google.ca", "frameTest");
}

function apiLoaded() {
    console.log("apiLoaded was triggered !");
    if (window.client === undefined) {
        console.log("apiLoaded client is undefined!");
    }
    client.getUserId().then(userId => {
        _currentUserId = userId;
        subscribeToInteractions();
    }).catch(error => {
        console.log("apiLoaded - error getting userId:", error);
    });
}

function subscribeToInteractions() {
    _queue = new client.Queues.Queue();
    _queue.on('interactionAdded', function (interactionAdded) {
        handleInteractionAdded(interactionAdded);
    });

    _queue.on('interactionChanged', function (interactionChanged) {
        handleInteractionChanged(interactionChanged);
    });

    client.on('connected', function () {
        console.log("The view is connected !");
        loadWorkgroups(_currentUserId);
        _queue.subscribe([{ queueId: _currentUserId }], ["direction", "conversationId", "state", "callDirection", "workgroupName", "callIdKey", "remoteId"]);
    });
}

function handleInteractionAdded(interactionAdded) {
    var _time = new Date();
    var _formattedTime = ("0" + _time.getHours()).slice(-2) + ":" + ("0" + _time.getMinutes()).slice(-2) + ":" + ("0" + _time.getSeconds()).slice(-2);
    client.setAttributes(interactionAdded.conversationId, { "Handled": "true" });
    $("#txtAccountCode").val(interactionAdded.conversationId);

    if (interactionAdded.workgroupName === "" && interactionAdded.callDirection === "outbound") {
        console.log("Interaction workgroup is empty !");
        disconnectInteraction(interactionAdded.conversationId);
    } else {
        console.log("Interaction workgroup: " + interactionAdded.workgroupName);
    }
}

function handleInteractionChanged(interactionChanged) {
    var _time = new Date();
    var _formattedTime = ("0" + _time.getHours()).slice(-2) + ":" + ("0" + _time.getMinutes()).slice(-2) + ":" + ("0" + _time.getSeconds()).slice(-2);

    if (interactionChanged.attributes.Handled !== "true" && interactionChanged.state === "disconnected") {
        $("#txtAccountCode").val(interactionChanged.conversationId);
        client.setAttributes(interactionChanged.conversationId, { "Handled": "true" });
        _currentPhoneNumber = interactionChanged.remoteId;
        _currentCallIdKey = interactionChanged.callIdKey;
        logAccountNumber(_currentCallIdKey, $("#txtAccountCode").val(), _currentPhoneNumber, _currentUserId, "");
    }
}

function callWebService(interactionId, event) {
    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            //document.getElementById("version").innerText = "Response from the web service: " + this.responseText;
        }
    };
    _httpRequest.open("POST", _cubsWebServiceURL + "/submitData", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send(JSON.stringify({ Id: interactionId, Message: event }));
}

function onClickDialNumber() {
    $("#lblWarning").text("");
    if ($("#txtPhone").val() === "") {
        $("#lblWarning").text("The phone number is mandatory !");
        return;
    }
    if ($("#txtAccountCode").val() === "") {
        $("#lblWarning").text("The account code is mandatory !");
        return;
    }
    var _workgroup = $("#dlWorkgroups").val();
    console.log("Selected workgroup: " + _workgroup);
    placeCall($("#txtPhone").val(), _workgroup);
    _telephoneNumbers.unshift($("#txtPhone").val());

    var _phoneSuggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: _telephoneNumbers
    });

    $('.typeahead').typeahead({ minLength: 1 }, { source: _phoneSuggestions });
}

function placeCall(phone, workgroup) {
    console.log("placeCall - was called with the params: " + phone + "," + workgroup);
    client.makeCall(phone, workgroup).catch(error => {
        console.log("placeCall - error placing call:", error);
    });
}

function loadWorkgroups(userId) {
    console.log("loadWorkgroups was called !");
    console.log("loadWorkgroups user id: " + userId);

    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            var _response = JSON.parse(this.responseText);
            console.log("Quovim response getWG:", this.responseText);
            try {
                _response.forEach(function (_item) {
                    var _option = document.createElement("option");
                    _option.value = _item.Id;
                    _option.appendChild(document.createTextNode(_item.Workgroup));
                    document.getElementById("dlWorkgroups").appendChild(_option);
                });
            } catch (e) {
                console.log("Quovim response getWG:", e.message);
            }
        }
    };
    _httpRequest.open("POST", /*window.location.protocol + "//" + window.location.host + "/WCFCubs/svrPostdataToCubs.svc/getWorkgroups"*/_cubsWebServiceURL + "/getWorkgroups", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send(JSON.stringify({ UserId: userId }));
}

function logAccountNumber(callIdKey, accountNumber, phone, agentId, date) {
    console.log("logAccountNumber was called !");

    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            var _response = JSON.parse(this.responseText);
            _response.forEach(function (_item) {
                var _option = document.createElement("option");
                _option.value = _item.Id;
                _option.appendChild(document.createTextNode(_item.Workgroup));
                document.getElementById("dlWorkgroups").appendChild(_option);
            });
        }
    };
    _httpRequest.open("POST", /*window.location.protocol + "//" + window.location.host + "/WCFCubs/svrPostdataToCubs.svc/getWorkgroups"*/_cubsWebServiceURL + "/submitAccountNumber", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send(JSON.stringify({ CallIdKey: callIdKey, AccountNumber: accountNumber, Phone: phone, AgentId: agentId, Date: date }));
}

function disconnectInteraction(interactionId) {
    console.log("disconnectInteraction was called !");
    console.log("disconnectInteraction interaction id: " + interactionId);
    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            // document.getElementById("version").innerText = "Response from the web service: " + this.responseText;
        }
    };
    _httpRequest.open("POST", _cubsWebServiceURL + "/disconnectInteraction", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send(JSON.stringify({ InteractionId: interactionId }));
}

console.log("Loading document ready!")
$(document).ready(function () {
    console.log("Loaded document ready!")
    $("#btnCopyToClipBoard").click(function () {
        $("#txtAccountCode").focus();
        document.getElementById("txtAccountCode").setSelectionRange(0, $("#txtAccountCode").val().length);
        document.execCommand("copy");
    });
    $("#btnApplyAcountNumber").click(function () {
        $("#lblWarning").text("");
        if ($("#txtAccountCode").val() === "") {
            $("#lblWarning").text("The account number is mandatory !");
            return;
        }
        if (_currentCallIdKey == null) {
            $("#lblWarning").text("There is no active call !");
            return;
        }
        if (_currentUserId == null) {
            $("#lblWarning").text("The add-in is not connected !");
            return;
        }
        logAccountNumber(_currentCallIdKey, $("#txtAccountCode").val(), _currentPhoneNumber, _currentUserId, "");
    });
    $('#txtPhone').usPhoneFormat({
        format: '(xxx) xxx-xxxx',
    });
    $(window).keydown(function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            return false;
        }
    });
    $("#cbNoAccountFound").click(function () {
        var _checkState = $("#cbNoAccountFound").prop("checked");
        if (_checkState) {
            $("#txtAccountCode").val("No account found");
            $("#txtAccountCode").prop("disabled", true);
        } else {
            $("#txtAccountCode").val("");
            $("#txtAccountCode").removeAttr("disabled");
        }
    });
     const clientId = "83d58a4e-d05f-44cb-a5f7-9f12ac7ec668";
     const redirectUri = window.location.href;
     let environment = 'cac1.pure.cloud.com';

     // Set Genesys Cloud objects
     const platformClient = require('platformClient');
     const client = platformClient.ApiClient.instance;
     let organizationApi = new platformClient.OrganizationApi();

     client.setEnvironment(environment);

    let apiInstance = new platformClient.RoutingApi();

    // Get a paged listing of queues the user is a member of.
    
