import JSZip from "jszip";
import { saveAs } from "file-saver";
import { customAlphabet } from "nanoid";
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

  // .ncx 文件是 epub 的目录，它是 XML 格式文本，
  // 它指定页面的顺序和路径，
  // 通常来说，一个 epub 只会有一个 .ncx 文件。
  var ncxFiles = zip.file(/.+\.ncx/);
  var ncxFile = ncxFiles.pop();
  var ncxFilePath = dirOfEntry(ncxFile);
  var ncxXML = await ncxFile.async("text");

  // 每个页面应该是 html 格式的文本，
  // 漫画 epub 通常每页只有一个 image 标签。
  var pageList = filenameListFromIndex(ncxXML)
    .map(name => [ncxFilePath, name].filter(i => i).join("/"))
    .map(fixPath);

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
    cbz.file(`${i}.${ext}`, await imgEntry.async("blob"));
  }
  myLog(`building [${epubname}.cbz], it will auto download after building finish...`, id);
  var cbzFile = await cbz.generateAsync({ type: "blob" });

  saveAs(cbzFile, `${epubname}.cbz`);
}

function dirOfEntry(entry: JSZip.JSZipObject) {
  return entry.name.split("/").slice(0, -1).join("/");
}

function filenameListFromIndex(index: string) {
  return index.split("<content src=\"")
    .slice(1)
    .map(i => i.split("\"").shift());
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
