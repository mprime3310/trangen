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

function padRight(str: string, len: number): string {
  return str.substring(0, len).padEnd(len, " ");
}

export function buildAamvaPdf417(fields: DLFields, issuerIdOverride?: string): string {
  const issuerId = issuerIdOverride || "636000";
  const aamvaVersion = "08";
  const jurisdictionVersion = "00";
  const numEntries = "01";

  const subfileOffset = "0000";

  const DL_DATA = [
    `DCS${padRight(fields.lastName.toUpperCase(), 40)}`,
    `DAC${padRight(fields.firstName.toUpperCase(), 40)}`,
    `DAD${padRight(fields.middleName.toUpperCase(), 40)}`,
    `DAG${padRight(fields.address1, 35)}`,
    `DAH${padRight(fields.address2, 35)}`,
    `DAI${padRight(fields.city, 20)}`,
    `DAJ${padRight(fields.state, 2)}`,
    `DAK${padRight(fields.zip.replace(/-/g, ""), 11)}`,
    `DCG${padRight(fields.country || "USA", 3)}`,
    `DAQ${padRight(fields.idNumber, 25)}`,
    `DBA${formatDate(fields.expDate)}`,
    `DBB${formatDate(fields.dob)}`,
    `DBC${fields.sex.charAt(0)}`,
    `DAY${padRight(fields.eyeColor, 3)}`,
    `DAU${padRight(fields.height, 6)}`,
    `DAW${padRight(fields.weight, 3)}`,
    `DBD${formatDate(fields.issueDate)}`,
    `DCA${padRight(fields.vehicleClass || fields.licenseClass, 6)}`,
    `DCB${padRight(fields.restrictions, 12)}`,
    `DCD${padRight(fields.endorsements, 5)}`,
    `DCF${padRight(fields.documentDiscriminator, 25)}`,
    `DCK${padRight(fields.idNumber, 25)}`,
    `DDA${fields.complianceType || "F"}`,
  ].join("\n");

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
    idNumber: `${state || "CA"}12345678`,
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

export const CSV_EXAMPLE = `lastName,firstName,middleName,address1,address2,city,state,zip,country,dob,sex,eyeColor,hairColor,height,weight,idNumber,licenseClass,expDate,issueDate,documentDiscriminator,restrictions,endorsements,vehicleClass,complianceType
SAMPLE,JOHN,QUINCY,123 MAIN ST,,ANYTOWN,CA,900010000,USA,1996-06-15,1,BRO,BRO,069 in,185,CA12345678,C,2029-06-15,2023-06-15,00000000000000000,NONE,NONE,C,F
DOE,JANE,ALICE,456 ELM AVE,APT 2B,SPRINGFIELD,TX,733010000,USA,1990-03-22,2,BLU,BLN,065 in,130,TX87654321,C,2028-03-22,2022-03-22,11111111111111111,NONE,NONE,C,F`;
