export const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😀",
    emojis:
      "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 🤗 🤔 😎 🥳 😕 🙁 😮 😳 🥺 🥹 😢 😭 😱 😤 😡 🤬 😴 🤒 🤢 🤧 🥶 🥵 🤯 👻 💩".split(
        " ",
      ),
  },
  {
    name: "People",
    icon: "👋",
    emojis:
      "👋 🤚 ✋ 🖐️ 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 👍 👎 👏 🙌 🫶 🙏 💪 🦾 🦵 👂 👃 👀 👶 🧒 🧑 👨 👩 🧓 🙋 🙆 🙅 🤷 🤦 💃 🕺 🏃 🚶".split(
        " ",
      ),
  },
  {
    name: "Animals",
    icon: "🐻",
    emojis:
      "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🦇 🐺 🐴 🦄 🐝 🦋 🐞 🐢 🐍 🦎 🐙 🦑 🦀 🐠 🐟 🐬 🐳 🦈 🐘 🦒 🐕 🐈 🦜 🦢".split(
        " ",
      ),
  },
  {
    name: "Food",
    icon: "🍕",
    emojis:
      "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥝 🍅 🥑 🥦 🥕 🌽 🥐 🍞 🧀 🥚 🍳 🥞 🥓 🍔 🍟 🍕 🌮 🌯 🥗 🍝 🍜 🍣 🍱 🍰 🎂 🍪 🍩 🍫 🍿 ☕ 🧃 🥤 🍺 🍷".split(
        " ",
      ),
  },
  {
    name: "Travel",
    icon: "🚗",
    emojis:
      "🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🚚 🚜 🛵 🏍️ 🚲 🛴 🚦 ⚓ ⛵ 🚤 🚢 ✈️ 🛫 🛬 🚁 🚀 🛸 🌍 🗺️ 🧭 🏔️ 🏕️ 🏖️ 🏝️ 🏠 🏢 🏥 🏫 🏰 🗼 🌅 🌆 🌉".split(
        " ",
      ),
  },
  {
    name: "Activities",
    icon: "⚽",
    emojis:
      "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🛹 🛼 ⛸️ 🎿 🏂 🏋️ 🤼 🤸 🏇 🧘 🏄 🏊 🏆 🥇 🥈 🥉 🎖️ 🎨 🎬 🎤 🎧 🎹 🥁 🎷 🎸 🎻 🎲 🎯 🎳 🎮 🧩 🎉 🎊".split(
        " ",
      ),
  },
  {
    name: "Objects",
    icon: "💡",
    emojis:
      "💌 💝 💖 💗 💓 💞 💕 💔 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💯 💢 💥 💫 💦 💬 💭 💤 💻 📱 ☎️ 📷 🎥 💡 🔦 📚 📝 📌 ✂️ 🔒 🔑 🔨 🔧 🧰 💉 💊 🛏️ 🚿 🛒 🎁 🏷️".split(
        " ",
      ),
  },
  {
    name: "Symbols",
    icon: "✅",
    emojis:
      "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ ☯️ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ✅ ❎ ❌ ⭕ 🚫 ❗ ❓ ‼️ ⁉️ ⚠️ ➕ ➖ ➗ ✖️ ♾️ ✔️ ☑️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ ⭐ 🌟 ✨ ⚡ 🔥 💧 🌈 ☀️ 🌙".split(
        " ",
      ),
  },
];
export const QUICK_MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 20;
export const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/3gpp",
  "video/3gpp2",
  "application/pdf",
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/3gpp",
]);
