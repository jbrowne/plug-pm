/*
The MIT License (MIT)
Copyright (c) 2015 Jeff Browne

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function() {
    var info = {
        version: 0.6,
        author: "citizenSnips",
        whatsNew: ""
    };

    function Chat(srcId, srcName, dstId, dstName, msg) 
    {
        var chat = {
            message : msg,
            recipient : 
                {
                    name    : dstName,
                    id  : dstId
                },  
            sender :
                {
                    name    : srcName,
                    id  : srcId
                },  
        };

        return chat;
    };

    var FirebaseData = {
        URL : "https://plug-pm.firebaseio.com",
        ReceiveChannel : null,
        SendChannel : null
    };

    function displayReceivedChat(chat) {
        var chatEl = 
          jQuery("<div>", {class: "message user-action"})
          .append(
            jQuery("<div>", {class: "badge-box"})
            .append(
              jQuery("<i>", {class: "icon icon-private-chat"})
            )
          )
          .append(
            jQuery("<div>", {class: "msg"})
            .append(
              jQuery("<div>", {class: "from"})
            )
            .append(
              jQuery("<span>", {class: "un", text: "(" + chat.sender.name + ")"})
            )
          )
          .append(
            jQuery("<span>", {class:"text", text: chat.message})
          );
        $("#chat-messages").append(chatEl);  

    };

    function displayStatusChat(message)
    {
        var statusChat = Chat(-1, "plug.pm", -1, "", message);
        displayReceivedChat(statusChat);
    };

    function displaySentChat(chat) {
        var chatEl = 
          jQuery("<div>", {class: "message user-action"})
          .append(
            jQuery("<div>", {class: "badge-box"})
            .append(
              jQuery("<i>", {class: "icon icon-private-chat"})
            )
          )
          .append(
            jQuery("<div>", {class: "msg"})
            .append(
              jQuery("<div>", {class: "from"})
            )
            .append(
              jQuery("<span>", {class: "un", text: "To (" + chat.recipient.name + ")"})
            )
          )
          .append(
            jQuery("<span>", {class:"text", text: chat.message})
          );
        $("#chat-messages").append(chatEl);  
    };

    function onChatRecieved(chat) 
    {

        displayReceivedChat(chat);
    };

    function sendPMToUserInRoom(username, message) 
    {
        var success = false;
        var userList = API.getUsers();
        for (var idx in userList) {
            if (userList[idx].username == username) {
                var id = userList[idx].id;
                sendPM_(id, username, message);
                success = true;
                break;
            }
        }
        return success;
    };

    function onChatCommand(command) {
        var idx = command.search("/pm");
        if (idx == 0) {
            var nameAndMessage = command.slice(4);
            if (nameAndMessage[0] == "@") {
                nameAndMessage = nameAndMessage.slice(1);
            }
            var nameAndMessageTuple = splitUsernameMessage_(nameAndMessage);
            var name = nameAndMessageTuple[0];
            var message = nameAndMessageTuple[1];
            console.log(name + ":" + message);
            var result = sendPMToUserInRoom(name, message);
            if (!result) {
                API.chatLog("PM failed...");
                console.log("\"" + command + "\"" + " == " + name + ":" + message);
            }
        }
    };

    function onChatMessagesReceived_(snapshot) 
    {
        var chatMessages = snapshot.val();

        for (var idx in chatMessages) {
            var chat = chatMessages[idx];
            onChatRecieved(chat);
        }       
        FirebaseData.ReceiveChannel.remove();
    };

    function sendPM_(dstId, dstName, message) 
    {
        if (message.length > 0) {
            var chat = Chat(API.getUser().id, API.getUser().username, dstId, dstName, message);
            displaySentChat(chat);
            FirebaseData.SendChannel.child(chat.recipient.id).push(chat);
        }
    };

    function splitUsernameMessage_(input) 
    {
        var usersInRoom = API.getUsers();
        var username = "";
        var message = "";
        for (var idx in usersInRoom) {
            username = usersInRoom[idx].username;
            if (input.search(username) == 0) {
                message = input.slice(username.length + 1);
                return [username, message];
            }
        }
        return ["",""];
    }

    function setup() 
    {
        if (typeof API == "undefined" || !API.enabled) {
            setTimeout (setup, 500);
            return;
        }

        var present = "id" in API.getUser();
        FirebaseData.SendChannel = new Firebase(FirebaseData.URL + "/UserChannels/");
        FirebaseData.ReceiveChannel = FirebaseData.SendChannel.child(API.getUser().id);
        FirebaseData.ReceiveChannel.on("value", function(snapshot) {onChatMessagesReceived_(snapshot);});
        API.on(API.CHAT_COMMAND, onChatCommand);
        API.chatLog("Loaded Plug.pm " + info.version);
        displayStatusChat("Type /pm @person <message>");
        if (info.whatsNew.length > 0) {
            displayStatusChat(info.whatsNew);
        }

        //Register with plug's API object
        API.sendPMToUserInRoom = sendPMToUserInRoom;
    };

    function preload() 
    {
        if (typeof $ == 'undefined') {
            setTimeout (preload, 500);
            return;
        }
        $.getScript("https://cdn.firebase.com/js/client/1.1.0/firebase.js", setup);        
    };

    preload();
}).call(this);

