var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "asar", "fs", "fs-extra", "path", "rimraf", "semver"], function (require, exports, asar_1, fs_1, fs_extra_1, path_1, rimraf_1, semver_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.patchElectronApp = exports.isPatchAvailable = exports.getPaths = void 0;
    asar_1 = __importDefault(asar_1);
    fs_1 = __importDefault(fs_1);
    fs_extra_1 = __importDefault(fs_extra_1);
    path_1 = __importDefault(path_1);
    rimraf_1 = __importDefault(rimraf_1);
    semver_1 = __importDefault(semver_1);
    const fs = fs_1.default.promises;
    const getPaths = async (localAppdataDir) => {
        const electronAppBase = path_1.default.join(process.env.LOCALAPPDATA || "", localAppdataDir);
        if (!fs_extra_1.default.existsSync(electronAppBase))
            throwErrNoAppInAppdata();
        const filelist = await fs.readdir(electronAppBase);
        const appDirs = filelist
            .filter(file => file.startsWith("app-"))
            .map(file => file.slice("app-".length));
        const biggestVersion = semver_1.default.sort(appDirs).reverse()[0];
        const appResourcesDir = path_1.default.join(electronAppBase, `app-${biggestVersion}/resources`);
        return {
            appBase: electronAppBase,
            appResourcesDir,
            asarSource: path_1.default.join(appResourcesDir, "app.asar"),
            oldAsarSource: path_1.default.join(appResourcesDir, "app.asar.old"),
            asarUnpacked: path_1.default.join(appResourcesDir, "app")
        };
    };
    exports.getPaths = getPaths;
    const isPatchAvailable = async ({ localAppdataDir }) => {
        try {
            const { appResourcesDir } = await (0, exports.getPaths)(localAppdataDir);
            if (fs_extra_1.default.existsSync(path_1.default.join(appResourcesDir, "PATCHED"))) {
                return false;
            }
            else {
                return true;
            }
        }
        catch {
            return false;
        }
    };
    exports.isPatchAvailable = isPatchAvailable;
    const throwErrNoAppInAppdata = () => {
        throw new Error(`%LOCALAPPDATA% doesn't exist. Check the environment`);
    };
    const patchElectronApp = async ({ localAppdataDir, appName, patchContents }) => {
        if (process.platform !== "win32")
            throw new Error(`Only windows platform is supported`);
        if (!process.env.LOCALAPPDATA)
            throwErrNoAppInAppdata();
        const electronAppBase = path_1.default.join(process.env.LOCALAPPDATA, localAppdataDir);
        if (!fs_extra_1.default.existsSync(electronAppBase))
            throw new Error(`%LOCALAPPDATA%/${localAppdataDir} doesn't exist. You must install ${appName} first!`);
        const { appResourcesDir, asarSource, asarUnpacked, oldAsarSource } = await (0, exports.getPaths)(localAppdataDir);
        if (fs_extra_1.default.existsSync(oldAsarSource)) {
            await fs.rename(oldAsarSource, asarSource);
        }
        if (fs_extra_1.default.existsSync(asarUnpacked)) {
            rimraf_1.default.sync(asarUnpacked);
        }
        asar_1.default.extractAll(asarSource, asarUnpacked);
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
            await patchContents({ contentsDir: asarUnpacked });
        }
        catch (err) {
            // patch failed. let app use original app.asar instead of probably broken contents
            rimraf_1.default.sync(asarUnpacked);
            throw err;
        }
        // we're not creating app.asar since electron should pick contents of app/ dir
        await fs.rename(asarSource, oldAsarSource);
        await new Promise(resolve => setTimeout(resolve, 1500));
        await fs.writeFile(path_1.default.join(appResourcesDir, "PATCHED"), "", "utf-8");
    };
    exports.patchElectronApp = patchElectronApp;
});