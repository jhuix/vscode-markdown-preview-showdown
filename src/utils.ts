import * as child_process from "child_process";
import * as fs from "fs";
import * as mkdirp_ from "mkdirp";

function readFile(
  file: fs.PathLike | number,
  options: { encoding?: null; flag?: string } | undefined | null
) {
  return new Promise((resolve, reject) => {
    fs.readFile(file, options, (error, text) => {
      if (error) {
        return reject(error.toString());
      } else {
        return resolve(text.toString());
      }
    });
  });
}
exports.readFile = readFile;
function writeFile(
  file: fs.PathLike | number,
  text: any,
  options: fs.WriteFileOptions
) {
  return new Promise((resolve, reject) => {
    fs.writeFile(file, text, options, error => {
      if (error) {
        return reject(error.toString());
      } else {
        return resolve();
      }
    });
  });
}
exports.writeFile = writeFile;
function write(fd: number, text: any) {
  return new Promise((resolve, reject) => {
    fs.write(fd, text, error => {
      if (error) {
        return reject(error.toString());
      } else {
        return resolve();
      }
    });
  });
}
exports.write = write;
function execFile(
  file: string,
  args: ReadonlyArray<string> | undefined | null,
  options: child_process.ExecFileOptionsWithBufferEncoding
) {
  return new Promise((resolve, reject) => {
    child_process.execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        return reject(error.toString());
      } else if (stderr) {
        return reject(stderr);
      } else {
        return resolve(stdout);
      }
    });
  });
}
exports.execFile = execFile;
function mkdirp(dir: string) {
  return new Promise((resolve, reject) => {
    mkdirp_(dir, (error, made) => {
      if (error) {
        return reject(error);
      } else {
        return resolve(made);
      }
    });
  });
}
exports.mkdirp = mkdirp;
/**
 * open html file in browser or open pdf file in reader ... etc
 * @param filePath
 */
function openFile(filePath: string) {
  if (process.platform === "win32") {
    if (filePath.match(/^[a-zA-Z]:\\/)) {
      // C:\ like url.
      filePath = "file:///" + filePath;
    }
    if (filePath.startsWith("file:///")) {
      return child_process.execFile("explorer.exe", [filePath]);
    } else {
      return child_process.exec(`start ${filePath}`);
    }
  } else if (process.platform === "darwin") {
    child_process.execFile("open", [filePath]);
  } else {
    child_process.execFile("xdg-open", [filePath]);
  }
}
exports.openFile = openFile;
