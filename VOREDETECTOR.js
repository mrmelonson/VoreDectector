const { Telegraf } = require('telegraf')

const key = require("./key.json");

//Dont share this key
const bot = new Telegraf(key.key);

//try /start in the bot's dms
bot.start((ctx) => ctx.reply('Welcome!'));

//When it detects any text
bot.on('text', (ctx) => {
    if (ctx.message.text.toLowerCase().replace(/ /g,'').trim().includes("vore")) {
        //look for vore here
        console.log("Vore has been mentioned")
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
            ctx.reply(`it has been ${time} since someone has mentioned vore`);
            global.voreTime = new Date().getTime();
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

