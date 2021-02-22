const {
    Telegraf
} = require('telegraf');
const MongoClient = require('mongodb').MongoClient;

const key = require("./key.json");
const url = key.DB_url;

//Dont share this key
const bot = new Telegraf(key.key);

//try /start in the bot's dms
bot.start((ctx) => ctx.reply('Welcome!'));

bot.command(['scoreboard', 'voreboard'], (ctx) => {
    MongoClient(url).connect(async (err, db) => {
        if (err) throw err;
        var dbo = db.db(key.DB);
        var top = await dbo.collection(`${ctx.message.chat.id}`).find().sort({
            vorecount: -1,
            _id: 1
        }).limit(20);

        var boardstring = `Top vore posters! \n`;
        var rank = 1;
        await top.forEach((o) => {
            boardstring += `${rank}. ${o.name} has said 'vore' ${o.vorecount} times \n`
            rank++
        })

        ctx.reply(boardstring);

        db.close();
    });
});


//When it detects any text
bot.on('message', (ctx) => {
    var voreflag = false;
    if(ctx.message.text && ctx.message.text.toLowerCase().replace(/ /g, '').trim().includes("vore")) {
        voreflag = true;
    } 
    else if (ctx.message.caption && ctx.message.caption.toLowerCase().replace(/ /g, '').trim().includes("vore")) {
        voreflag = true;
    }

    if (voreflag) {
        //look for vore here
        console.log(`${ctx.message.from.username} has sinned`)

        //database stuff
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            var dbo = db.db(key.DB)
            var query = {
                "id": `${ctx.message.from.id}`
            };
            var updateobj = {};
            dbo.collection(`${ctx.message.chat.id}`).findOne(query, (err, res) => {
                if (err) throw err;
                updateobj = res;
                if (updateobj == null) {
                    updateobj = {
                        id: `${ctx.message.from.id}`,
                        name: `${ctx.message.from.first_name}`,
                        vorecount: 0,
                        lastvoretime: global.voreTime,
                        currentmodifier: 1
                    };
                }

                if(updateobj.lastvoretime != null || updateobj.currentmodifier != null) {
                    if((Date.now() - updateobj.lastvoretime)/1000 < 300) {
                        updateobj.currentmodifier++;
                    } else {
                        updateobj.currentmodifier = 1;
                    }
                } else {
                    updateobj.lastvoretime = Date.now();
                    updateobj.currentmodifier = 1;
                }

                //Mute user
                var mutetime = (Date.now() / 1000) + (60 * updateobj.currentmodifier);
                var extras = { 
                                "permissions" : {
                                    "can_send_messages" : false
                                },
                                "until_date" : mutetime
                            };
                console.log(mutetime);
                ctx.restrictChatMember(ctx.message.from.id, extras)
                    .catch((err) => {
                        console.error(err);
                    });
                console.log(`User muted for ${updateobj.currentmodifier} minute (current modifier: ${updateobj.currentmodifier})`);
                
                if (global.voreTime < 0) {
                    //First instance?
                    global.voreTime = new Date().getTime();
                    ctx.reply('👀');
                } else {
                    //Print print print
                    var time = formatTime(new Date().getTime() - global.voreTime);
                    ctx.reply(`${ctx.message.from.first_name} has sinned, it has been ${time} since someone has mentioned vore. They have been muted for ${updateobj.currentmodifier} minutes.`);
                }

                updateobj.lastvoretime = Date.now();
                updateobj.vorecount++;

                dbo.collection(`${ctx.message.chat.id}`).updateOne(query, {
                    $set: updateobj
                }, {
                    upsert: true
                }, (err) => {
                    if (err) throw err;
                });
                db.close();
            });
        });

    }
});


//Start the bot with a little message
bot.launch().then((o, e) => {
    console.log("Starting bot...");
    global.voreTime = -1;
});

//Pad function for time element in the voretime
function pad(n, z) {
    z = z || 2;
    return ('00' + n).slice(-z);
}

function formatTime(t) {
            var s = t
            s = s / 1000;
            var days = Math.floor(s / 86400);
            s %= 86400;
            var hrs = Math.floor(s / 3600);
            s %= 3600;
            var mins = Math.floor(s / 60);
            var secs = Math.floor(s % 60);

            //Formatting nicely
            var time = ""
            var and = false
            if (days > 0) {
                time += `${days} days `;
                and = true
            }
            if (hrs > 0) {
                time += `${hrs} hours `;
                and = true
            }
            if (mins > 0) {
                time += `${mins} minutes `;
                and = true
            }
            if (and) {
                time += "and ";
            }
            time += `${secs} seconds`;

            return time;
}