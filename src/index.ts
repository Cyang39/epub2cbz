import JSZip from "jszip";
import { saveAs } from "file-saver";
import { customAlphabet } from "nanoid";
import OPFparser from "./OPFparser";
const nanoid = customAlphabet('abcdefghijklmn', 5);

function main() {
  document.querySelector("#file").addEventListener("change", function (evt) {
    handleFiles((<HTMLInputElement>evt.target).files)
  })
}

function handleFiles(files: FileList) {
  for (var file of files) {
    if (file.type === "application/epub+zip") handleEpub(file)
  }
}

async function handleEpub(file: File) {
  var zip = await JSZip.loadAsync(file);
  var epubname = file.name.split(".").slice(0, -1).join(".");
  var id = nanoid();

  // .ncx is not a stand for .epub: https://en.wikipedia.org/wiki/EPUB
  // so I change to use .opf
  var opfFile = zip.file(/.+\.opf/i).pop();
  if (!opfFile) {
    myLog("not found .opf file", id);
    return -1;
  }
  var opfXML = await opfFile.async("text");
  var opfObj = OPFparser(opfXML);

  var pageList = opfObj.package.spine.itemref.map(a => {
    return opfObj.package.manifest.item.filter(b => b['@_id'] === a['@_idref']).pop()["@_href"];
  })

  myLog("loading index of [" + file.name + "]...", id);
  var imageList = [];
  for (var page of pageList) {
    var pageFile = zip.file(page);
    var pageHTML = await pageFile.async("text");
    var pagePath = dirOfEntry(pageFile);
    var imagePath = pageHTML.split("<img src=\"")[1].split("\"")[0];
    imagePath = [pagePath, imagePath].filter(i => i).join("/");
    imagePath = fixPath(imagePath);
    imageList.push(imagePath);
  }

  var cbz = new JSZip();
  for (var i = 0; i < imageList.length; i++) {
    var imgEntry = zip.file(imageList[i]);
    var ext = imgEntry.name.split(".").pop();
    myLog(`Processing [${file.name}]: ${i}/${imageList.length}`, id);
    cbz.file(`${alignNum(i, imageList.length)}.${ext}`, await imgEntry.async("blob"));
  }
  myLog(`building [${epubname}.cbz], it will auto download after building finish...`, id);
  var cbzFile = await cbz.generateAsync({ type: "blob", mimeType: "application/x-cbz" });

  saveAs(cbzFile, `${epubname}.cbz`);
}

function alignNum(num: number | string, max: number) {
  var howLongNum = (num: number | string) => `${num}`.length;
  let len = howLongNum(num)
  for (let i = 0; i < howLongNum(max) - len; i++) num = "0" + num;
  return num;
}

function dirOfEntry(entry: JSZip.JSZipObject) {
  return entry.name.split("/").slice(0, -1).join("/");
}

function fixPath(str: string) {
  const result = [];
  const strs = str.split("/");
  for (let i = 0; i < strs.length; i++) {
    if (strs[i] === "..") result.pop();
    else result.push(strs[i]);
  }
  return result.join("/");
}

function myLog(str: string, slot: string) {
  var elm = document.querySelector("#" + slot);
  if (!elm) {
    elm = document.createElement("div");
    elm.setAttribute("id", slot);
    document.querySelector("#log").append(elm);
  }
  elm.innerHTML = "<p>" + str + "</p>"
}

main();
