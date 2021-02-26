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

bot.command('record', (ctx) => {
    MongoClient(url).connect(async (err, db) => {
        if (err) throw err;
        var dbo = db.db(key.DB);
        var res = await dbo.collection(`${ctx.message.chat.id}`).findOne({"id": `${ctx.message.chat.id}`});

        var time = formatTime(res.recordtime)

        ctx.reply(`Current record for not saying vore for in this chat is: \n${time}`);

        db.close();
    });
});


//When it detects any text
bot.on('message', async (ctx) => {
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

        //Connect to DB
        const db = await MongoClient.connect(url, {
            useNewUrlParser: true,useUnifiedTopology: true
        });

        //set new vore time
        var voreTime = Date.now();

        var dbo = db.db(key.DB);

        var user = await dbo.collection(`${ctx.message.chat.id}`).findOne({"id": `${ctx.message.from.id}`});
        var localobj = await dbo.collection(`${ctx.message.chat.id}`).findOne({"id": `${ctx.message.chat.id}`});

        if (user == null) {
            user = {
                id: `${ctx.message.from.id}`,
                name: `${ctx.message.from.first_name}`,
                vorecount: 0,
                lastvoretime: voreTime,
                currentmodifier: 1
            };
        }

        //Mute user, editing perms
        var mutetime = (voreTime / 1000) + (60 * user.currentmodifier);

        var extras = { 
                        "permissions" : {
                            "can_send_messages" : false // CHANGE TO FALSE 
                        },
                        "until_date" : mutetime
                    };
                    
        console.log(mutetime);
        ctx.restrictChatMember(ctx.message.from.id, extras)
            .catch((err) => {
                console.error(`ERROR CODE: ${err.code}`);
            });
        console.log(`User muted for ${user.currentmodifier} minute (current modifier: ${user.currentmodifier})`);

        //Relevant updating
        //If user had said vore within 5 mins of the last time, add 1 minute to mute
        if(user.lastvoretime != null || user.currentmodifier != null) {
            if((voreTime - user.lastvoretime)/1000 < 300) {
                user.currentmodifier++;
            } else {
                user.currentmodifier = 1;
            }
        } else {
            user.lastvoretime = voreTime;
            user.currentmodifier = 1;
        }

        if (localobj == null) {
            localobj = {
                id: `${ctx.message.chat.id}`,
                lastvoretime: voreTime,
                recordtime: 0
            };
        }

        //check for new record
        var newrecordstr = "";
        var newrecord = voreTime - localobj.lastvoretime;

        console.log(`record time: ${localobj.recordtime}`);
        console.log(`last vore time: ${localobj.lastvoretime}`);

        if((newrecord) > localobj.recordtime) {
            newrecordstr = "NEW RECORD!";
            localobj.recordtime = newrecord;
        }

        //print print print
        var time = formatTime(newrecord);
        ctx.reply(`${newrecordstr} \n ${ctx.message.from.first_name} has sinned, it has been ${time} since someone has mentioned vore. They have been muted for ${user.currentmodifier} minutes.`);

        localobj.lastvoretime = voreTime;

        await dbo.collection(`${ctx.message.chat.id}`).updateOne({"id": `${ctx.message.chat.id}`}, {
            $set: localobj
        }, {
            upsert: true
        }, (err) => {
            if (err) throw err;
        });

        await dbo.collection(`${ctx.message.chat.id}`).updateOne({"id": `${ctx.message.from.id}`}, {
            $set: user
        }, {
            upsert: true
        }, (err) => {
            if (err) throw err;
        });

    }
});


//Start the bot with a little message
bot.launch().then((o, e) => {
    console.log("Starting bot...");
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