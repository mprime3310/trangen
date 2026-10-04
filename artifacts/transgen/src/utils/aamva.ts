export interface DLFields {
  lastName: string;
  firstName: string;
  middleName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  dob: string;
  sex: string;
  eyeColor: string;
  hairColor: string;
  height: string;
  weight: string;
  idNumber: string;
  icn: string;
  licenseClass: string;
  expDate: string;
  issueDate: string;
  documentDiscriminator: string;
  restrictions: string;
  endorsements: string;
  vehicleClass: string;
  revisionDate: string;
  complianceType: string;
}

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","AS","GU","MP","PR","VI",
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"
];

export const EYE_COLORS = ["BLK","BLU","BRO","GRY","GRN","HAZ","MAR","PNK","DIC","UNK"];
export const HAIR_COLORS = ["BAL","BLK","BLN","BRO","GRY","RED","SDY","WHI","UNK"];
export const SEX_OPTIONS = ["1 - Male", "2 - Female", "9 - Not Specified"];
export const LICENSE_CLASSES = ["A","B","C","D","E","M","NONE"];
export const COMPLIANCE_TYPES = ["F","N","M"];

function formatDate(dateStr: string): string {
  if (!dateStr) return "00000000";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "00000000";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

/**
 * Fixed-width AAMVA field rule — mirrors the reference Transgen (StateGenerator.java).
 * These fields occupy a set width in the payload even when short:
 *  - dates (F8N/F4N) zero-fill when missing/short
 *  - codes (V1/V3/V6 etc.) pass through trimmed; missing codes fall back to the
 *    defaults the reference puts in `data` (DCG=USA, EYE=BRO, HGT="000000"...).
 */
function fixed(val: string, len: number, pad: "zero" | "none"): string {
  const t = (val || "").trim();
  if (t.length >= len) return t.substring(0, len);
  if (t === "") return pad === "zero" ? "0".repeat(len) : "";
  return t;
}

export function buildAamvaPdf417(fields: DLFields, issuerIdOverride?: string): string {
  const issuerId = issuerIdOverride || "636000";
  const aamvaVersion = "08";
  const jurisdictionVersion = "00";
  const numEntries = "01";

  const subfileOffset = "0000";

  const v = (s: string | undefined) => (s || "").trim();

  const DL_DATA = [
    [`DCS`, v(fields.lastName).toUpperCase()],
    [`DAC`, v(fields.firstName).toUpperCase()],
    [`DAD`, v(fields.middleName).toUpperCase()],
    [`DAG`, v(fields.address1)],
    [`DAH`, v(fields.address2)],
    [`DAI`, v(fields.city)],
    [`DAJ`, v(fields.state)],
    [`DAK`, v(fields.zip).replace(/-/g, "")],
    [`DCG`, v(fields.country) || "USA"],
    [`DAQ`, v(fields.idNumber)],
    [`DBA`, fixed(formatDate(fields.expDate), 8, "zero")],
    [`DBB`, fixed(formatDate(fields.dob), 8, "zero")],
    [`DBC`, v(fields.sex).charAt(0) || "1"],
    [`DAY`, v(fields.eyeColor) || "BRO"],
    [`DAU`, v(fields.height) || "000000"],
    [`DAW`, v(fields.weight)],
    [`DBD`, fixed(formatDate(fields.issueDate), 8, "zero")],
    [`DCA`, v(fields.vehicleClass || fields.licenseClass) || "NONE"],
    [`DCB`, v(fields.restrictions) || "NONE"],
    [`DCD`, v(fields.endorsements) || "NONE"],
    [`DCF`, v(fields.documentDiscriminator)],
    [`DCK`, v(fields.icn) || v(fields.idNumber)],
    [`DDA`, v(fields.complianceType) || "F"],
    // Truncation flags — the reference Transgen always emits these as "U".
    [`DDF`, "U"],
    [`DDG`, "U"],
  ].filter(([, val]) => val !== "").map(([k, val]) => `${k}${val}`).join("\n");

  // Subfile length = "DL\n" (3) + body chars + trailing "\n" (1).
  const subfileLength = String(DL_DATA.length + 4).padStart(4, "0");

  const header =
    `@\n\x1e\rANSI ` +
    `${issuerId}${aamvaVersion}${jurisdictionVersion}` +
    `${numEntries}` +
    `DL${subfileOffset}${subfileLength}\r`;

  return header + "DL\n" + DL_DATA + "\n";
}

export function buildMagStripe(fields: DLFields): {
  track1: string;
  track2: string;
  track3: string;
} {
  const lastName = fields.lastName.toUpperCase();
  const firstName = fields.firstName.toUpperCase();
  const mi = fields.middleName ? fields.middleName.charAt(0).toUpperCase() : "";
  const name = mi ? `${lastName}$${firstName}$${mi}` : `${lastName}$${firstName}`;

  const expDate = formatDate(fields.expDate).substring(0, 4);
  const dob = formatDate(fields.dob).substring(0, 4);
  const idNum = fields.idNumber.padEnd(13, " ").substring(0, 13);
  const state = fields.state.padEnd(2, " ").substring(0, 2);

  return {
    track1: `%${state}${idNum}^${name}^${expDate}?`,
    track2: `;${state}${idNum}=${expDate}?`,
    track3: `%${dob}${state}${idNum}${expDate}?`,
  };
}

const DIGITS = "0123456789";

/**
 * Generate a random string from the given character set.
 * (Port of the reference Transgen Utils.randomString.)
 */
export function randomString(length: number, characterSet: string): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += characterSet.charAt(Math.floor(Math.random() * characterSet.length));
  }
  return out;
}

