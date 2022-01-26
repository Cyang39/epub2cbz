import { XMLParser } from "fast-xml-parser";

export function parseXML(xmlStr: string) {
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(xmlStr);
}

/**
 * eg. `1,2,3` `->` `001,002,003`
 */
export function alignNum(num: number | string, max: number) {
  var howLongNum = (num: number | string) => `${num}`.length;
  let len = howLongNum(num)
  for (let i = 0; i < howLongNum(max) - len; i++) num = "0" + num;
  return num;
}

/**
 * eg. `/mnt/c/../d/page.html` `->` `/mnt/d/page.html`
 */
export function fixPath(str: string) {
  const result = [];
  const strs = str.split("/");
  for (let i = 0; i < strs.length; i++) {
    if (strs[i] === "..") result.pop();
    else result.push(strs[i]);
  }
  return result.join("/");
}

/**
 * eg. `/foo/bar.baz` -> `/foo`
 */
export function dirOfEntry(filename: string) {
  return filename.split("/").slice(0, -1).join("/");
}