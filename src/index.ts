import * as zip from "@zip.js/zip.js";
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
  var epubname = file.name.split(".").slice(0, -1).join(".");
  var id = nanoid();
  var reader = new zip.ZipReader(new zip.BlobReader(file));
  var entries = await reader.getEntries();
  if (entries.length) {
    var opfFile = entries.find(entry => entry.filename.match(/.+\.opf/i));
    var opfXML = await opfFile.getData(new zip.TextWriter());
    var opfObj = OPFparser(opfXML);
    var pageList = opfObj.package.spine.itemref.map(a => {
      return opfObj.package.manifest.item.filter(b => b['@_id'] === a['@_idref']).pop()["@_href"];
    });

    myLog("loading index of [" + file.name + "]...", id);
    var imageList = [];
    for (var page of pageList) {
      var pageFile = entries.find(entry => entry.filename === page);
      var pageHTML = await pageFile.getData(new zip.TextWriter());
      var pagePath = dirOfEntry(pageFile);
      var imagePath = pageHTML.split("<img src=\"")[1].split("\"")[0];
      imagePath = [pagePath, imagePath].filter(i => i).join("/");
      imagePath = fixPath(imagePath);
      imageList.push(imagePath);
    }

    // use a BlobWriter to store with a ZipWriter the zip into a Blob object
    var blobWriter = new zip.BlobWriter("application/x-cbz");
    var writer = new zip.ZipWriter(blobWriter);

    for (var i = 0; i < imageList.length; i++) {
      var imgEntry = entries.find(entry => entry.filename === imageList[i]);
      var ext = imgEntry.filename.split(".").pop();
      myLog(`Processing [${file.name}]: ${i}/${imageList.length}`, id);
      var imgBlob = await imgEntry.getData(new zip.BlobWriter(`image/${ext.toLocaleLowerCase()}`));
      await writer.add(`${alignNum(i, imageList.length)}.${ext}`, new zip.BlobReader(imgBlob));
    }
    myLog(`building [${epubname}.cbz], it will auto download after building finish...`, id);
    await writer.close();
    var cbzFile = blobWriter.getData();
    saveAs(cbzFile, `${epubname}.cbz`);
  }

  // close the ZipReader
  await reader.close();
}

function alignNum(num: number | string, max: number) {
  var howLongNum = (num: number | string) => `${num}`.length;
  let len = howLongNum(num)
  for (let i = 0; i < howLongNum(max) - len; i++) num = "0" + num;
  return num;
}

function dirOfEntry(entry: zip.Entry) {
  return entry.filename.split("/").slice(0, -1).join("/");
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
