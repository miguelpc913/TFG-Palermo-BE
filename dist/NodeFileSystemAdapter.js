/**
 * @packageDocumentation
 * A `StorageAdapter` which stores data in the local filesystem
 */
import fs from "fs";
import path from "path";
import { rimraf } from "rimraf";
export class NodeFSStorageAdapter {
    /**
     * @param baseDirectory - The path to the directory to store data in. Defaults to "./automerge-repo-data".
     */
    constructor(baseDirectory = "automerge-repo-data") {
        this.cache = {};
        this.baseDirectory = baseDirectory;
    }
    async load(keyArray) {
        const key = getKey(keyArray);
        if (this.cache[key])
            return this.cache[key];
        const filePath = this.getFilePath(keyArray);
        try {
            const fileContent = await fs.promises.readFile(filePath);
            console.log(fileContent);
            return new Uint8Array(fileContent);
        }
        catch (error) {
            // don't throw if file not found
            if (error.code === "ENOENT")
                return undefined;
            throw error;
        }
    }
    async save(keyArray, binary) {
        const key = getKey(keyArray);
        this.cache[key] = binary;
        const filePath = this.getFilePath(keyArray);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, binary);
    }
    async remove(keyArray) {
        // remove from cache
        delete this.cache[getKey(keyArray)];
        // remove from disk
        const filePath = this.getFilePath(keyArray);
        try {
            await fs.promises.unlink(filePath);
        }
        catch (error) {
            // don't throw if file not found
            if (error.code !== "ENOENT")
                throw error;
        }
    }
    async loadRange(keyPrefix) {
        /* This whole function does a bunch of gratuitious string manipulation
             and could probably be simplified. */
        const dirPath = this.getFilePath(keyPrefix);
        // Get the list of all cached keys that match the prefix
        const cachedKeys = this.cachedKeys(keyPrefix);
        // Read filenames from disk
        const diskFiles = await walkdir(dirPath);
        // The "keys" in the cache don't include the baseDirectory.
        // We want to de-dupe with the cached keys so we'll use getKey to normalize them.
        const diskKeys = diskFiles.map((fileName) => {
            const k = getKey([path.relative(this.baseDirectory, fileName)]);
            return k.slice(0, 2) + k.slice(3);
        });
        // Combine and deduplicate the lists of keys
        const allKeys = [...new Set([...cachedKeys, ...diskKeys])];
        // Load all files
        const chunks = await Promise.all(allKeys.map(async (keyString) => {
            const key = keyString.split(path.sep);
            const data = await this.load(key);
            return { data, key };
        }));
        return chunks;
    }
    async removeRange(keyPrefix) {
        // remove from cache
        this.cachedKeys(keyPrefix).forEach((key) => delete this.cache[key]);
        // remove from disk
        const dirPath = this.getFilePath(keyPrefix);
        await rimraf(dirPath);
    }
    cachedKeys(keyPrefix) {
        const cacheKeyPrefixString = getKey(keyPrefix);
        return Object.keys(this.cache).filter((key) => key.startsWith(cacheKeyPrefixString));
    }
    getFilePath(keyArray) {
        const [firstKey, ...remainingKeys] = keyArray;
        return path.join(this.baseDirectory, firstKey.slice(0, 2), firstKey.slice(2), ...remainingKeys);
    }
}
// HELPERS
const getKey = (key) => path.join(...key);
/** returns all files in a directory, recursively  */
const walkdir = async (dirPath) => {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const files = await Promise.all(entries.map((entry) => {
            const subpath = path.resolve(dirPath, entry.name);
            return entry.isDirectory() ? walkdir(subpath) : subpath;
        }));
        return files.flat();
    }
    catch (error) {
        // don't throw if directory not found
        if (error.code === "ENOENT")
            return [];
        throw error;
    }
};
//# sourceMappingURL=NodeFileSystemAdapter.js.map