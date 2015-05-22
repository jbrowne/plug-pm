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
    var _all_windows = [];

    var info = {
        version: 0.8,
        author: "citizenSnips",
        whatsNew: "Badoop!"
    };

    var messagesInTransit = {};

    function Chat(srcId, srcName, dstId, dstName, msg) 
    {
        var chat = {
            id : Date.now(),
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
                }
        };

        return chat;
    }

    var FirebaseData = {
        URL : "https://plug-pm.firebaseio.com",
        ReceiveChannel : null,
        SendChannel : null
    }

    function displayReceivedChat(chat) {
        var sndUser = getPlugUser_(chat.sender.id);
        var username = "Unknown";
        if (sndUser && sndUser.username) {
            username = sndUser.username;
        }
        else {
            return; // Don't display if we don't know who it's from.
        }

        if (badoop) {
            badoop(); 
        }

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
              jQuery("<span>", {class: "un", text: "(" + username + ")"})
            )
          )
          .append(
            jQuery("<span>", {class:"text", text: chat.message})
          );
        if (_all_windows) {
            for (var idx in _all_windows) {
                var win = _all_windows[idx];
                var chatPane = $(win.document).contents().find("#chat-messages");
                window.chatPane = chatPane;
                chatPane.append (chatEl.clone());
                if (chatPane.length > 0 && chatPane[0].scrollHeight) {
                    chatPane.scrollTop(chatPane[0].scrollHeight);
                }
            }
        }          

    }

    function displayStatusChat(message)
    {
        var statusChat = Chat(-1, "plug.pm", -1, "", message);
        displayReceivedChat(statusChat);
    }

    function displaySentChat(chat) {
        var username = "Unknown";
        var dstUser = getPlugUser_(chat.recipient.id);
        if (dstUser && dstUser.username) {
            username = dstUser.username;
        }
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
              jQuery("<span>", {class: "un", text: "To (" + dstUser.username + ")"})
            )
          )
          .append(
            jQuery("<span>", {class:"text", text: chat.message})
          );
        if (_all_windows) {
            for (var idx in _all_windows) {
                var win = _all_windows[idx];
                var chatPane = $(win.document).contents().find("#chat-messages");
                chatPane.append (chatEl.clone());
                if (chatPane.length > 0 && chatPane[0].scrollHeight) {
                    chatPane.scrollTop(chatPane[0].scrollHeight);
                }
            }
        }          
    }

    function onChatRecieved(chat) 
    {

        displayReceivedChat(chat);
    }

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
    }

    function onChatCommand(command) {
        var idx = command.indexOf("/pm");
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
    }

    function onChatMessagesReceived_(snapshot) 
    {
        var chatMessages = snapshot.val();
        console.log(chatMessages);
        FirebaseData.ReceiveChannel.remove();

        for (var idx in chatMessages) {
            var chat = chatMessages[idx];
            onChatRecieved(chat);
        }
    }

    function sendPM_(dstId, dstName, message) 
    {
        if (message.length > 0) {
            var chat = Chat(API.getUser().id, API.getUser().username, dstId, dstName, message);
            messagesInTransit[chat.id] = chat;
            var firebaseChat = FirebaseData.SendChannel.child(chat.recipient.id).push(chat);
            firebaseChat.on("value", function(snap) {onMessageDelivered(chat, snap)});
            setTimeout(function(){onMessageTimeout(chat, firebaseChat)}, 5000);
        }
    }

    function onMessageTimeout(chat, firebaseChat) {
        if (chat.id in messagesInTransit) {
            console.log("Failed to deliver to " + chat.recipient.name);
            API.chatLog("PM Failed. Is " + chat.recipient.name + " online?");
            firebaseChat.off("value");
            firebaseChat.remove();
            delete messagesInTransit[chat.id];
        }
    }

    function onMessageDelivered(chat, snap) {
        if (snap.val() == null) {
            console.log("DELIVERED");
            displaySentChat(chat);
            if (chat.id in messagesInTransit) {
                //Race condition with onMessageTimeout, but whatever.
                delete messagesInTransit[chat.id];
            }
        }
    }

    function splitUsernameMessage_(input) 
    {
        var usersInRoom = API.getUsers();
        var username = "";
        var message = "";
        for (var idx in usersInRoom) {
            username = usersInRoom[idx].username;
            if (input.indexOf(username) == 0) {
                message = input.slice(username.length + 1);
                return [username, message];
            }
        }
        return ["",""];
    }

    function getPlugUser_(id) 
    {
        var allUsers = API.getUsers();
        for (var idx in allUsers) {
            var user = allUsers[idx];
            if (user.id == id) {
                return user;
            }
        }
        return null;
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
        if (info.whatsNew.length > 0) {
            API.chatLog("New: " + info.whatsNew);
        }
        API.chatLog("Type /pm @person <message>");


        //HACK HACK HACK
        //Maintain a reference towin new open windows (pop-up chat)
        window._open = window.open;
        _all_windows = [window];
        window.open = function(url, name, params)
        {
            var old__all_windows = _all_windows;
            _all_windows = [];
            for (var idx in old__all_windows) {
                var win = old__all_windows[idx];
                if (!win.closed) {
                    _all_windows.push(win);
                }
            }
            var newWindow = window._open(url, name, params);
            _all_windows.push(newWindow);
            return newWindow;
        };

        //Register with plug's API object
        API.sendPMToUserInRoom = sendPMToUserInRoom;
    }

    function preload() 
    {
        if (typeof $ == 'undefined') {
            setTimeout (preload, 500);
            return;
        }
        $.getScript("https://cdn.firebase.com/js/client/1.1.0/firebase.js", setup);        
    }

    preload();
}).call(this);

