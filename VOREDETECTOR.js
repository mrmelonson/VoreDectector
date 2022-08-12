const {
    Telegraf
} = require('telegraf');
const mysql = require('mysql');
const key = require("./key.json");

//Dont share this key
const bot = new Telegraf(key.key);

//try /start in the bot's dms
bot.start((ctx) => ctx.reply('Welcome!'));

var con = mysql.createConnection({
    host: "localhost",
    user: key.username,
    password: key.password,
    database: key.mydb
});


bot.command(['scoreboard', 'voreboard'], (ctx) => {
    var table = `chat_${-ctx.message.chat.id}`;
    var sqlq = `SELECT * FROM ${table} ORDER BY count DESC LIMIT 5`
    con.query(sqlq, async (e, r) => {
        if (e) {
            console.log("No table")
            ctx.reply("Nobody has sinned, yet...");
            return;
        };
        var counts = [];
        var promisearray = [];
        for (let i = 0; i < r.length; i++) {
            if(!isNaN(r[i].user_id)) { 
                promisearray.push((ctx.getChatMember(r[i].user_id)));
                counts.push(r[i].count)
            }
        }

        var formatString = "Scoreboard:\n"

        if(promisearray.length > 0) {
            Promise.all(promisearray).then((values) => {
                //console.log(values[1].user);
                for(let i = 0; i < values.length; i++) {
                    formatString += `${i+1}. ${values[i].user.first_name}: ${counts[i]}\n`;
                }
                ctx.reply(formatString);
            });
        }
    });

});



bot.command('record', (ctx) => {
    var table = `chat_${-ctx.message.chat.id}`
    con.query(`SELECT count FROM ${table} WHERE user_id='record'`, (e,r) => {
        if (e) {
            console.log("No table")
            ctx.reply("Nobody has sinned, yet...");
            return;
        };
        ctx.reply(`Current record is: ${formatTime(r[0].count)}`);
        console.log(`User: ${ctx.from.id} requesting record for table: ${table}`);
    })
});


//When it detects any text
bot.on('message', async (ctx) => {
    var voreflag = false;

    var messagestr;

    if(ctx.message.text) {
        messagestr = ctx.message.text;
    } 
    else if (ctx.message.caption_entities) {
        messagestr = ctx.message.caption;
    }

    if(messagestr) {
        var messagearr = messagestr.replace(/[.,\/#!?$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().split(" ");
        //console.log(messagearr);
        for (let i = 0; i < messagearr.length; i++) {
            if(messagearr[i] === "vore") {
                voreflag = true;
            }
            
        }
    }

    if(voreflag) {
        var user_id = ctx.message.from.id;

        if(ctx.message.chat.type === "private") {
            console.log(`Detected vore in DMs`)
            return;
        }

        var table = `chat_${-ctx.message.chat.id}`

        console.log(`Vore detected! From: ${user_id}`);

        var getsql = `SELECT * FROM ${table} WHERE user_id = ${user_id.toString()}`;
        con.query(getsql, (err, result) => {
            var notable = false;
            if (err) { 
                if (err.errno === 1142 || err.errno === 1146) {
                    console.log(`no table found, creating new table: ${table}`);
                    con.query(`CREATE TABLE ${table} (user_id VARCHAR(20), count BIGINT)`, function (err, result) {
                        if (err) throw err;
                    });
                    notable = true;
                }
            }
            if(notable || result == "") {
                console.log(`creating user: ${user_id}`);
                con.query(`INSERT INTO ${table} (user_id, count) VALUES (${user_id}, 1)`, function (err, r) {
                    if (err) throw err;
                });
            } else {;
                //console.log(result[0].user_id);
                con.query(`UPDATE ${table} SET count=${result[0].count + 1} WHERE user_id='${user_id}'`, function (err, result) {
                    if (err) throw err;
                });
                
            }


            console.log(`Updated user: ${user_id}`);

            var getsql = `SELECT * FROM ${table} WHERE user_id='lastvore' OR user_id='record'`;
            con.query(getsql, function (err, result) {
                if(err) throw err;
                var voretime = Date.now();
                if(result == "") {
                    console.log(`No timestamps, creating new timestamp`);
                    con.query(`INSERT INTO ${table} (user_id, count) VALUES ('lastvore', ${voretime})`, function (err, r) {
                        if (err) throw err;
                    });
                    con.query(`INSERT INTO ${table} (user_id, count) VALUES ('record', 0)`, function (err, r) {
                        if (err) throw err;
                    });
                }
                else {
                    //check for new record
                    //console.log(result);
                    var lastvore = result[0].count;
                    var record = result[1].count;
                    
                    var newrecordstr = "";
                    var newrecord = voretime - lastvore;

                    //console.log(`record time: ${localobj.recordtime}`);
                    //console.log(`last vore time: ${localobj.lastvoretime}`);
                    
                    var time = formatTime(newrecord);
                    var newrecordflag = false;

                    if((newrecord) > record) {
                        newrecordstr = "NEW RECORD!";
                        record = newrecord;
                        newrecordflag = true;
                        console.log("New record.")
                    }

                    con.query(`UPDATE ${table} SET count=${voretime} WHERE user_id='lastvore'`, function (err, result) {
                        if (err) throw err;
                    });

                    if(newrecordflag) {
                        con.query(`UPDATE ${table} SET count=${record} WHERE user_id='record'`, function (err, result) {
                            if (err) throw err;
                        });
                    }

                    console.log(`Updated table: ${table}`);
                    ctx.reply(`${newrecordstr} \n${ctx.message.from.first_name} has sinned, it has been ${time} since someone has mentioned vore. User has been muted for [2 minutes]`);
                }
            });

            var payload = { 
                "permissions" : {
                    "can_send_messages" : false // CHANGE TO FALSE 
                }
            };

            ctx.restrictChatMember(user_id, payload)
                .catch((err) => {
                    console.error(`ERROR CODE: ${err}`);
                    return;
                });
                
                console.log(`Muting user: ${user_id}`);
                setTimeout(function(){
                    var payload = { 
                        "permissions" : {
                            "can_send_messages" : true // CHANGE TO FALSE 
                        }
                    };
                    ctx.restrictChatMember(user_id, payload).catch((err) => {
                        console.error(`ERROR CODE: ${err}`);
                        return;
                    })
                    console.log(`Unmuted user: ${user_id}`)
                }, 60000);


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