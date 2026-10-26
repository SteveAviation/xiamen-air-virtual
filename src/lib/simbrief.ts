/* Build a SimBrief "dispatch" deep link prefilled from a route, à la Stratos.
   Opens SimBrief with origin/destination/flight-number/aircraft ready to go. */

const TYPE_MAP: { match: string; code: string }[] = [
  { match: "A350-1000", code: "A35K" },
  { match: "A350", code: "A359" },
  { match: "A330", code: "A333" },
  { match: "A321", code: "A321" },
  { match: "A320NEO", code: "A20N" },
  { match: "A320", code: "A320" },
  { match: "A319", code: "A319" },
  { match: "A380", code: "A388" },
  { match: "787-9", code: "B789" },
  { match: "787", code: "B788" },
  { match: "777-300", code: "B77W" },
  { match: "777", code: "B772" },
  { match: "747-8", code: "B748" },
  { match: "747", code: "B744" },
  { match: "737 MAX 8", code: "B38M" },
  { match: "737", code: "B738" },
  { match: "EMBRAER 190", code: "E190" },
  { match: "E190", code: "E190" },
];

export function simbriefType(aircraft: string): string {
  const a = aircraft.toUpperCase();
  return TYPE_MAP.find((t) => a.includes(t.match))?.code ?? "B738";
}

export function simbriefUrl(opts: {
  airlineIcao: string; // e.g. "FIN" or "AY"
  flightNo: string; // "AY15" → digits used
  dep: string;
  arr: string;
  aircraft: string;
}): string {
  const fltnum = opts.flightNo.replace(/\D/g, "") || "1";
  const params = new URLSearchParams({
    airline: opts.airlineIcao,
    fltnum,
    orig: opts.dep,
    dest: opts.arr,
    type: simbriefType(opts.aircraft),
  });
  return `https://dispatch.simbrief.com/options/custom?${params.toString()}`;
}
