const { Telegraf } = require('telegraf');
const MongoClient = require('mongodb').MongoClient;

const key = require("./key.json");
const url = key.DB_url;

//Dont share this key
const bot = new Telegraf(key.key);

//try /start in the bot's dms
bot.start((ctx) => ctx.reply('Welcome!'));

bot.command(['scoreboard','voreboard'], (ctx) => {
    MongoClient(url).connect(async (err, db) => {
        if (err) throw err;
        var dbo = db.db(key.DB);
        var top = await dbo.collection(`${ctx.message.chat.id}`).find().sort({vorecount:-1, _id:1}).limit(5);
        var topcount = await top.count();


        var boardstring = `Top 5 vore posters! \n`;
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
bot.on('text', (ctx) => {
    if (ctx.message.text.toLowerCase().replace(/ /g,'').trim().includes("vore")) {
        //look for vore here
        console.log(`${ctx.message.from.username} has sinned`)
        
        if(global.voreTime < 0) {
            global.voreTime = new Date().getTime();
            ctx.reply('👀');
        } else {
            //TIME TIME TIME
            var s = new Date().getTime() - global.voreTime;
            var ms = s % 1000;
            s = s / 1000;
            var days = Math.floor(s / 86400);
            s %= 86400;
            var hrs = Math.floor(s / 3600);
            s %= 3600;
            var mins = Math.floor(s / 60);
            var secs = Math.floor(s % 60);

            //Formatting nicely
            var time = ""
            if(days > 0) {
                time += `${days} days `;
            } else if (hrs > 0) {
                time += `${hrs} hours `;
            } else if (mins > 0) {
                time += `${mins} minutes and `;
            } 
            time += `${secs}.${pad(ms,3)} seconds`;


            //Print print print
            ctx.reply(`${ctx.message.from.first_name} has sinned, it has been ${time} since someone has mentioned vore`);
            global.voreTime = new Date().getTime();

            MongoClient.connect(url, function(err, db) {
                if (err) throw err;
                var dbo = db.db(key.DB)
                var query = {"id" : `${ctx.message.from.id}`};
                var updateobj = {};
                dbo.collection(`${ctx.message.chat.id}`).findOne(query, (err, res) => {
                    if (err) throw err;
                    updateobj = res;
                    if (updateobj == null) {
                        updateobj = {id: `${ctx.message.from.id}`, name: `${ctx.message.from.first_name}`, vorecount: 0};
                    }

                    updateobj.vorecount++;
                    
                    dbo.collection(`${ctx.message.chat.id}`).updateOne(query, {$set: updateobj}, {upsert: true}, (err) => {
                        if (err) throw err;
                    });
                    db.close();
                });
            });
            
        }
        
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

