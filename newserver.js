const express = require("express");
const path=require("path");
var app=express();
var server=app.listen(3005,function() {
    console.log("Listening on port 3005");
});
//Now here we got the server and server is running on 3000 port
//We will now use this server to set the parameter for socket.io
//server is set as the parameter for socket.io
const io=require("socket.io")(server,{
    allowEIO3:true, //false by default
});
//Now we need to define our directory name where all the sets and files will be loadede
//we are setting the dirname as empty string

//app.use(express.static(path.join(__dirname,"")));

//Now lets do one thing set static dirname set folder as public
//Now in the public folder there is no public.html file hence it will  throw an error 

//app.use(express.static(path.join(__dirname,"/public")));

app.use(express.static(path.join(__dirname,"")));

//Creating an variable of datatype an array to store the user data 
var userConnection=[];
io.on("connection",(socket)=>{
    console.log("socket id is ",socket.id);
    socket.on("userconnect",(data)=>{
        console.log("userconnect",data.displayName,data.meetingid);
        //In summary, the code filters the userConnection array to retrieve only the objects that have a meetingid property matching data.meetingid. The filtered result is stored in the other_users variable for further processing or usage.
        var other_users=userConnection.filter((p)=>p.meeting_id==data.meetingid
        );

        //Now we are going to store the user data in the form of an array
        //Now pushing the user data in the array
        userConnection.push({
            connectionId:socket.id,
            user_id:data.displayName,
            meeting_id:data.meetingid,
         });
         //We will be jsut using property length to count the users
         var userCount=userConnection.length;
         console.log(userCount);

        //Now we will allow the other users to know that I had enetered the video conferencing room
        other_users.forEach((v)=>{
            socket.to(v.connectionId).emit("inform_other_about_me",{
                //Here we have written other_users_id because for them my user id will be of third person
                other_user_id:data.displayName,
                connId:socket.id,
                userNumber:userCount
            })
        })

        socket.emit("inform_me_about_other_user",other_users);
        

    })
    //To catch the data from Server Process and give it to other users
    socket.on("SDPProcess",(data)=>{
        socket.to(data.to_connid).emit("SDPProcess",{
            //From SDP Process we will send two data
            message:data.message,
            //We are sending the conn id so that other user can see my id
            from_connid:socket.id,
            


        })
    })
    socket.on("sendMessage",(msg)=>{
        console.log(msg);
        var muser=userConnection.find((p)=>p.connectionId==socket.id);
        if(muser){
            var meetingid=muser.meeting_id;
            var from=muser.user_id;
            var list=userConnection.filter((p)=>p.meeting_id==meetingid);
            list.forEach((v)=>{
                socket.to(v.connectionId).emit("showChatMessage",{
                    from:from,
                    message:msg,
                })
            })
        }
    })

    socket.on("disconnect",function(){
        console.log("User got disconncted");
        //So we will store the user by matching his connection id
        var disUser= userConnection.find((p)=>p.connectionId==socket.id);
        if(disUser){
            //That menas if there is some data in this disUser
            var meetingid=disUser.meeting_id;
            //Now we will collect information about every users expect the user which got disconnected
            userConnection=userConnection.filter((p)=>p.connectionId!=socket.id);
            //Now we will let other users know that soemone left the room
            var list=userConnection.filter((p)=>p.meeting_id==meetingid);
            list.forEach((v)=>{
               var usernumberafteruserleave= userConnection.length;
                socket.to(v.connectionId).emit("inform_other_about_disconnected_user",{
                    connId:socket.id,
                    uNumber:usernumberafteruserleave,
                })
            })
        }


    })
}); 