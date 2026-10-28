// lib/copy.ts — semua teks bot (SPEC §5). kalimat utuh & ramah, huruf kecil, emoji sebagai ikon
// dari daftar §5.9, nama tombol sama persis dengan yang disebut di teks, dan setiap pesan diakhiri
// langkah berikutnya. kata "batal" tidak dipakai di teks atau tombol mana pun (§5.2).
// balasan dikirim dengan parse_mode html, jadi teks dari user wajib lewat esc().

import { formatDay, formatDayLong, formatDuration, formatKg, type Unit } from "./format";
import type { Comparison } from "./card";
import { formatCount, type Setara } from "./setara";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const latihan = (split: string | null) => (split ? `latihan ${esc(split)}` : "latihan");

export const PROGRAM_LABEL = {
  ppl: "push pull legs",
  upper_lower: "upper lower",
  ppl_ul: "ppl + upper lower",
  full_body: "full body",
  bebas: "bebas",
} as const;

export const DAY_LABEL = ["sen", "sel", "rab", "kam", "jum", "sab", "min"] as const;
// tombol otot di pencarian latihan (14 tombol); "lainnya" = lengan bawah & latihan lain
export const MUSCLES = [
  "dada",
  "punggung",
  "bahu",
  "bisep",
  "trisep",
  "paha depan",
  "paha belakang",
  "bokong",
  "betis",
  "perut",
  "full body",
  "kardio",
  "mobilitas",
  "lainnya",
] as const;
export const OTHER_MUSCLES = ["lengan bawah", "lain"];
// saringan alat di daftar latihan (alat lain tetap muncul di "semua")
export const EQUIPMENT = ["semua", "barbel", "dumbel", "mesin", "kabel", "berat badan"] as const;

// emoji benda pembanding "setara dengan"
const SETARA_EMOJI: Record<string, string> = {
  durian: "🥭",
  kucing: "🐈",
  galon: "💧",
  beras: "🌾",
  kulkas: "🧊",
  komodo: "🦎",
  orangutan: "🦧",
  motor: "🛵",
  piano: "🎹",
  sapi: "🐄",
  badak: "🦏",
  mobil: "🚗",
  gajah: "🐘",
  paus: "🐋",
};

// `latihan push kamis 22 okt`
export const sessionLabel = (split: string | null, at: Date, timeZone: string) =>
  `${latihan(split)} ${formatDayLong(at, timeZone).split(",")[0]} ${formatDay(at, timeZone)}`;

// `📅 push pull legs — sen pull · sel legs · kam push`
export const scheduleLine = (program: string, days: [string, string][]) =>
  `📅 ${esc(program)} — ${days.map(([d, s]) => `${d} ${esc(s)}`).join(" · ")}`;

type Kind = "beban" | "durasi" | "kardio";

// cara ngetik angka pertama kali, selalu dengan artinya
const HOW_TO_TYPE: Record<Kind | "bb", string> = {
  beban: "ketik beban dan rep ya, contoh <code>60x8</code> (artinya 60 kg, 8 rep).",
  bb: "ketik jumlah rep ya, contoh <code>8</code> (artinya 8 rep pakai berat badan).",
  durasi: "ketik lamanya ya, contoh <code>60s</code> (artinya 60 detik).",
  kardio: "ketik lamanya ya, contoh <code>20m</code> (20 menit) atau <code>20m 3km</code> (20 menit, 3 km).",
};

const MENU_HINT = "tekan 🏋️ kartu latihan di bawah";

