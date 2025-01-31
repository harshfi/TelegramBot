import { Telegraf } from "telegraf";
import user from "./src/models/user.js";
import {message} from "telegraf/filters"
import Event from "./src/models/Event.js";

import connectDB from "./src/config/db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const bot = new Telegraf(process.env.BOT_TOKEN);





const removeOldIndexes = async () => {
    try {
        const existingIndexes = await user.collection.indexes();
        if (existingIndexes.some(index => index.name === "username_1")) {
            await user.collection.dropIndex("username_1");
            console.log("Dropped old unique index on username.");
        }
    } catch (err) {
        console.error("Error dropping index:", err);
    }
};

  try{
    connectDB();
    await removeOldIndexes();  // Ensure old indexes are removed before queries
        console.log("✅ Database connected successfully!");
  }
    catch(err){
        console.log(err);
        process.kill(process.pid, 'SIGTERM');
    }

bot.start(async(ctx)=>{
    const from= ctx.update.message.from;
    console.log(from)
    console.log(from)
    try{
        await user.findOneAndUpdate(
            { tgId: from.id }, // Search by `tgId`, not `_id`
            {
                tgId: from.id,
                firstName: from.first_name,
                lastName: from.last_name,
                isBot: from.is_bot,
                
            },
            { upsert: true, new: true }
        );
        
         console.log("hi",)
        await ctx.reply(`Hey ${from.first_name} Welcome to DailyBot! You have been successfully registered!`);
       
    }
    catch(err){
        console.log(err);
        await ctx.reply(`Hey ${from.first_name} There was an error while registering you!`);
    }
        
})


bot.command("generate", async (ctx) => {
    const from = ctx.update.message.from;

    const {message_id: messageId} = await ctx.reply(`Generating posts for ${from.first_name}...`);
    const {message_id: stickerWaitingID} = await ctx.replyWithSticker('CAACAgIAAxkBAANOZ5uj3JKk0pWgz_ZGXD1VH2zk3NUAAm4FAAI_lcwKhjrZXYi8tzU2BA')

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfTheDay = new Date();
    endOfTheDay.setHours(23, 59, 59, 999);

    // Get events for the user
    const events = await Event.find({
        tgId: from.id,
        createdAt: { $gte: startOfDay, $lte: endOfTheDay },
    });

    if (events.length === 0) {
        await ctx.deleteMessage(messageId);
        await ctx.deleteMessage(stickerWaitingID);
        ctx.reply("No events for the day");
        return;
    }

    console.log("Events:", events);

    // Role-assisted system instruction
    const systemInstruction = `
        You are a professional social media assistant.
        Your job is to create engaging and well-structured posts for Facebook, LinkedIn, and Twitter.
        - Keep Facebook posts engaging and slightly informal.
        - Keep LinkedIn posts professional and insightful.
        - Keep Twitter posts short and impactful (within 280 characters).
    `;

    const prompt = `
        ${systemInstruction}
        Here are today's events: ${events.map((e) => e.text).join(", ")}
        Generate social media posts accordingly.
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        await user.findOneAndUpdate(
            {
                tgId: from.id,
            },
            {
                $inc: {
                    promptTokens: result.response.usageMetadata.promptTokenCount,
                    completionTokens: result.response.usageMetadata.candidatesTokenCount

                }
            }
        )
        //  console.dir(result.response.usageMetadata)
        await ctx.deleteMessage(messageId);
        await ctx.deleteMessage(stickerWaitingID);
        await ctx.reply(responseText);
    } catch (error) {
        console.error("Error generating content:", error);
        ctx.reply("Sorry, I couldn't generate the posts. Try again later.");
    }
});
bot.on('sticker',async(ctx)=>{

console.log(ctx.update.message)

})
bot.on(message('text'),async(ctx)=>{
    const from =ctx.update.message.from;

    const message =ctx.update.message.text;
    try{
      await Event.create({
        text: message,
        tgId:from.id
      })

     await ctx.reply('Noted , Keep texting me your thoughts, To genrate the posts, just enter the command /generate')
    }catch(err){
        console.log(err);
        await ctx.reply("something went wrong")
    }

   
})



bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))