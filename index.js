const { Client } = require("discord.js");
const {
  NoSubscriberBehavior,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
} = require("@discordjs/voice");

const { TOKEN, CHANNEL, STATUS, LIVE } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Client({
  disableEveryone: true,
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"],
});
if (!CHANNEL || Number(CHANNEL) == NaN) {
  console.log("Please provide a valid channel ID.");
  process.exit(1);
} else if (!LIVE) {
  console.log("Please provide a valid Youtube URL.");
  process.exit(1);
}

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
    maxMissedFrames: Math.round(5000 / 20),
  },
});

async function attachRecorder() {
  stream = await ytdl(LIVE);
  stream.on("error", console.log);
  player.play(createAudioResource(stream, { inputType: StreamType.Arbitrary }));
  console.log("Attached recorder - ready to go!");
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectToChannel(channel) {
  return new Promise(async (resolve, reject) => {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });
    connection.once(VoiceConnectionStatus.Ready, async () => {
      await attachRecorder();
      resolve(connection);
    });
    await delay(180000);
    reject("Connection was failed to connect to VC");
  });
}

player.on("stateChange", async (oldState, newState) => {
  if (
    oldState.status === AudioPlayerStatus.Idle &&
    newState.status === AudioPlayerStatus.Playing
  ) {
    console.log("Playing audio output on audio player");
  } else if (newState.status === AudioPlayerStatus.Idle) {
    console.log("Playback has stopped. Attempting to restart.");
    await attachRecorder();
  }
});

player.on("error", async () => {
  try {
    let channel =
      client.channels.cache.get(CHANNEL) ||
      (await client.channels.fetch(CHANNEL));
    await attachRecorder();
    const connection = await connectToChannel(channel);
    connection.subscribe(player);
    console.log("Playing now!");
  } catch (error) {
    console.log(error);
  }
});

client.on("ready", async () => {
  client.user.setActivity({ name: STATUS, type: "PLAYING" });
  console.log("discord.js client is ready!");
  let channel =
    client.channels.cache.get(CHANNEL) ||
    (await client.channels.fetch(CHANNEL));
  if (!channel) {
    console.log(
      "The provided channel ID doesn't exist, or I don't have permission to view that channel. Because of that, I'm aborting now."
    );
    return process.exit(1);
  } else if (channel.type !== "GUILD_STAGE_VOICE") {
    console.log(
      "The provided channel ID is NOT voice channel. Because of that, I'm aborting now."
    );
    return process.exit(1);
  }

  try {
    const connection = await connectToChannel(channel);
    connection.subscribe(player);
    console.log("Playing now!");
  } catch (error) {
    console.log(error);
  }
});

client.login(TOKEN); //Login

process.on("unhandledRejection", console.log);