export const copy = {
  // ---------- §5.2 menu bawah (2 tombol) ----------
  menu: { card: "🏋️ kartu latihan", help: "❓ bantuan" },
  // label menu versi sebelumnya: tetap dikenali sampai menunya diganti (tidak pernah ditampilkan)
  legacyMenu: {
    card: ["🏋️ latihan", "pilih latihan"],
    finish: ["🏁 selesai", "selesai latihan"],
    del: ["↩️ batal", "hapus set terakhir"],
    help: ["cara pakai"],
  },
  menuUpdated: "menu di bawah udah aku perbarui ya: 🏋️ kartu latihan buat nyatet, ❓ bantuan kalau bingung.",

  // ---------- profil bot di telegram (nama, deskripsi sebelum /start, deskripsi singkat) ----------
  botProfile: {
    name: "spotter",
    description:
      "👋 halo! aku spotter dari spot., teman latihanmu di gym. aku nyatet tiap set yang kamu angkat, ngisi angka dari latihan sebelumnya, ngingetin jadwal, dan kirim rekap + kartu story tiap kamu selesai latihan. yuk mulai!",
    short: "spotter dari spot. — teman latihan yang nyatet tiap set kamu di gym.",
  },

  // ---------- §5.3 kenalan ----------
  // pesan 1: perkenalan (siapa spotter) → apa yang dia bantu → cara pakai. menu bawah ikut dipasang di sini.
  welcome: (name: string | null) =>
    [
      `👋 halo${name ? ` ${esc(name.toLowerCase())}` : ""}! kenalin, aku spotter, teman latihanmu dari spot.`,
      "aku bantuin kamu nyatet latihan di gym: tiap set yang kamu angkat, angka dari latihan sebelumnya, sampai rekor baru. kamu fokus angkat, sisanya serahin ke aku!",
      "",
      "<b>begini cara pakainya:</b>",
      "1. di gym, tekan 🏋️ kartu latihan di bawah, pilih split hari ini (gak harus sama kayak jadwal), terus pilih latihannya dari daftar.",
      "2. aku kirim kartu latihan yang angkanya udah keisi dari latihan sebelumnya. tiap selesai satu set, tekan ✅ catat. angkanya beda? ubah pakai ➖ ➕ dulu, atau ketik aja, misal <code>70x8</code> (70 kg, 8 rep).",
      "3. selesai satu latihan? tekan ➡️ latihan berikutnya, terus pilih dari daftar, atau ketik aja nama latihannya. mau ganti split di tengah jalan? tekan 🔄 ganti latihan.",
      "4. udah beres? tekan 🏁 selesai latihan, nanti aku kirim rekap + kartu story.",
      "",
      "salah pencet? ada ↩️ hapus set terakhir di kartu. bingung? tekan ❓ bantuan kapan aja.",
    ].join("\n"),
  // pesan 2: tawaran jadwal
  welcomeSchedule: (schedule: string) =>
    ["satu lagi: biar aku bisa ngingetin jadwal, aku pakai jadwal ini dulu ya:", schedule, "cocok?"].join("\n"),
  welcomeButtons: { yes: "✅ oke, pakai ini", own: "✏️ atur sendiri" },
  // pesan jadwal berubah jadi catatan jadwal + ajakan latihan coba
  scheduleSaved: (schedule: string) =>
    [
      "jadwalmu:",
      schedule,
      "bisa diubah kapan aja lewat /start.",
      "",
      "sip, semua udah siap 🙌 mau coba nyatet satu set dulu? cuma 30 detik dan gak masuk ke catatan beneran.",
    ].join("\n"),
  // atur sendiri: 3 langkah di pesan yang sama, tiap langkah ada nomornya + [‹ kembali]
  askProgram: "oke, kita atur sendiri ya, cuma 3 pertanyaan.\n1/3 · kamu biasanya latihan pakai program apa?",
  askFrequency: (program: string) => `2/3 · ${esc(program)}, sip. seminggu biasanya latihan berapa kali?`,
  // preview = jadwal dari hari yang sudah dipilih, berubah tiap kali hari diketuk
  askDays: (n: number, picked: number, preview: string | null) =>
    [
      `3/3 · hari apa aja? ketuk ${n} hari (yang ada ✓ berarti dipilih)${picked ? `, udah ${picked}` : ""}. kalau udah, tekan selesai.`,
      ...(preview ? ["", `jadinya: ${preview}`] : []),
    ].join("\n"),
  needDay: "pilih minimal satu hari dulu ya.",
  daysDone: "selesai",
  stepBack: "‹ kembali",
  tourButtons: { practice: "▶️ coba sekarang (30 detik)", ok: "👍 ngerti" },
  startAgain: "👋 halo lagi, spotter di sini! mau atur ulang jadwal?",
  startAgainButtons: { yes: "✏️ atur ulang", no: "gak usah" },
  startKeep: `oke, jadwalnya tetap. kalau udah di gym, ${MENU_HINT} ya.`,

  // ---------- §5.4 latihan coba ----------
  practice: {
    name: "bench press",
    step1: "ini kartu latihan. angkanya udah aku isi. coba tekan ✅ catat.",
    step2: "✅ mantap, set pertama kecatat! kalau angkanya beda, ubah dulu pakai ➖ ➕. coba tekan ➕ 1 rep, terus ✅ catat lagi.",
    done: "🎉 gampang kan? kalau semua latihan udah beres, tekan 🏁 selesai latihan di kartu. sampai ketemu di gym 💪",
    doneButton: "👍 ngerti",
    typed: "bisa juga diketik gitu 👍",
  },

  // ---------- §5.5 kartu latihan ----------
  card: {
    title: (name: string, order: number, target: number, yesterday: boolean) =>
      `🏋️ <b>${esc(name)}</b> · set ${order}${order <= target ? ` dari ${target}` : ""}${yesterday ? " · 📅 kemarin" : ""}`,
    // kartu pertama sesi: ganti baris "latihan 1 dari 7 hari ini"
    opening: (split: string | null, total: number) =>
      `yuk mulai ${latihan(split)}! hari ini ada ${total} latihan, ini yang pertama.`,
    position: (split: string | null, position: number, total: number) =>
      `${split ? `${esc(split)} · ` : ""}latihan ${position} dari ${total} hari ini`,
    fromLast: (when: string, order: number, label: string) => `${when} set ${order} kamu ${label}, udah aku isi di bawah.`,
    suggest: (step: string) => `saran: +${step} karena minggu lalu kerasa ringan.`,
    earlierToday: (name: string, chips: string[]) => `${esc(name)} udah kamu kerjain tadi (${chips.join(" · ")}). mau nambah set?`,
    firstTime: (name: string, how: Kind | "bb") =>
      `ini pertama kali kamu nyatet ${esc(name)}, jadi aku belum bisa nebak angkanya. ${HOW_TO_TYPE[how]}`,
    draft: (label: string) => `➡️ <b>${label}</b>`,
    today: (chips: string[]) => `hari ini: ✅ ${chips.join(" · ")}`,
    failedChip: (chip: string) => `${chip} gagal`,
    // latihan berikutnya dipilih sendiri: tidak menyebut satu nama latihan
    complete: (n: number, hasPrevious: boolean, hasNext: boolean, remaining: number) =>
      `🙌 ${n} set beres${hasPrevious ? ", sama kayak minggu lalu" : ""}.${
        hasNext
          ? ` lanjut latihan apa? tekan ➡️ latihan berikutnya buat pilih dari daftar${remaining > 0 ? ` (masih ada ${remaining} yang belum)` : ""}, atau ketik namanya.`
          : ""
      }`,
    // reaksi setelah ✅ catat, dibanding set yang sama di sesi sebelumnya
    logged: (order: number, cmp: Comparison, when: string) => {
      const ref = when === "tadi" ? "sesi tadi" : when;
      if (cmp?.kind === "heavier") return `set ${order} kecatat, beban naik ${cmp.diff} dari ${ref}. mantap!`;
      if (cmp?.kind === "moreReps") return `set ${order} kecatat, ${cmp.reps} rep lebih banyak dari ${ref}. mantap!`;
      if (cmp?.kind === "same") return `set ${order} kecatat, sama persis kayak ${ref}.`;
      if (cmp?.kind === "lower") return `set ${order} kecatat. sedikit di bawah ${ref}, gapapa, yang penting konsisten.`;
      return `set ${order} kecatat. istirahat dulu ya, angka set berikutnya udah aku isi.`;
    },
    allDone: (split: string | null) =>
      `🎉 semua ${latihan(split)} hari ini udah beres! tekan 🏁 selesai latihan buat lihat rekap.`,
    tips: "💡 ✅ catat = simpan set ini · ➖➕ = ubah angka dulu · ➡️ = pindah latihan · 🏁 = selesai & lihat rekap",
    pr: (increase: string) => `🏆 pr baru! naik ${increase} dari rekor sebelumnya.`,
    prDuration: (increase: string) => `🏆 pr baru! ${increase} lebih lama dari rekor sebelumnya.`,
    deleted: (order: number, label: string, other: string | null) =>
      `↩️ set ${order}${other ? ` ${esc(other)}` : ""} (${label}) udah dihapus.`,
    restored: (order: number, label: string) => `↩️ set ${order} (${label}) balik lagi.`,
    nothingToDelete: "belum ada set yang bisa dihapus di kartu ini.",
    yesterday: "📅 oke, yang kamu catat abis ini masuk ke kemarin.",
    saved: (name: string) => `✅ sip, '${esc(name)}' aku simpan. lain kali langsung aku kenal.`,
    // kartu yang sudah lewat: `✅ bench press · 75×5 · 72,5×6 · 70×7 kg`
    compact: (name: string, chips: string[], unit: string | null) =>
      `✅ ${esc(name)} · ${chips.join(" · ")}${unit ? ` ${unit}` : ""}`,
    expired: "kartu ini udah lewat. pakai kartu yang paling bawah ya.",
    closed: "sesi ini udah ditutup otomatis. tekan 🏋️ kartu latihan buat mulai lagi.",
    alreadyLogged: "udah kecatat 👍",
    buttons: {
      minus: (step: string) => `➖ ${step}`,
      plus: (step: string) => `➕ ${step}`,
      log: (label: string) => `✅ catat ${label}`,
      del: "↩️ hapus set terakhir",
      undo: "↩️ urungkan",
      next: "➡️ latihan berikutnya",
      swap: "🔄 ganti latihan",
      finish: "🏁 selesai latihan",
    },
  },

  // pengingat istirahat (§5.5): 90 detik setelah set dicatat, dihapus begitu user menekan / mengetik apa pun
  restReminder: (order: number, name: string) =>
    `⏱️ udah 1,5 menit istirahat. siap set ${order} ${esc(name)}? angkanya udah ada di kartu, tinggal tekan ✅ catat.`,

  // ---------- 🔄 ganti latihan / pilih latihan ----------
  swapTitle: "🔄 mau ganti ke latihan apa?",
  // daftar latihan setelah split dipilih: rekomendasi, user pilih sendiri mau mulai dari mana
  pickExercise: (split: string | null, empty: boolean) =>
    [
      split && split !== "bebas" ? `🏋️ oke, latihan ${esc(split)}! mau mulai dari latihan apa?` : "🏋️ oke! mau mulai dari latihan apa?",
      empty
        ? "aku belum punya daftar buat ini. tekan 🔍 cari latihan lain, atau ketik nama latihannya."
        : `ini rekomendasi${split && split !== "bebas" ? ` buat ${esc(split)}` : ""}, pilih yang mana aja, urutannya bebas. gak ada yang cocok? tekan 🔍 cari latihan lain atau ketik namanya.`,
    ].join("\n"),
  // ➡️ latihan berikutnya: kartu jadi daftar latihan (tanpa latihan yang sekarang)
  pickNext: (empty: boolean) =>
    empty
      ? "➡️ mau lanjut latihan apa? tekan 🔍 cari latihan lain, atau ketik nama latihannya."
      : "➡️ mau lanjut latihan apa? pilih dari daftar, atau ketik nama latihannya. yang ada ✅ udah kamu kerjain hari ini.",
  doneChoice: (name: string) => `✅ ${name}`,
  swapButtons: { search: "🔍 cari latihan lain", back: "‹ kembali ke kartu", split: "📅 ganti split hari ini" },

  // ---------- pilih split saat mulai / ganti split di tengah sesi ----------
  // planned = split jadwal hari ini (null = hari ini bukan jadwal latihan); notice = kalimat pembuka (mis. /kemarin)
  askSplit: (planned: string | null, notice: string | null) =>
    [
      ...(notice ? [notice] : []),
      planned
        ? `🏋️ hari ini jadwalnya ${esc(planned)}. mau latihan ${esc(planned)}, atau lagi pengen yang lain?`
        : "🏋️ hari ini gak ada jadwal latihan, tapi gas aja! mau latihan apa?",
      "pilih di bawah, nanti aku kasih daftar latihannya.",
    ].join("\n"),
  changeSplit: (current: string | null) =>
    `📅 mau ganti${current ? ` dari ${esc(current)}` : ""} ke split apa? set yang udah kecatat tetap aman, nanti aku kasih daftar latihan split barunya.`,
  splitButtons: {
    planned: (split: string) => `✅ ${split} · sesuai jadwal`,
    free: "bebas · pilih latihan sendiri",
    back: "‹ ganti split",
  },

  // ---------- latihan tidak dikenal / cari ----------
  didYouMean: (name: string) => `🤔 maksudnya <b>${esc(name)}</b>?`,
  didYouMeanMany: "🤔 maksudnya yang mana?",
  yesNo: { yes: "iya", no: "bukan" },
  noneOfThese: "bukan semua",
  askMuscle: "🤔 gapapa, kita cari bareng. ototnya yang mana?",
  pickMuscle: "🔍 ototnya yang mana?",
  exerciseList: (muscle: string, equipment: string, page: number, pages: number) =>
    `${esc(muscle)}${equipment === "semua" ? "" : ` · ${esc(equipment)}`}. pilih latihannya ya.${pages > 1 ? ` (${page + 1}/${pages})` : ""}`,
  noMatch: (muscle: string, equipment: string) =>
    `belum ada latihan ${esc(muscle)}${equipment === "semua" ? "" : ` pakai ${esc(equipment)}`}. coba alat lain, atau tekan ✏️ gak ada, kasih nama sendiri.`,
  listButtons: { prev: "‹ sebelumnya", next: "selanjutnya ›", muscles: "‹ pilih otot lain" },
  noneButton: "✏️ gak ada, kasih nama sendiri",
  askName: "✏️ oke, mau dikasih nama apa? ketik namanya ya.",
  nameInvalid: "namanya 2 sampai 40 huruf ya. coba ketik lagi.",
  originalMissing: `pesan aslinya udah gak ketemu. ketik ulang nama + angkanya ya, atau ${MENU_HINT}.`,

  // ---------- §5.6 ngetik ----------
  notUnderstood: (text: string) =>
    `🤔 aku belum ngerti "${esc(text.slice(0, 60))}". coba pakai angka ya, contoh <code>75x5</code>, atau cukup <code>5</code> kalau bebannya sama.`,
  notUnderstoodIdle: (text: string) =>
    `🤔 aku belum ngerti "${esc(text.slice(0, 60))}". ${MENU_HINT} buat mulai, atau ketik nama latihan + angka, contoh <code>bench 60x8</code> (artinya 60 kg, 8 rep).`,
  numbersWithoutCard:
    "🤔 angkanya buat latihan apa? tekan 🏋️ kartu latihan dulu ya, atau ketik pakai nama, contoh <code>bench 70x8</code>.",
  helpButton: "❓ cara pakai",

  // ---------- §5.7 selesai & rekap ----------
  emptySession: "belum ada set yang kecatat hari ini, jadi belum ada rekap. tekan 🏋️ kartu latihan buat mulai.",
  recap: (r: {
    split: string | null;
    volume: number;
    setara: Setara | null;
    setCount: number;
    minutes: number;
    streak: number;
    unit: Unit;
    extras: string[]; // kardio & durasi, tidak masuk volume
    progress: string | null; // recapProgress
    askFeel: boolean;
  }) =>
    [
      `🎉 ${latihan(r.split)} selesai!`,
      ...(r.volume > 0
        ? [`📊 total ${formatKg(r.volume, r.unit)}${r.setara ? ` — ${setaraLine(r.setara)}` : "."}`]
        : []),
      ...(r.extras.length ? [`${r.volume > 0 ? "+ " : "📊 "}${r.extras.join(" · ")}`] : []),
      ...(r.progress ? [r.progress] : []),
      `${r.setCount} set · ${r.minutes} menit${r.streak > 0 ? ` · 🔥 streak ${r.streak} hari` : ""}`,
      r.askFeel ? "gimana rasanya hari ini?" : `sampai ketemu di latihan berikutnya. ${MENU_HINT} kalau udah di gym lagi.`,
    ].join("\n"),
  recapLinks: (dashboardUrl: string, shareUrl: string) =>
    `\n\n📊 lihat di dashboard: ${esc(dashboardUrl)}\n📤 bagikan ke story: ${esc(shareUrl)}`,
  recapButtons: { dashboard: "📊 lihat di dashboard", share: "📤 bagikan ke story" },
  feelButtons: { ringan: "😌 ringan", pas: "👌 pas", berat: "🥵 berat banget" },
  // perbandingan dengan sesi split yang sama sebelumnya + jumlah pr; null kalau tidak ada yang bisa disebut
  recapProgress: (r: { diffKg: number | null; split: string | null; prCount: number; unit: Unit }) => {
    const parts: string[] = [];
    if (r.diffKg !== null && r.diffKg > 0) parts.push(`naik ${formatKg(r.diffKg, r.unit)} dari ${latihan(r.split)} sebelumnya`);
    else if (r.diffKg !== null && r.diffKg < 0) parts.push(`${formatKg(-r.diffKg, r.unit)} di bawah ${latihan(r.split)} sebelumnya, gapapa`);
    if (r.prCount > 0) parts.push(`${r.prCount} pr baru`);
    return parts.length ? `${parts.join(" · ")}.` : null;
  },
  feelSaved: (split: string | null, next: { when: string; split: string } | null) =>
    `noted 👍 ${latihan(split)} berikutnya aku sesuaiin bebannya.${
      next ? ` jadwal berikutnya ${next.when}, ${latihan(next.split)}. sampai ketemu!` : ""
    }`,
  // dipakai halaman bagikan di web saat mengirim kartu ke telegram
  storyCaption: "🎉 kartu story kamu. simpan, terus pasang di story.",

  // ---------- §5.8 bantuan ----------
  help: {
    title: "❓ spotter siap bantu. mau tau soal apa?",
    buttons: {
      set: "🏋️ cara nyatet set",
      numbers: "➖➕ ubah angka",
      del: "↩️ hapus & urungkan",
      schedule: "📅 libur & jadwal",
      recap: "📊 rekap & pr",
      web: "🌐 buka dashboard",
      practice: "▶️ latihan coba",
      back: "‹ kembali",
    },
    topics: {
      set: [
        "🏋️ <b>cara nyatet set</b>",
        "tekan 🏋️ kartu latihan di bawah, pilih split hari ini (gak harus sama kayak jadwal), terus pilih latihannya dari daftar. kartunya udah berisi angka dari latihan sebelumnya, tinggal tekan ✅ catat tiap selesai satu set.",
        "pindah latihan pakai ➡️ latihan berikutnya (pilih dari daftar) atau ketik nama latihannya. mau ganti split di tengah jalan? 🔄 ganti latihan → 📅 ganti split hari ini. udah beres semua? tekan 🏁 selesai latihan.",
        "bisa juga diketik: <code>60x8</code> (60 kg, 8 rep), cukup <code>8</code> kalau bebannya sama, atau <code>bench 60x8</code> buat pindah latihan.",
      ],
      numbers: [
        "<b>ubah angka</b>",
        "angkanya beda dari yang di kartu? tekan ➖ ➕ dulu, baru ✅ catat.",
        "langkahnya ikut alat: barbel 2,5 kg, dumbel 2 kg, mesin & kabel 5 kg, rep 1-1, durasi 15 detik, kardio 5 menit.",
        "atau ketik langsung angkanya, misal <code>70 8</code> (70 kg, 8 rep). rep terakhir gagal? ketik <code>6 gagal</code>.",
      ],
      del: [
        "↩️ <b>hapus & urungkan</b>",
        "salah catat? tekan ↩️ hapus set terakhir di kartu, atau ketik <code>-</code>. setnya langsung dihapus, dan bisa dikembalikan pakai ↩️ urungkan.",
        "mau hapus set lain atau seluruh latihan hari ini? ketik /hapus.",
        "latihan tanggal lain dihapus lewat dashboard web.",
      ],
      schedule: [
        "📅 <b>libur & jadwal</b>",
        "/libur → hari ini libur (streak aman selama masih dalam jatah libur).",
        "/geser → jadwal hari ini pindah ke hari latihan berikutnya.",
        "/kemarin → catat latihan kemarin yang lupa dicatat.",
        "jadwal cuma saran: waktu mulai latihan kamu tetap bisa pilih split lain. jadwalnya sendiri bisa diatur ulang lewat /start atau dashboard web.",
      ],
      recap: [
        "📊 <b>rekap & pr</b>",
        "tekan 🏁 selesai latihan di kartu buat rekap hari ini + kartu story.",
        "/rekap → ringkasan minggu ini. /pr bench → rekor bench press kamu.",
        "/setara → ganti benda pembanding di rekap terakhir.",
      ],
    },
    web: (url: string) => `🌐 ini link masuk dashboard kamu, berlaku 10 menit. tekan buat buka:\n${esc(url)}`,
  },

  // ---------- §5.8 hapus ----------
  deleteButtons: { yes: "🗑️ ya, hapus", no: "‹ gak jadi" },
  deleteList: "🗑️ mau hapus yang mana? pilih di bawah ya.",
  deleteSessionButton: (split: string | null) => `🗑️ hapus seluruh ${latihan(split)} hari ini`,
  deleteNothingToday: (url: string) =>
    `hari ini belum ada set yang bisa dihapus. latihan tanggal lain dihapus lewat web:\n${esc(url)}`,
  deleteOtherDays: (url: string) => `\nlatihan tanggal lain dihapus lewat web: ${esc(url)}`,
  setLabel: (order: number, name: string, chip: string) => `set ${order} · ${esc(name)} ${chip}`,
  confirmSet: (label: string, pr: string) => `yakin hapus <b>${label}</b>?${pr}`,
  // akibat menghapus set pr; afterKg null = latihan itu jadi tanpa catatan beban
  prIfDeleted: (name: string, afterKg: number | null, unit: Unit) =>
    afterKg === null
      ? ` ini pr kamu, kalau dihapus ${esc(name)} belum punya catatan lagi.`
      : ` ini pr kamu, kalau dihapus pr ${esc(name)} balik ke ${formatKg(afterKg, unit)}.`,
  prAfterDelete: (name: string, afterKg: number | null, unit: Unit) =>
    afterKg === null ? ` ${esc(name)} belum punya catatan lagi.` : ` pr ${esc(name)} sekarang ${formatKg(afterKg, unit)}.`,
  setDeleted: (order: number, prLine: string) => `set ${order} udah dihapus.${prLine}`,
  setRestored: (order: number) => `↩️ set ${order} balik lagi. ${MENU_HINT} buat lanjut nyatet.`,
  lastSetDeleted: (label: string, prLine: string) => `↩️ ${label} udah dihapus.${prLine}`,
  nothingToDelete: `belum ada set yang bisa dihapus. ${MENU_HINT} buat mulai.`,
  undoButton: "↩️ urungkan",
  confirmSession: (label: string, setCount: number, volume: number, unit: Unit) =>
    `yakin hapus <b>${label}</b>? ${setCount} set${volume > 0 ? ` · ${formatKg(volume, unit)}` : ""} ikut kehapus semua.`,
  sessionDeleted: (label: string) => `🗑️ ${label} udah dihapus.`,
  sessionRestored: (label: string) => `↩️ ${label} balik lagi. ${MENU_HINT} buat lanjut nyatet.`,
  deleteCancelled: `oke, gak jadi. datanya aman. ${MENU_HINT} buat lanjut nyatet.`,
  alreadyDeleted: "udah dihapus.",
  cannotUndo: `udah gak bisa diurungkan. ${MENU_HINT} buat lanjut nyatet.`,

  // ---------- hapus akun ----------
  accountScheduled: (date: string) =>
    `akunmu dijadwalkan dihapus tanggal ${date}. berubah pikiran? tekan ↩️ urungkan hapus akun di bawah.`,
  accountCancelButton: "↩️ urungkan hapus akun",
  accountKept: `🙌 oke, akunmu gak jadi dihapus. datamu aman. ${MENU_HINT} kalau mau lanjut latihan.`,

  // ---------- §5.8 hari & pengingat ----------
  restDone: "😴 oke, hari ini libur. istirahat juga bagian dari latihan, sampai besok ya.",
  restOverAllowance:
    "😴 oke, hari ini libur. istirahat juga bagian dari latihan, sampai besok ya. tapi jatah libur minggu ini udah kepake, jadi streak mulai dari nol lagi.",
  restNotScheduled: `😴 hari ini emang bukan jadwal latihan, jadi santai aja. kalau tetap mau latihan, ${MENU_HINT}.`,
  restHasSession: `hari ini kamu udah latihan, jadi gak perlu libur. mau lanjut nyatet? ${MENU_HINT}.`,
  shiftDone: (split: string, when: string) => `📅 ${esc(split)} dipindah ke ${when}. jadwal setelahnya ikut geser.`,
  shiftNoRoom: (split: string) =>
    `📅 minggu ini udah gak ada jadwal lagi, jadi ${esc(split)} dilewatin dulu. minggu depan kita mulai lagi ya.`,
  shiftNotScheduled: `📅 hari ini gak ada jadwal yang bisa digeser. kalau mau latihan, ${MENU_HINT}.`,
  shiftHasSession: `hari ini kamu udah latihan, jadi gak perlu digeser. mau lanjut nyatet? ${MENU_HINT}.`,
  tomorrow: "besok",
  greeting: (hour: number) => (hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 18 ? "sore" : "malam"),
  reminder: (greeting: string, split: string) => `👋 ${greeting}! hari ini jadwal ${esc(split)}. siap berangkat?`,
  reminderButtons: { start: "🏋️ mulai", later: "⏰ nanti", rest: "😴 libur", shift: "📅 geser ke besok" },
  reminderLater: "oke, aku tunggu. tekan 🏋️ kartu latihan kalau udah di gym.",
  missedYesterday: (split: string | null) =>
    `kemarin jadwal ${split ? esc(split) : "latihan"} kelewat. gapapa banget, hari ini kita mulai lagi 💪`,

  // ---------- rekap minggu, pr, setara ----------
  setaraChanged: (s: Setara) => `📊 ${setaraLine(s)}`,
  setaraNothing: `belum ada rekap yang bisa diganti bendanya. selesaikan latihan dulu ya, ${MENU_HINT}.`,
  setaraNoOther: "cuma itu yang pas buat volume segini. coba lagi setelah latihan berikutnya ya.",
  week: (w: { sessions: number; target: number; volume: number; unit: Unit }) => {
    if (w.sessions === 0) {
      return `📊 minggu ini belum ada latihan. target ${w.target}, masih ada waktu kok. ${MENU_HINT} kalau udah di gym.`;
    }
    const target =
      w.sessions >= w.target
        ? "target minggu ini kecapai. mantap 🙌"
        : `target ${w.target}, kurang ${w.target - w.sessions} lagi. ${MENU_HINT} kalau udah di gym.`;
    return `📊 minggu ini ${w.sessions} latihan, total ${formatKg(w.volume, w.unit)}.\n${target}`;
  },
  prTitle: "🏆 rekor kamu:",
  prLine: (
    p: { name: string; weightKg: number; isAdded: boolean; reps: number; at: Date },
    timeZone: string,
    unit: Unit,
  ) =>
    `${esc(p.name)}: ${p.isAdded ? "+" : ""}${formatKg(p.weightKg, unit)} × ${p.reps} (${formatDay(p.at, timeZone)})`,
  prDurationLine: (name: string, sec: number) => `🏆 ${esc(name)}: ${formatDuration(sec)}`,
  prFooter: "mau lihat semua rekor & grafiknya? ketik /masuk buat buka dashboard.",
  prNone: `🏆 belum ada rekor. ${MENU_HINT} buat mulai nyatet, nanti rekornya muncul di sini.`,
  prNoneFor: (name: string) => `belum ada rekor buat ${esc(name)}. ${MENU_HINT} buat mulai nyatet.`,
  prUnknown: (name: string) => `🤔 aku belum kenal "${esc(name)}". coba nama lain, misal /pr bench.`,

  // url ditulis polos (bukan <a>) supaya tetap bisa disalin walau telegram tidak menautkan localhost
  loginLink: (url: string) => `🌐 ini link masuk dashboard kamu, berlaku 10 menit. tekan buat buka:\n${esc(url)}`,

  buttonUsed: "tombol ini udah dipakai.",
  buttonOld: "tombol ini udah kedaluwarsa. pakai yang paling baru ya.",
  unknownCommand: "🤔 perintah itu belum aku kenal. ketik /bantuan buat lihat yang bisa.",
  error: "aduh, ada yang error di aku 🤔 coba lagi sebentar ya.",

  // §5.2 daftar perintah, urut
  commands: [
    { command: "latihan", description: "kartu latihan (mulai atau lanjut)" },
    { command: "selesai", description: "selesai latihan + rekap" },
    { command: "hapus", description: "hapus set atau seluruh latihan hari ini" },
    { command: "kemarin", description: "catat latihan kemarin" },
    { command: "libur", description: "tandai hari ini libur" },
    { command: "geser", description: "pindahkan jadwal hari ini ke hari berikutnya" },
    { command: "rekap", description: "ringkasan minggu ini" },
    { command: "pr", description: "lihat rekor, misal /pr bench" },
    { command: "setara", description: "ganti benda pembanding rekap terakhir" },
    { command: "masuk", description: "link masuk dashboard web" },
    { command: "bantuan", description: "cara pakai" },
  ],
};

// `setara 4 mobil 🚗. aku cuma nonton.`
function setaraLine(s: Setara): string {
  const emoji = SETARA_EMOJI[s.item.id];
  return `setara ${formatCount(s.count)} ${s.item.label}${emoji ? ` ${emoji}` : ""}. ${s.item.quip}`;
}
