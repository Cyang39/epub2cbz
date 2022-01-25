import { XMLParser } from "fast-xml-parser";

export default function (xmlStr: string) {
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlStr);
}
