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
    if (ININ.Addins.IC.sessionInfo == null) {
        console.log("apiLoaded sessionInfo is null !");
    }
    var _userId = ININ.Addins.IC.sessionInfo.userId;
    _currentUserId = _userId;
    /*if (!ININ.Addins.IC.sessionInfo.connected) {
        console.log("The view is not connected !");
        $("#lblWarning").text("The view is NOT connected !");
    }
    */
    if (ININ.Addins.IC.sessionInfo.userId == null) {
        console.log("apiLoaded - the userid is null !");
    }
    _queue = new ININ.Addins.IC.Queues.Queue();
    _queue.on("interactionAdded",
        function (interactionAdded) {
            /*We only handle the interactions once*/
            /*if(interactionChanged.getAttribute("Handled") == "true")
            {
                //return;
            }
            */
            //$("#test").attr("src", "http://www.microsoft.com/");
            //navigateToFrame();
            var _time = new Date();
            var _formattedTime = ("0" + _time.getHours()).slice(-2) + ":" + ("0" + _time.getMinutes()).slice(-2) + ":" + ("0" + _time.getSeconds()).slice(-2);
            //document.getElementById("version").innerText = "A new interaction id (" + interactionAdded.getAttribute("Eic_CallId") + ")was added on " + _formattedTime;
            ININ.Addins.IC.Interactions.setAttributes({ interactionId: interactionAdded.getAttribute("Eic_CallId"), attributes: { "Handled": "true" } });
            //callWebService(interactionAdded.getAttribute("Eic_CallId"), "interactionAdded");
            $("#txtAccountCode").val(interactionAdded.getAttribute("Eic_CallId"));

            if (interactionAdded.getAttribute("Eic_WorkgroupName") == "" && interactionAdded.getAttribute("Eic_CallDirection") == "O") {
                console.log("Interaction workgroup is empty !");
                disconnectInteraction(interactionAdded.getAttribute("Eic_CallId"));
            }
            else {
                console.log("Interaction workgroup: " + interactionAdded.getAttribute("Eic_WorkgroupName"));
            }
        });
    console.log("apiLoaded - subscribed to interactionAdded !");
    _queue.on("interactionChanged",
        function (interactionChanged) {
            /*We only handle the interactions once*/
            /*if(interactionChanged.getAttribute("Handled") == "true")
            {
                //return;
            }
            */
            var _time = new Date();
            var _formattedTime = ("0" + _time.getHours()).slice(-2) + ":" + ("0" + _time.getMinutes()).slice(-2) + ":" + ("0" + _time.getSeconds()).slice(-2);
            //document.getElementById("version").innerText = "A new interaction id (" + interactionChanged.getAttribute("Eic_CallId") + ")was changed on " + _formattedTime;

            if (interactionChanged.getAttribute("Handled") != "true" && interactionChanged.getAttribute("Eic_State") == "C") {
                $("#txtAccountCode").val(interactionChanged.getAttribute("Eic_CallId"));
                ININ.Addins.IC.Interactions.setAttributes({ interactionId: interactionChanged.getAttribute("Eic_CallId"), attributes: { "Handled": "true" } });
                _currentPhoneNumber = interactionChanged.getAttribute("Eic_RemoteID");
                _currentCallIdKey = interactionChanged.getAttribute("Eic_CallIdKey");
                logAccountNumber(_currentCallIdKey, $("#txtAccountCode").val(), ININ.Addins.IC.sessionInfo.userId, _currentPhoneNumber, "");
            }

        });
    console.log("apiLoaded - subscribed to interactionChanged !");
    ININ.Addins.IC.sessionInfo.on("connected", function (sessionInfo) {
        console.log("The view is connected !"); loadWorkgroups(ININ.Addins.IC.sessionInfo.userId); _queue.subscribe({ queueIds: [{ type: "user", name: sessionInfo.userId }], attributeNames: ["Eic_Direction", "Eic_CallId", "Eic_State", "Eic_CallDirection", "Eic_WorkgroupName", "Eic_CallIdKey", "Eic_RemoteID"] });
    });
    console.log("apiLoaded - subscribed to connected !");
 
    //loadWorkgroups("cboldisor");
}
function callWebService(interactionId, event) {
    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            //document.getElementById("version").innerText = "Response from the web service: " + this.responseText;
        }
    };
    _httpRequest.open("POST", /*window.location.protocol + "//" + window.location.host+"/WCFCubs/svrPostdataToCubs.svc/submitData"*/_cubsWebServiceURL + "/submitData", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send('{"Id":' + interactionId+',"Message":"'+event+'"}');
}
function onClickDialNumber() {
    $("#lblWarning").text("");
    if ($("#txtPhone").val() == "") {
        $("#lblWarning").text("The phone number is mandatory !");
        return;
    }
    if ($("#txtAccountCode").val() == "") {
        $("#lblWarning").text("The account code is mandatory !");
        return;
    }
    var _workgroup = document.getElementById("dlWorkgroups").options[document.getElementById("dlWorkgroups").selectedIndex].value;
    console.log("Selected workgroup: " + _workgroup);
    placeCall($("#txtPhone").val(), _workgroup);
    _telephoneNumbers.unshift($("#txtPhone").val());


    var _phoneSuggestions = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: _telephoneNumbers
    });

    $('.typeahead').typeahead(
        { minLength: 1 },
        { source: _phoneSuggestions }
    );
}
function placeCall(phone, workgroup) {
    console.log("placeCall - was called with the params: " + phone + "," + workgroup);
    if (!ININ.Addins.IC.sessionInfo.connected) {
        console.log("placeCall - The view is not connected !");
        return;
    }
    ININ.Addins.IC.Interactions.makeCall({ "target": phone }, workgroup);
}
function loadWorkgroups(userId) {
    console.log("loadWorkgroups was called !");
    console.log("loadWorkgroups user id: " + userId);
    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {

            var _response = JSON.parse(this.responseText);
            console.log("Quovim response getWG:" + this.responseText);
            try {
                for (var i = 0; i < _response.length; i++) {
                    var _item = _response[i];
                    var _option = document.createElement("option");
                    _option.setAttribute("value", _item.Id);
                    _option.appendChild(document.createTextNode(_item.Workgroup));
                    document.getElementById("dlWorkgroups").appendChild(_option);
                }
            }
            catch (e) {
                console.log("Quovim response getWG:" + e.message);
            }
            
        }
    };
    _httpRequest.open("POST", /*window.location.protocol + "//" + window.location.host + "/WCFCubs/svrPostdataToCubs.svc/getWorkgroups"*/_cubsWebServiceURL + "/getWorkgroups", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send('{"UserId":"' + userId + '"}');
    
}
function logAccountNumber(callIdKey, acountNumber, phone, agentId, date) {
    
    console.log("logAccountNumber was called !");

    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {

            var _response = JSON.parse(this.responseText);
            for (var i = 0; i < _response.length; i++) {
                var _item = _response[i];
                var _option = document.createElement("option");
                _option.setAttribute("value", _item.Id);
                _option.appendChild(document.createTextNode(_item.Workgroup));
                document.getElementById("dlWorkgroups").appendChild(_option);
            }
        }
    };
    _httpRequest.open("POST", /*window.location.protocol + "//" + window.location.host + "/WCFCubs/svrPostdataToCubs.svc/submitAccountNumber"*/_cubsWebServiceURL + "/submitAccountNumber", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send('{"CallIdKey":"' + callIdKey + '","AccountNumber":"' + acountNumber + '","Phone":"' + phone + '","AgentId":"' + agentId +'","Date":"\/Date(1539955026940-0400)\/"}');

}
function disconnectInteraction(interactionId) {
    console.log("disconnectInteraction was called !");
    console.log("disconnectInteraction interaction id: " + interactionId);
    var _httpRequest = new XMLHttpRequest();
    _httpRequest.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
           // document.getElementById("version").innerText = "Response from the web service: " + this.responseText;
            
        }
    };
    _httpRequest.open("POST", /*window.location.protocol + "//" + window.location.host + "/WCFCubs/svrPostdataToCubs.svc/disconnectInteraction"*/_cubsWebServiceURL + "/disconnectInteraction", true);
    _httpRequest.setRequestHeader("Content-type", "application/json");
    _httpRequest.setRequestHeader("Access-Control-Allow-Origin", "*");
    _httpRequest.send('{"InteractionId":"' + interactionId + '"}');
}
$(document).ready(function () {

    
    $("#btnCopyToClipBoard").click(function (e) {
        $("#txtAccountCode").focus();
        document.getElementById("txtAccountCode").setSelectionRange(0, $("#txtAccountCode").val().length);
        document.execCommand("copy");
    });
    $("#btnApplyAcountNumber").click(function (e) {
        $("#lblWarning").text("");
        if ($("#txtAccountCode").val() == "") {
            $("#lblWarning").text("The account number is mandatory !");
            return;
        }
        if (_currentCallIdKey == null) {
            $("#lblWarning").text("There is no active call !");
            return;
        }
        if (ININ.Addins.IC.sessionInfo.userId == null) {
            $("#lblWarning").text("The add-in is not connected !");
            return;
        }
        logAccountNumber(_currentCallIdKey, $("#txtAccountCode").val(), ININ.Addins.IC.sessionInfo.userId, _currentPhoneNumber, "");
    });
    $('#txtPhone').usPhoneFormat({
        format: '(xxx) xxx-xxxx',
    });
    $(window).keydown(function (event) {
        if (event.keyCode == 13) {
            event.preventDefault();
            return false;
        }
    });
    $("#cbNoAccountFound").click(function (e) {
        var _checkState = $("#cbNoAccountFound").prop("checked") ;
        if (_checkState) {
            $("#txtAccountCode").val("No account found");
            $("#txtAccountCode").prop("disabled", true);
        }
        else {
            $("#txtAccountCode").val("");
            $("#txtAccountCode").removeAttr("disabled");
        }
    })
});
