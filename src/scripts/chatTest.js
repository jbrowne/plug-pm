(function() {
    var self = this;
    var info = {
        version: 0.2,
        author: "citizenSnips",
    }
    var Chat = function (srcId, srcName, dstId, dstName, msg) {
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

    self.FirebaseData = {
        URL : "https://plug-pm.firebaseio.com",
        ReceiveChannel : null,
        SendChannel : null
    };

    self.displayReceivedChat = function(chat) {
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

    self.displaySentChat = function(chat) {
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

    self.onChatRecieved = function(chat) 
    {

        self.displayReceivedChat(chat);
    };

    self.sendChatToUserInRoom = function(username, message) 
    {

        var userList = API.getUsers();
        for (var idx in userList) {
            if (userList[idx].username == username) {
                var id = userList[idx].id;
                self.sendChat_(id, username, message);
            }
        }
    };

    self.onChatCommand = function(command) {
        var idx = command.search("/pm");
        if (idx == 0) {
            var nameAndMessage = command.slice(4);
            if (nameAndMessage[0] == "@") {
                idx = nameAndMessage.search(" ");
                var name = nameAndMessage.slice(1,idx);
                var message = nameAndMessage.slice(idx);
                console.log(name + ":" + message);
                self.sendChatToUserInRoom(name, message);
            }
        }
    };

    self.onChatMessagesReceived_ = function(snapshot) 
    {
        var chatMessages = snapshot.val();

        for (var idx in chatMessages) {
            var chat = chatMessages[idx];
            self.onChatRecieved(chat);
        }       
        FirebaseData.ReceiveChannel.remove();
    };

    self.sendChat_ = function(dstId, dstName, message) 
    {
        var chat = Chat(API.getUser().id, API.getUser().username, dstId, dstName, message);
        self.displaySentChat(chat);
        FirebaseData.SendChannel.child(chat.recipient.id).push(chat);
    };

    self.setup = function() 
    {
        if (typeof API == "undefined" || !API.enabled) {
            setTimeout (self.setup, 500);
            return;
        }

        var present = "id" in API.getUser();
        FirebaseData.SendChannel = new Firebase(FirebaseData.URL + "/UserChannels/");
        FirebaseData.ReceiveChannel = FirebaseData.SendChannel.child(API.getUser().id);
        FirebaseData.ReceiveChannel.on("value", function(snapshot) {self.onChatMessagesReceived_(snapshot);});
        API.on(API.CHAT_COMMAND, self.onChatCommand);
        API.chatLog("Loaded PlugChat " + info.version);
        API.chatLog("Type /pm @person <message>");

    };

    self.preload = function() 
    {
        if (typeof $ == 'undefined') {
            setTimeout (self.preload, 500);
            return;
        }
        $.getScript("https://cdn.firebase.com/js/client/1.1.0/firebase.js", self.setup);        
    };

    preload();
    window.chat = self;
}).call(self);

