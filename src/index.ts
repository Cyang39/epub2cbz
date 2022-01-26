import * as zip from "@zip.js/zip.js";
import { saveAs } from "file-saver";
import { customAlphabet } from "nanoid";
import { parseXML, dirOfEntry, alignNum, fixPath } from "./util";
const nanoid = customAlphabet('abcdefghijklmn', 5);

function main() {
  document.getElementById("ver").innerText = "[v0.2.5]";
  document.querySelector("#file").addEventListener("change", function (evt) {
    for(var file of (<HTMLInputElement>evt.target).files) {
      handleEpub(file)
    }
  })
}

async function handleEpub(file: File) {
  var epubname = file.name.split(".").slice(0, -1).join(".");
  var id = nanoid();
  var reader = new zip.ZipReader(new zip.BlobReader(file));


  var entries: any[];
  try {
    entries = await reader.getEntries();
  } catch(err) {
    myLog(`❌ Error: [${file.name}] is not a stand epub file.`, id);
    return -1;
  }


  if (entries.length) {


    var opfFile = entries.find(entry => entry.filename.match(/.+\.opf/i));

    myLog("Looking into opf file", id);
    var opfXML;
    try {
      opfXML = await opfFile.getData(new zip.TextWriter());
    } catch(err) {
      if(file.type === "application/epub+zip")
        myLog(`❌ Error: Can't find the .opf file in ${file.name}. If your epub file is ocf/ops, it not support yet.`, id);
      else
        myLog(`❌ Error: [${file.name}] may not be an epub file. Please check it.`, id);
      return -1;
    }
    var opfObj = parseXML(opfXML);
    var pageList = opfObj.package.spine.itemref.map(a => {
      return opfObj.package.manifest.item.filter(b => b['@_id'] === a['@_idref']).pop()["@_href"];
    });

    myLog("Looking into ncx file", id);
    var ncxFile = entries.find(entry => entry.filename.match(/.+\.ncx/i));
    var ncxPath = ncxFile.filename.split("/").slice(0, -1).join("/");
    var ncxXML = await ncxFile.getData(new zip.TextWriter());
    var ncxObj = parseXML(ncxXML);
    var pageList2 = ncxObj?.ncx?.navMap?.navPoint.map(i => fixPath([ncxPath, i.content?.["@_src"]].join("/")))
    
    pageList = pageList.length > pageList2.length ? pageList : pageList2;

    myLog("Loading index of [" + file.name + "]...", id);
    var imageList = [];
    try{
      for (var page of pageList) {
        var pageFile = entries.find(entry => entry.filename === page);
        var pageHTML:string = await pageFile.getData(new zip.TextWriter());
        var pagePath = dirOfEntry(pageFile.filename);
        if(pageHTML.indexOf("<img") >= 0) {
          var imagePath = pageHTML.split("<img src=\"")[1]?.split("\"")[0];
          imagePath = [pagePath, imagePath].filter(i => i).join("/");
          imagePath = fixPath(imagePath);
          imageList.push(imagePath);
        }
      }
    } catch(err) {
      myLog(`❌ Error: Something wrong during getting Image List. Please press F12 to check console.`, id);
      console.error(err);
    }
    
    // remove page not include image.
    imageList = imageList.filter(i => i);

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