/**
 * Dynamically generate an Inventory Control Number (AAMVA DCK).
 * The ICN is the data encoded into the 1D (Code 128) barcode.
 */
export function generateIcn(length = 11): string {
  return randomString(length, DIGITS);
}

/**
 * Dynamically generate a customer ID / license number (AAMVA DAQ).
 */
export function generateIdNumber(state: string, length = 8): string {
  return `${(state || "CA").toUpperCase()}${randomString(length, DIGITS)}`;
}

export function generateExampleFields(state: string): DLFields {
  const today = new Date();
  const issueDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  const expDate = new Date(today.getFullYear() + 4, today.getMonth(), today.getDate());
  const dob = new Date(today.getFullYear() - 28, 5, 15);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  return {
    lastName: "SAMPLE",
    firstName: "JOHN",
    middleName: "QUINCY",
    address1: "123 MAIN ST",
    address2: "",
    city: "ANYTOWN",
    state: state || "CA",
    zip: "900010000",
    country: "USA",
    dob: fmt(dob),
    sex: "1",
    eyeColor: "BRO",
    hairColor: "BRO",
    height: "069 in",
    weight: "185",
    idNumber: generateIdNumber(state),
    icn: generateIcn(),
    licenseClass: "C",
    expDate: fmt(expDate),
    issueDate: fmt(issueDate),
    documentDiscriminator: "00000000000000000",
    restrictions: "NONE",
    endorsements: "NONE",
    vehicleClass: "C",
    revisionDate: "12012016",
    complianceType: "F",
  };
}

export function parseCSVFields(row: Record<string, string>): DLFields {
  const get = (key: string) => row[key] || "";
  return {
    lastName: get("lastName") || get("last_name") || get("LN"),
    firstName: get("firstName") || get("first_name") || get("FN"),
    middleName: get("middleName") || get("middle_name") || get("MN"),
    address1: get("address1") || get("address") || get("ADDR1"),
    address2: get("address2") || get("ADDR2"),
    city: get("city") || get("CITY"),
    state: get("state") || get("ST"),
    zip: get("zip") || get("ZIP"),
    country: get("country") || "USA",
    dob: get("dob") || get("DOB"),
    sex: get("sex") || get("SEX") || "1",
    eyeColor: get("eyeColor") || get("eye") || get("EYE"),
    hairColor: get("hairColor") || get("hair") || get("HAIR"),
    height: get("height") || get("HT"),
    weight: get("weight") || get("WT"),
    idNumber: get("idNumber") || get("id") || get("ID"),
    icn: get("icn") || get("ICN") || get("dck") || get("DCK"),
    licenseClass: get("licenseClass") || get("class") || "C",
    expDate: get("expDate") || get("exp") || get("EXP"),
    issueDate: get("issueDate") || get("iss") || get("ISS"),
    documentDiscriminator: get("documentDiscriminator") || get("dd") || "",
    restrictions: get("restrictions") || "NONE",
    endorsements: get("endorsements") || "NONE",
    vehicleClass: get("vehicleClass") || get("class") || "C",
    revisionDate: get("revisionDate") || "",
    complianceType: get("complianceType") || "F",
  };
}

export const CSV_EXAMPLE = `lastName,firstName,middleName,address1,address2,city,state,zip,country,dob,sex,eyeColor,hairColor,height,weight,idNumber,icn,licenseClass,expDate,issueDate,documentDiscriminator,restrictions,endorsements,vehicleClass,complianceType
SAMPLE,JOHN,QUINCY,123 MAIN ST,,ANYTOWN,CA,900010000,USA,1996-06-15,1,BRO,BRO,069 in,185,CA12345678,10000280866,C,2029-06-15,2023-06-15,00000000000000000,NONE,NONE,C,F
DOE,JANE,ALICE,456 ELM AVE,APT 2B,SPRINGFIELD,TX,733010000,USA,1990-03-22,2,BLU,BLN,065 in,130,TX87654321,10000280867,C,2028-03-22,2022-03-22,11111111111111111,NONE,NONE,C,F`;
