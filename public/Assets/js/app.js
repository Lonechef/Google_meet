
//Now we will be creating another function to connect user to user which will be connected to new server.hs
var AppProcess=(function(){
var peers_connection_ids=[];
var  peers_connection=[];
var remote_vid_stream=[];
var remote_audio_stream=[];
var my_connection_id;
var local_div;
var audio;
var isAudioMute=true;
var rtp_aud_senders=[];
var video_states={
    None:0,
    Camera:1,
    ScreenShare:2
}
var video_st=video_states.None;
var videoCamTrack;
var rtp_vid_senders=[];

    var serverProcess;
    //So basically we will be using helping function like setNewConnection
    //And then we will be returning the result of Appprocess to my app function
    async function _init(SDP_function,my_connid){
        serverProcess=SDP_function
        my_connection_id=my_connid
        //Now we will declare a event for our local audio and video
        eventProcess();
        local_div=document.getElementById("localVideoPlayer")

    }
    function eventProcess(){
        $("#micMuteUnmute").on("click",async function(){
            if(!audio){
                await loadAudio();
            }
            if(!audio){
                alert("Audio Permission is not granted");
                return;
            }
            if(isAudioMute){
                audio.enabled=true;
                //Now if we click on the audio button
                //Which is initially displayed as mute in clicking the icon should be displayed as unmute
                $(this).html("<span class='material-icons' style='width:100%;'>mic</span>");
                updateMediaSenders(audio,rtp_aud_senders);
            }
            else{
                audio.enabled=false;
                $(this).html("<span class='material-icons'style='width:100%;'>mic_off</span>");
                removeMediaSenders(rtp_aud_senders);

            }
            //  This will work excatly opposite
            isAudioMute=!isAudioMute;
            //if isAudioMute s true then it will become false here
            //isAudioMute=false;
            
        });
        $("#videoCamOff").on("click",async function(){
            if(video_st==video_states.Camera){
                await videoProcess(video_states.None)
            }
            else {
                await videoProcess(video_states.Camera)
            }
        })
        $("#btnScreenShareOnOff").on("click",async function(){
            if(video_st==video_states.ScreenShare){
                await videoProcess(video_states.None)
            }
            else {
                await videoProcess(video_states.ScreenShare)
            }
        });
    }
    async function loadAudio(){
        try{
           var astream =await navigator.mediaDevices.getUserMedia({
                video:false,
                audio:true

            });
            audio=astream.getAudioTracks()[0];
            audio.enabled=false;
        }catch(e){
            console.log(e);
        }
    }
    function connection_status(connection){
        if(connection && 
            (connection.connectionState=="new" || 
            connection.connectionState=="connecting" || 
            connection.connectionState=="connected")){
            return true;
        }
        else{
            return false;
        }

    }
    async function updateMediaSenders(track,rtp_senders){
        for(var con_id in peers_connection_ids){
            if(connection_status(peers_connection[con_id])){
                if(rtp_senders[con_id]  && rtp_senders[con_id].track){
                    rtp_senders[con_id].replaceTrack(track)
                }
                //If rtp_senders connection not found
                else{
                    rtp_senders[con_id]=peers_connection[con_id].addTrack(track);

                
                }


            }
        }
    }
    function removeMediaSenders(rtp_senders){
        for(var con_id in peers_connection_ids){
            if(rtp_senders[con_id]&&connection_status(peers_connection[con_id])){
                peers_connection[con_id].removeTrack(rtp_senders[con_id]);
                rtp_senders[con_id]=null;
            }
        }

    }

    function removeVideoStream(rtp_vid_senders){
        if(videoCamTrack){
           //THis means if there is a Video in the track then we will stop it
        videoCamTrack.stop();
        videoCamTrack=null;
        local_div.srcObject=null;
        removeMediaSenders(rtp_vid_senders)
        }

    }
        async function videoProcess(newVideoState){
            //If VideoState is None
            if(newVideoState==video_states.None){
                $("#videoCamOff").html("<span class='material-icons'style='width:100%;'>videocam_off</span>");
                $("#btnScreenShareOnOff").html('<span class="material-icons">present_to_all</span><div>Present Now</div>')
                video_st=newVideoState;
                removeVideoStream(rtp_vid_senders);
                return
            }
            //But if video state is not none
            if(newVideoState==video_states.Camera){
                $("#videoCamOff").html("<span class='material-icons' style='width:100%;'>videocam_on</span>")
            }
            try{
                var vstream=null;
                if(newVideoState==video_states.Camera){
                    //We are storing our output in vStream
                    vstream=await navigator.mediaDevices.getUserMedia({
                   video:{ 
                    width:1920,
                    height:1080
                   },
                   audio:false 
                });
                }
               else if(newVideoState==video_states.ScreenShare){
                vstream=await navigator.mediaDevices.getDisplayMedia({
                    video:{
                     width:1920,
                     height:1080
                    },
                    audio:false 
                 });
                 //Suppose inbuild video can system is not working
                 vstream.oninactive=(e)=>{
                    remote_vid_stream(rtp_vid_senders);
                    $("#btnScreenShareOnOff").html('<span class="material-icons ">present_to_all</span><div>Present Now</div>')
                 }

                    
                }
                if(vstream && vstream.getVideoTracks().length>0){
                    videoCamTrack=vstream.getVideoTracks()[0];
                    if(videoCamTrack){
                        local_div.srcObject=new MediaStream([videoCamTrack]);
                        updateMediaSenders(videoCamTrack,rtp_vid_senders)
                    }
                }
            }
            catch(e){
                console.log(e);
                return;
            }
            video_st= newVideoState;
            if(newVideoState==video_states.Camera){
                $("#videoCamOff").html('<span class="material-icons" style="width: 100%;">videocam</span>')
                $("#btnScreenShareOnOff").html('<span class="material-icons ">present_to_all</span><div>Present Now</div>');

            }
            else if(newVideoState==video_states.ScreenShare){
                $("#btnScreenShareOnOff").html('<span class="material-icons text-success">present_to_all</span><div class="text-success">Stop Present Now</div>')
                //Now when screan streaming is on then at that time video should be off
                $("#videoCamOff").html('<span class="material-icons" style="width: 100%;">videocam_off</span>')


            }

        }
    
    
    var iceConfiguration={
        //Stun ice serve will get the user information and store it in iceConfiguration
        iceServers:[
            {
                urls:"stun:stun.l.google.com:19302",

            },
            {
                urls:"stun:stun.l.google.com:19302",

            },
        ]
    }
    async function setConnection(connid){
        
        var connection= new RTCPeerConnection(iceConfiguration);
        //We will be using onnegotiationneeded method for this 
        connection.onnegotiationneeded=async function(event){
            await setOffer(connid);
        }
        connection.onicecandidate=function(event){
            if(event.candidate){
                serverProcess(JSON.stringify({icecandidate: event.candidate}),
                connid);
            }
        }
        connection.ontrack=function(event){
            if(!remote_vid_stream[connid]){
                remote_vid_stream[connid]=new MediaStream
            }
            if(!remote_audio_stream[connid]){
                remote_audio_stream[connid]=new MediaStream
            }
            if(event.track.kind=="video"){
                remote_vid_stream[connid].getVideoTracks().forEach((t)=>
                    remote_vid_stream[connid].removeTrack(t));
                    remote_vid_stream[connid].addTrack(event.track);
                    var remoteVideoPlayer=document.getElementById("v_"+connid);
                    remoteVideoPlayer.srcObject=null;
                    remoteVideoPlayer.srcObject=remote_vid_stream[connid];
                    remoteVideoPlayer.load();
            }
            else if(event.track.kind=="audio"){
                remote_audio_stream[connid].getAudioTracks().forEach((t)=>
                remote_audio_stream[connid].removeTrack(t));
                remote_audio_stream[connid].addTrack(event.track);
                var remoteAudioPlayer=document.getElementById("a_"+connid);
                remoteAudioPlayer.srcObject=null;
                remoteAudioPlayer.srcObject=remote_audio_stream[connid];
                remoteAudioPlayer.load();
            }
//In order to work in setOffer we need peer connection id

        };
        peers_connection_ids[connid]=connid;
        peers_connection[connid]=connection;

        //Now we need to return connection
        if(video_st==video_states.Camera || video_st==video_states.ScreenShare){
            if(videoCamTrack){
            updateMediaSenders(videoCamTrack,rtp_vid_senders);
            }
        }
        return connection;
        


        }
        
        

    
    async function setOffer(connid){
        var connection=peers_connection[connid];
        var offer=await connection.createOffer();

        await connection.setLocalDescription(offer);
        serverProcess(JSON.stringify({
            offer:connection.localDescription,
        }),connid);
        

    
    }
    
    async function SDPProcess(message,from_connid){
        message=JSON.parse(message);
        if(message.answer){
            //First we will check whether the message is of answer type or not if not then we will check whether is it of type offer
        //We will check wheteher this data is answer or not
        await peers_connection[from_connid].setRemoteDescription(
            new RTCSessionDescription(message.answer))
        }
        else if(message.offer){
            if(!peers_connection[from_connid]){
                //peer connection is not in the connId then we will add by using function setConnection
                await setConnection(from_connid);
            }
            await peers_connection[from_connid].setRemoteDescription(
                new RTCSessionDescription(message.offer))
            var answer=await peers_connection[from_connid].createAnswer()
            await peers_connection[from_connid].setLocalDescription(answer);
            serverProcess(JSON.stringify({
                answer:answer,
                //So basically the person who is offering we will be sendin the answer to him

            }),from_connid)
            

        }
        else if(message.icecandidate){
            if(!peers_connection[from_connid]){
                await setConnection(from_connid);
            }
            try{
                await peers_connection[from_connid].addIceCandidate(message.icecandidate);
            }catch(e){
                console.log(e);
            }
        }
    }
    async function closeConnection(connid){
        peers_connection_ids[connid]=null;
        if(peers_connection[connid]){
            peers_connection[connid].close();
            peers_connection[connid]=null;


        }
        if(remote_audio_stream[connid]){
            remote_audio_stream[connid].getTracks().forEach((t)=>{
                if(t.stop) {
                    t.stop();
                }
            })
            remote_audio_stream[connid]=null;
        }
        if(remote_vid_stream[connid]){
            remote_vid_stream[connid].getTracks().forEach((t)=>{
                if(t.stop) {
                    t.stop();
                }
            })
            remote_vid_stream=null;
        }

    }
    return {
        setNewConnection:async function(connid){
            await setConnection(connid);
        },
        init: async function(SDP_function,my_connid){
            await _init(SDP_function,my_connid);
        },
        processClientFunc: async function(data,from_connid){
            await SDPProcess(data,from_connid);
        },
        closeConnectionCall : async function(connid){
            await closeConnection(connid);
    },
};

})();
var MyApp=(function(){
    var socket=null;
    var user_id="";
    var meeting_id="";
    
 
    function init(uid,mid){
        user_id=uid;
        meeting_id=mid;
        $("#meetingContainer").show();
        $("#me h2").text(user_id+"(Me)");
        //Also we want to set the usernames in the title area
        document.title=user_id;


        //Now we will make a function
        event_process_for_signaling_server();
        eventHandeling();

    }
    
    function event_process_for_signaling_server(){
        socket=io.connect();
        var SDP_function=function(data,to_connid){
            socket.emit("SDPProcess",{
                message:data,
                to_connid:to_connid
            })
        }
       
        socket.on("connect",()=>{
            // If connection is successfully done then this will be shown on the client side as an alert

            //alert("socket connected to cliet side")

            //Now first we will see whether it is connected or not

            if(socket.connected){
                AppProcess.init(SDP_function,socket.id)

                if(user_id!="" && meeting_id!=""){
                    socket.emit("userconnect",{
                        displayName:user_id,
                        meetingid:meeting_id,
                    })
                }
            }
        });
        socket.on("inform_other_about_disconnected_user",function(data){
            //We will be working on data that is sent by serve.js
            //So first we will remove users video from other users
            $("#"+data.connId).remove();
            //If the user gets disconnected then he should be remove d fromthe list
            $(".Participant-count").text(data.uNumber);
            //This id we made below in app.js where we imported the class in-call-wrap
            $("#participant_"+data.connId+"").remove();
            
        
            
            AppProcess.closeConnectionCall(data.connId);
            //Now in AppProcess we need to return closeConnectionCall


        })
        socket.on("inform_other_about_me",function(data){
               addUser(data.other_user_id,data.connId,data.userNumber);
               //Now we will try to connect between two users
               AppProcess.setNewConnection(data.connId);

              

        })
        socket.on("inform_me_about_other_user",function(other_users){
            //Now adding the userNumber
            
            var userNumber=other_users.length;
            var userNumb=userNumber+1;

            if(other_users){
                for(var i=0;i<other_users.length;i++){
                    addUser(other_users[i].user_id,
                        other_users[i].connectionId,userNumb);
                        AppProcess.setNewConnection(other_users[i].connectionId);

                }
            }
               
              

        })
        socket.on("SDPProcess",async function(data){
            await AppProcess.processClientFunc(data.message,data.from_connid)
        })
        socket.on("showChatMessage",function(data){
            var time= new Date();
            var ltime=time.toLocaleString("en-US",{
                hour:"numeric",
                minute:"numeric",
                hour12:true,
        });
        var div = $("<div>").html(
        "<span class='font-weight-bold mr-3' style='color:black'>"+
        data.from+
        "</span>"+
        ltime+
        "</br>"+
        data.message);
        //In index.html we had set it as messages
        $("#messages").append(div);
        });
    }
    
    function eventHandeling(){
        $("#btsend").on("click",function(){
            var msgData=$("#msgbox").val();
            socket.emit("sendMessage",msgData);
           
            //Now message will go to server.js and there we will catch the value
            var time= new Date();
            var ltime=time.toLocaleString("en-US",{
                hour:"numeric",
                minute:"numeric",
                hour12:true
        })
        var div = $("<div>").html(
        "<span class='font-weight-bold mr-3' style='color:black'>"+
       user_id+
        "</span>"+
        ltime+
        "</br>"+
        msgData);
        //In index.html we had set it as messages
        $("#messages").append(div);
        $("#msgbox").val("");

        });
        //To print the url of the meeting int the bottom side
        var url=window.location.href;
        $(".meeting_url").text(url);

        $("#divUsers").on("dblclick","video",function(){
            this.requestFullscreen();

        })

    }
   
     //Now we are going to complete out addUserfunction to add the information about the new user in other users interface
    function addUser(other_user_id,connId,userNumb){
        var newDivId=$("#otherTemplate").clone();
        //Now everytime id is changes the newDivId is going to change as we are using attr wich is the attribute
        newDivId=newDivId.attr("id",connId).addClass("other");
        //Now in h2 tag the use id will be dispayed
        newDivId.find("h2").text(other_user_id)
        newDivId.find("video").attr("id","v_"+connId);
        newDivId.find("audio").attr("id","a_"+connId);
        //We need to use show as we had done display:none in the other template
        newDivId.show();
        //Now we will be working on id divUsers which is present in the index.html
        //For every new user this will be repeated and append to the divUsers
        $("#divUsers").append(newDivId);
        $(".in-call-wrap-up").append(' <div class="in-call-wrap d-flex justify-content-between align-items-center mb-3" id="participant_'+connId+'"> <div class="participant-img-name-wrap display-center cursor-pointer"> <div class="participant-img"> <img src="public/Assets/images/other.jpg" alt="" class="border border-secondary" style="height: 40px; width: 40px; border-radius: 50%;"> </div> <div class="participant-name ml-2">'+other_user_id+'</div> </div> <div class="participant-action-wrap display-center "> <div class="participant-action-dot dispaly-center mr-2 cursor-pointer"> <span class="material-icons"> more_vert </span> </div> <div class="participant-action-pin dispaly-center mr-2 cursor-pointer"> <span class="material-icons"> push_pin </span> </div> </div> </div>');
        $(".Participant-count").text(userNumb);




    }
    $(document).on("click",".people-heading",function(){
        //Now when we click on chat wrap then it will wrap up and show us th ein call
        //300 is the time to hide thi div
        $(".chat-show-wrap").hide(300);
        $(".in-call-wrap-up").show(300);
         //This active class used to add background color
        $(this).addClass("active");
        $(".chat-heading").removeClass("active");

    })
    //Now similarly if we click on chat it should also be displayed
    $(document).on("click",".chat-heading",function(){
        //Now when we click on chat wrap then it will wrap up and show us th ein call
        //300 is the time to hide thi div
        $(".in-call-wrap-up").hide(300)
        $(".chat-show-wrap").show(300);
        //This active class used to add background color
        $(this).addClass("active");
        //Now we will be working on functionality about changing chat color and all
        $(".people-heading").removeClass("active")
        
    });
    //Now we will be giving functionality to the cross button
    $(document).on("click",".meeting-heading-cross",function(){
        $(".g-right-details-wrap").hide(300);
    });
    //Now if we click on participant or chat option then the area removed  by the cross should be displayed again
    $(document).on("click",".top-left-participant-wrap",function(){
        $(".people-heading").addClass('active');
        $(".chat-heading").removeClass("active");
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").show(300);
        $(".chat-show-wrap").hide(300);

    });
    //First we will be writtincg code if
    //user clicks on participant icon
    $(document).on("click",".top-left-chat-wrap",function(){
        $(".chat-heading").addClass('active');
        $(".people-heading").removeClass("active");
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").hide(300);
        $(".chat-show-wrap").show(300);

    });

    $(document).on("click",".end-call-wrap",function(){
       $(".top-box-show").css({
        "display":"block"

       }).html('<div class="top-box align-vertical-middle profile-dialogue-show"><h4 class="mt-3" style="text-align:center; color:white;">Leave Meeting</h4><hr> <div class="call-leave-cancel-action d-flex justify-content-center align-items-center w-100"> <a href="/action.html"><button class="call-leave-action btn btn-danger mr-5">Leave</button></a> <button class="call-cancel-action btn btn-secondary">Cancel</button> </div> </div>');

    });
    $(document).mouseup(function(e){
        var container=new Array();
        //Now if we click outide the top-box-show then the abobe div i.e class top-box will become empty and we will stay in the room
        container.push($(".top-box-show"));
        $.each(container,function(key,value){
            if(!$(value).is(e.target) && $(value).has(e.target).length==0){
                $(value).empty();
            }
        })
    })
    $(document).mouseup(function(e){
        var container=new Array();
        //Now if we click outide the top-box-show then the abobe div i.e class top-box will become empty and we will stay in the room
        container.push($(".g-details"));
        container.push($(".g-right-details-wrap"));
        $.each(container,function(key,value){
            if(!$(value).is(e.target) && $(value).has(e.target).length==0){
                $(value).hide();
            }
        })
    })
    //So this part will ckear the whole html code of top-box
    $(document).on("click",".call-cancel-action",function(){
        $('.top-box-show').html('')
    });
    $(document).on("click",".copy_info",function(){
        var $temp=$("<input>");
        $("body").append($temp);
        $temp.val($("meeting_url").text()).select();
        document.execCommand("copy");
        $temp.remove();
        $(".link-conf").show();
        setTimeout(function(){
            $(".link-conf").hide();

        },3000)
    });
    $(document).on("click",".meeting-details-button",function(){
        $(".g-details").slideDown(300);


    });
    $(document).on("click",".g-details-heading-attachment",function(){
        $(".g-details-heading-show").hide();
        $(".g-details-heading-show-attachment").show();
        $(this).adClass('active');
        $(".g-details-heading-detail").removeClass('active');

    });
    $(document).on("click",".g-details-heading-detail",function(){
        $(".g-details-heading-show").show();
        $(".g-details-heading-show-attachment").hide();
        $(this).adClass('active');
        $(".g-details-heading-attachment").removeClass('active');

    });
    $(document).on("click",".option-icon",function(){
        $(".recording-show").toggle(300);
    })
    $(document).on("click",".start-record",function(){
        $(this).removeClass().addClass("stop-record btn-danger text-dark").text("Stop Recording");
        startRecording();
 });
 //Now this onstop will not fire automatically  we need to do it
 $(document).on("click",".stop-record",function(){
    $(this).removeClass().addClass("start-record btn-dark text-danger").text("Start Recording");
   mediaRecoder.stop();
});
    var mediaRecoder;
    //To store the reorded file
    var chunks=[];

    async function captureScreen(mediaContraints={
        video:true
    }){
        const screenStream=await navigator.mediaDevices.getDisplayMedia(mediaContraints)
        return screenStream;
    }
    async function captureAudio(mediaContraints={
        video:false,
        audio:true
    }){
        const audiostream=await navigator.mediaDevices.getUserMedia(mediaContraints)
        return audiostream;
    }
    async function startRecording(){
        const screenStream=await captureScreen();
        const audiostream=await captureAudio();
        const stream=new MediaStream([...screenStream.getTracks(),...audiostream.getTracks()])
        mediaRecoder= new MediaRecorder(stream);
        //This mediaRecoder is useful for start and stop the recording
        mediaRecoder.start();
        //Now before stopping the media recoder we have to confirm that the reoded data has been stored in array variable
        mediaRecoder.onstop=function(e){
            var clipName=prompt("Enter a name for your recording");
            stream.getTracks().forEach((track)=>track.stop());
            const blob=new Blob(chunks,{
                //webm:lower size file in high quality
                type:"video/webm",
            })
            const url=window.URL.createObjectURL(blob);
            const a =document.createElement("a");
            a.style.display="none";
            a.href=url;
            a.download=clipName+".webm";
            document.body.appendChild(a);
            a.click();
            setTimeout(()=>{
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

            },100)

          
}
mediaRecoder.ondataavailable=function(e){
    chunks.push(e.data);

}
        





    }
 

    return{
        _init:function(uid,mid){
            init(uid,mid);
        }
    
    }
})(); 
