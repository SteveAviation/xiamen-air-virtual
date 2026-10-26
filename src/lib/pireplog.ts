import {
  getPirepById,
  getPilotById,
  setPirepDiscordMsg,
  type Pirep,
  type Pilot,
} from "./db";
import { postPirepLog, editPirepLog, type PirepLogInfo } from "./discord";

function buildInfo(pirep: Pirep, pilot: Pilot | null): PirepLogInfo {
  return {
    username: pilot?.displayName || pilot?.callsign || "Pilot",
    callsign: pilot?.callsign || "—",
    dep: pirep.dep,
    arr: pirep.arr,
    minutes: pirep.minutes,
  };
}

/* Post a freshly-filed PIREP to the log channel and remember its message id.
   Best-effort: never throws into the caller. */
export async function announceFiledPirep(pirepId: number): Promise<void> {
  try {
    const pirep = await getPirepById(pirepId);
    if (!pirep) return;
    const pilot = await getPilotById(pirep.pilotId);
    const msgId = await postPirepLog(buildInfo(pirep, pilot));
    if (msgId) await setPirepDiscordMsg(pirepId, msgId);
  } catch {
    /* best-effort */
  }
}

/* Update the PIREP's log message after a review decision (edits in place;
   posts a fresh message if one wasn't recorded). Best-effort. */
export async function announceReviewedPirep(pirepId: number): Promise<void> {
  try {
    const pirep = await getPirepById(pirepId);
    if (!pirep) return;
    const pilot = await getPilotById(pirep.pilotId);
    const info = buildInfo(pirep, pilot);
    const status = pirep.status;
    if (pirep.discordMsgId) {
      await editPirepLog(pirep.discordMsgId, info, status);
    } else {
      const msgId = await postPirepLog(info);
      if (msgId) {
        await setPirepDiscordMsg(pirepId, msgId);
        await editPirepLog(msgId, info, status);
      }
    }
  } catch {
    /* best-effort */
  }
}
