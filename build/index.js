var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "adm-zip", "download", "fs", "fs-extra", "os", "path", "rimraf", "./patchElectronApp"], function (require, exports, adm_zip_1, download_1, fs_1, fs_extra_1, os_1, path_1, rimraf_1, patchElectronApp_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.patchSodaPlayer = exports.sodaPlayerBasicConfig = void 0;
    adm_zip_1 = __importDefault(adm_zip_1);
    download_1 = __importDefault(download_1);
    fs_1 = __importDefault(fs_1);
    fs_extra_1 = __importDefault(fs_extra_1);
    os_1 = __importDefault(os_1);
    path_1 = __importDefault(path_1);
    rimraf_1 = __importDefault(rimraf_1);
    const fs = fs_1.default.promises;
    const filePathRegexps = async (basePath, patchConfig) => {
        for (const { filePath: relativeFilePath, replace } of patchConfig) {
            const filePath = path_1.default.join(basePath, relativeFilePath);
            let contents = await fs.readFile(filePath, "utf-8");
            for (const [regex, replacement] of replace) {
                //@ts-ignore report bug?
                contents = contents.replace(regex, replacement);
            }
            await fs.writeFile(filePath, contents);
        }
    };
    exports.sodaPlayerBasicConfig = {
        appName: "Soda Player",
        localAppdataDir: "sodaplayer",
    };
    const patchSodaPlayer = async (customPatchDirectory) => {
        const tmpDirForDownloadingPatch = os_1.default.tmpdir();
        try {
            await (0, patchElectronApp_1.patchElectronApp)({
                ...exports.sodaPlayerBasicConfig,
                async patchContents({ contentsDir }) {
                    let patchDir;
                    if (customPatchDirectory) {
                        patchDir = customPatchDirectory;
                    }
                    else {
                        const downloadPatchUrl = "https://github.com/zardoy/soda-player-plus/archive/main.zip";
                        await (0, download_1.default)(downloadPatchUrl, tmpDirForDownloadingPatch, {
                            filename: "patch-archive"
                        });
                        const patchArchive = path_1.default.join(tmpDirForDownloadingPatch, "patch-archive");
                        const adm = new adm_zip_1.default(patchArchive);
                        await new Promise(resolve => adm.extractAllToAsync(path_1.default.join(tmpDirForDownloadingPatch, "patch"), true, resolve));
                        rimraf_1.default.sync(patchArchive);
                        patchDir = path_1.default.resolve(tmpDirForDownloadingPatch, "patch/soda-player-plus-main/patch");
                    }
                    await fs_extra_1.default.copy(patchDir, contentsDir, {
                        overwrite: true,
                    });
                    filePathRegexps(contentsDir, [
                        {
                            filePath: "index.html",
                            replace: [
                                [/<!-- Google Analytics -->.+?<!-- End Google Analytics -->/is, ""],
                                [/<script src="vendor\/jquery\/dist\/jquery\.slim\.min\.js"/is,
                                    `<!-- PLUS SCRIPTS -->\n<script src="plus/renderer.js"></script>\n\n$&`]
                            ]
                        },
                        {
                            filePath: "package.json",
                            replace: [
                                [/js\/main\/main.js/i, "plus/main.js"]
                            ]
                        }
                    ]);
                }
            });
        }
        finally {
            const patchDir = path_1.default.join(tmpDirForDownloadingPatch, "patch");
            if (fs_extra_1.default.existsSync(patchDir))
                rimraf_1.default.sync(patchDir);
        }
    };
    exports.patchSodaPlayer = patchSodaPlayer;
});
