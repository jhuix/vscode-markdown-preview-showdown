import * as path from "path";
import * as vscode from "vscode";

export class PreviewConfig {
  public static packageName: string;
  public scrollSync: Boolean;
  public usePuppeteerCore: Boolean;
  public puppeteerWaitForTimeout: Number;
  public chromePath: String;
  public printBackground: Boolean;

  public static getCurrentConfig(context: vscode.ExtensionContext) {
    return new PreviewConfig(context);
  }

  constructor(context: vscode.ExtensionContext) {
    this.printBackground = false;
    if (context) {
      PreviewConfig.packageName = require(path.resolve(
        context.extensionPath,
        "package.json"
      ))["name"];
      const config = vscode.workspace.getConfiguration(
        PreviewConfig.packageName
      );
      let temp: Boolean | undefined = config.get("scrollSync");
      this.scrollSync = typeof temp === "undefined" ? true : temp;
      const tmpStr: string | undefined = config.get("chromePath");
      this.chromePath = typeof tmpStr === "undefined" ? "" : tmpStr;
      temp = config.get("usePuppeteerCore");
      this.usePuppeteerCore =
        typeof temp !== "undefined" ? temp : this.chromePath ? true : false;
      const tmpNum: Number | undefined = config.get("puppeteerWaitForTimeout");
      this.puppeteerWaitForTimeout = typeof tmpNum === "undefined" ? 0 : tmpNum;
    } else {
      this.scrollSync = true;
      this.usePuppeteerCore = false;
      this.puppeteerWaitForTimeout = 0;
      this.chromePath = "";
    }
  }

  isEqualTo(otherConfig: PreviewConfig) {
    const json1 = JSON.stringify(this);
    const json2 = JSON.stringify(otherConfig);
    return json1 === json2;
  }
}
