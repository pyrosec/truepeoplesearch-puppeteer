"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruePuppeteer = exports.makeV2ray = exports.ln = exports.proxyStringToV2ray = exports.buyOrCycleProxy = exports.buyProxy = exports.cycleProxy = exports.cycleIpv4Proxy = exports.getDirectoriesInCwd = exports.puppeteerCookiesToToughCookie = void 0;
const base_puppeteer_1 = require("base-puppeteer");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const proxy6_1 = require("proxy6");
const cli_1 = require("proxy6/lib/cli");
const v2ray_handle_1 = require("v2ray-handle");
const querystring_1 = __importDefault(require("querystring"));
const url_1 = __importDefault(require("url"));
const clone_1 = __importDefault(require("clone"));
const v2ray_base_config_json_1 = __importDefault(require("./v2ray-base-config.json"));
const fetch_cookie_1 = __importDefault(require("fetch-cookie"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
const cheerio_1 = __importDefault(require("cheerio"));
const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const randomizeArray = (ary) => ary.sort(() => [-1, 1][Math.floor(Math.random() * 2)]);
puppeteer.use(RecaptchaPlugin({
    provider: {
        id: "2captcha",
        token: process.env.TWOCAPTCHA_API_KEY,
    },
    visualFeedback: true,
}));
const proxy6 = new proxy6_1.Proxy6Client({
    apiKey: process.env.PROXY6_API_KEY,
    proxyOptions: process.env.PROXY6_PROXY && proxyStringToObject(process.env.PROXY6_PROXY),
});
function proxyStringToObject(proxyUri) {
    const parsed = url_1.default.parse(proxyUri);
    const [username, ...passwordParts] = (parsed.auth || "").split(":");
    return {
        hostname: parsed.hostname,
        port: parsed.port,
        userId: username || null,
        password: passwordParts.join(":") || null,
    };
}
const puppeteerCookiesToToughCookie = (cookies) => ({
    version: "tough-cookie@4.1.2",
    storeType: "MemoryCookieStore",
    rejectPublicSuffixes: true,
    enableLooseMode: false,
    allowSpecialUseDomain: true,
    prefixSecurity: "silent",
    cookies: cookies.map((v) => ({
        ...v,
        key: v.name,
    })),
});
exports.puppeteerCookiesToToughCookie = puppeteerCookiesToToughCookie;
async function getDirectoriesInCwd() {
    const cwd = process.cwd();
    const items = await fs_extra_1.default.readdir(cwd);
    const directories = [];
    for (const item of items) {
        if ((await fs_extra_1.default.lstat(path_1.default.join(cwd, item))).isDirectory())
            directories.push(item);
    }
    return directories;
}
exports.getDirectoriesInCwd = getDirectoriesInCwd;
async function cycleIpv4Proxy() {
    const config = lastConfig;
    const response = await proxy6.getproxy({
        state: "active",
        version: 4,
        type: 'socks'
    });
    const proxies = Object.values(response.list).filter((v) => (v.version === "4" || v.version === "3") && v.type === 'socks');
    const i = Math.floor(Math.random() * proxies.length) - 1;
    const changeTo = proxies[i + 1] || proxies[0];
    return (0, cli_1.proxyToExport)(changeTo).replace("export all_proxy=", "");
}
exports.cycleIpv4Proxy = cycleIpv4Proxy;
async function cycleProxy() {
    const config = lastConfig;
    const response = await proxy6.getproxy({
        state: "active",
        version: 6,
    });
    const proxies = Object.values(response.list);
    const i = Math.floor(Math.random() * proxies.length) - 1;
    const changeTo = proxies[i + 1] || proxies[0];
    return (0, cli_1.proxyToExport)(changeTo).replace("export all_proxy=", "");
}
exports.cycleProxy = cycleProxy;
let loaded = false;
async function buyProxy(truepeoplesearch) {
    if (!loaded && truepeoplesearch.proxy) {
        loaded = true;
        return truepeoplesearch.proxy;
    }
    const response = await proxy6.buy({
        country: "us",
        version: String(6),
        period: 3,
        count: 1,
        type: "socks",
    });
    const record = (0, cli_1.proxyToExport)(Object.values(response.list)[0]).replace("export all_proxy=", "");
    truepeoplesearch.proxy = record;
    return record;
}
exports.buyProxy = buyProxy;
const buyOrCycleProxy = async (truepeoplesearch) => {
    try {
        return await buyProxy(truepeoplesearch);
    }
    catch (e) {
        if (process.env.NODE_ENV === "development")
            console.error(e);
        return await cycleProxy();
    }
};
exports.buyOrCycleProxy = buyOrCycleProxy;
const proxyStringToV2ray = (proxyUri) => {
    const parsed = url_1.default.parse(proxyUri);
    const [username, ...passwordParts] = (parsed.auth || "").split(":");
    return {
        address: parsed.hostname,
        port: Number(parsed.port),
        users: [
            {
                user: username,
                pass: passwordParts.join(":"),
            },
        ],
    };
};
exports.proxyStringToV2ray = proxyStringToV2ray;
let lastConfig = (0, clone_1.default)(v2ray_base_config_json_1.default);
lastConfig.outbounds[0].settings.servers.push({});
const ln = (v, s) => {
    console.log(...[s, require("util").inspect(v, { colors: true, depth: 15 })].filter(Boolean));
    return v;
};
exports.ln = ln;
const makeV2ray = async (proxy, inboundPort, ipv4Proxy) => {
    inboundPort =
        inboundPort ||
            Number(process.env.INBOUND_PORT) ||
            Math.floor(Math.random() * 10000) + 30000;
    const config = (0, clone_1.default)(v2ray_base_config_json_1.default);
    config.inbounds[0].port = inboundPort;
    config.inbounds[0].settings.port = String(inboundPort);
    config.outbounds[0].settings.servers.push(proxy);
    if (ipv4Proxy) {
        config.outbounds[0].tag = "ipv6";
        config.outbounds.push((0, clone_1.default)(config.outbounds[0]));
        const last = config.outbounds[config.outbounds.length - 1];
        last.settings.servers[0] = ipv4Proxy;
        config.routing.rules.unshift({
            type: "field",
            domain: ["hcaptcha.com", "ipinfo.io"],
            outboundTag: "ipv4",
        });
        config.routing.rules.unshift({
            type: "field",
            domain: ["truepeoplesearch.com"],
            outboundTag: "ipv6",
        });
        last.tag = "ipv4";
    }
    lastConfig = config;
    return await (0, v2ray_handle_1.v2ray)(config);
};
exports.makeV2ray = makeV2ray;
class TruePuppeteer extends base_puppeteer_1.BasePuppeteer {
    static async initialize(o) {
        const result = (await super.initialize(o));
        await result._page.setDefaultTimeout(0);
        await result._page.setDefaultNavigationTimeout(0);
        Object.setPrototypeOf(result, TruePuppeteer.prototype);
        result.initializeOpts = o;
        return result;
    }
    async tryOrNull(fn) {
        try {
            return await fn();
        }
        catch (e) {
            console.error(e);
            return null;
        }
    }
    static formatAddress(v) {
        return v.replace(/\n/g, ", ");
    }
    static phoneToObject(s) {
        const [phone, type] = s.split(" - ");
        return {
            phone,
            type,
        };
    }
    async _findRow(tag) {
        const page = this._page;
        return await page.evaluate((_tag) => {
            const els = [].slice.call(document.querySelectorAll("#personDetails > div"));
            return Number(els.findIndex((v) => v.innerText.match(_tag)));
        }, tag);
    }
    async extractFindPersonData() {
        const page = this._page;
        try {
            return ((await page.evaluate(() => {
                const els = [].slice.call(document.querySelectorAll("div#personDetails > div") || []);
                const getElement = (tag) => els.find((v) => v.innerText.match(tag)) || {
                    innerText: "",
                    querySelector() {
                        return {
                            innerText: "",
                        };
                    },
                    querySelectorAll() {
                        return [];
                    },
                };
                const getProp = (tag) => document.querySelector('div[itemprop="' + tag + '"]') || {
                    innerText: "",
                };
                const toAddress = (v) => {
                    const split = v
                        .split("\n")
                        .filter(Boolean)
                        .map((v) => v.trim());
                    const record = {
                        streetaddress: split[0],
                        citystatezip: split[1],
                    };
                    if (split[2])
                        record.time = split[2];
                    return record;
                };
                const firstRow = els[0] || {
                    querySelector() {
                        return { innerText: "" };
                    },
                };
                const toPhone = (v) => {
                    const split = v.split("\n");
                    const match = split[0].split("-").map((v) => v.trim());
                    return {
                        number: match.slice(0, -1).join("-"),
                        type: match[match.length - 1],
                    };
                };
                const person = (firstRow.querySelector("h1") || firstRow.querySelector("h2")).innerText.trim();
                const age = firstRow.querySelector("span").innerText.trim();
                const address = toAddress(getProp("homeLocation").innerText.trim());
                const phoneNumbers = [].slice
                    .call(getElement("Phone Numbers").querySelectorAll(".row"))
                    .slice(1)
                    .map((v) => toPhone(v.innerText))
                    .filter((v) => v.number);
                const emailAddresses = getElement("Email Addresses")
                    .innerText.replace("Email Addresses", "")
                    .trim()
                    .split("\n")
                    .map((v) => v.trim())
                    .filter(Boolean);
                const associatedNames = getElement("Also Known As")
                    .innerText.replace("Also Known As", "")
                    .trim()
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                const previousAddresses = [].slice
                    .call(getElement("Previous Addresses").querySelectorAll('div[itemprop="address"]'))
                    .filter((v) => v.innerText)
                    .map((v) => toAddress(v.innerText.trim()));
                const relatives = getElement("Possible Relatives")
                    .innerText.replace("Possible Relatives", "")
                    .trim()
                    .split(/[,|\n]/g)
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .filter((v) => !v.match(/^Born/));
                const associates = getElement("Possible Associates")
                    .innerText.replace("Possible Associates", "")
                    .trim()
                    .split(/[,|\n]/g)
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .filter((v) => !v.match(/^Born/));
                return {
                    person,
                    age,
                    address,
                    phoneNumbers,
                    emailAddresses,
                    previousAddresses,
                    associatedNames,
                    relatives,
                    associates,
                };
            })) || []);
        }
        catch (e) {
            this.logger.error(e);
            return [];
        }
    }
    async extractData() {
        const page = this._page;
        if (await page.evaluate(() => Boolean(window.location.href.match("find/person"))))
            return await this.extractFindPersonData();
        return await this.extractResultData();
    }
    async extractResultData() {
        const page = this._page;
        let row = 6;
        const content = await page.content();
        this.row = 0;
        try {
            return await page.evaluate(() => {
                const els = [].slice.call(document.querySelectorAll("div#personDetails > div"));
                const getElement = (tag) => els.find((v) => v.innerText.match(tag)) || {
                    innerText: "",
                    querySelector: () => ({ innerText: "" }),
                    querySelectorAll: () => [{ innerText: "" }],
                };
                const toAddress = (v) => {
                    const split = v
                        .split("\n")
                        .filter(Boolean)
                        .map((v) => v.trim());
                    const record = {
                        streetaddress: split[0],
                        citystatezip: split[1],
                    };
                    if (split[2])
                        record.time = split[2];
                    return record;
                };
                const firstRow = els[0] || {
                    querySelector() {
                        return { innerText: "" };
                    },
                };
                const person = firstRow.querySelector(".h2").innerText.trim();
                const age = firstRow.querySelector(".content-value").innerText.trim();
                const address = toAddress(getElement("Current Address")
                    .querySelector(".content-value")
                    .innerText.trim());
                const phoneNumbers = [].slice
                    .call(getElement("Phone Numbers").querySelectorAll(".content-value"))
                    .map((v) => {
                    const split = v.innerText.split("-");
                    return [split.slice(0, -1).join("-"), split[split.length - 1]];
                })
                    .map((v) => v
                    .map((v) => v.trim())
                    .reduce((r, v, i) => {
                    if (!i)
                        r.number = v;
                    else
                        r.type = v;
                    return r;
                }, {}))
                    .filter((v) => v.number);
                const emailAddresses = getElement("Email Addresses")
                    .innerText.replace("Email Addresses", "")
                    .trim()
                    .split("\n")
                    .map((v) => v.trim())
                    .filter(Boolean);
                const associatedNames = getElement("Associated Names")
                    .innerText.replace("Associated Names", "")
                    .trim()
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                const previousAddresses = [].slice
                    .call(getElement("Previous Addresses").querySelectorAll(".content-value"))
                    .filter((v) => v.innerText)
                    .map((v) => toAddress(v.innerText.trim()));
                const relatives = getElement("Possible Relatives")
                    .innerText.replace("Possible Relatives", "")
                    .trim()
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                const associates = getElement("Possible Associates")
                    .innerText.replace("Possible Associates", "")
                    .trim()
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                return {
                    person,
                    age,
                    address,
                    phoneNumbers,
                    emailAddresses,
                    previousAddresses,
                    associatedNames,
                    relatives,
                    associates,
                };
            });
        }
        catch (e) {
            if (process.env.NODE_ENV === "development")
                console.error(e);
            return null;
        }
    }
    next(proceed) {
        const fields = [1, 4, 6, 10, 13, 15, 18, 20];
        if (!this.row)
            this.row = 0;
        const result = fields[this.row];
        if (proceed)
            this.row++;
        return result;
    }
    async searchPhone({ phone, rid }) {
        await this.homepage();
        await this.goto({
            url: "https://www.truepeoplesearch.com/details?phoneno=" +
                phone +
                "&rid=0x" +
                Number(rid || 0).toString(16),
            noTimeout: true,
        });
        return await this._resultWorkflow();
    }
    async _resultWorkflow() {
        await this.waitForSelector({ selector: "body" });
        const result = await this.extractData();
        if (result && !result.person)
            return null;
        return result;
    }
    async walk({ prop, data }) {
        const result = [];
        let rid = 0;
        while (true) {
            const response = await this["search" + prop]({ ...data, rid });
            this.homepage = async () => { };
            rid++;
            if (!response)
                return result;
            result.push(response);
        }
        delete this.homepage;
        return result;
    }
    async walkName({ name, citystatezip }) {
        return await this.walk({ prop: "Name", data: { name, citystatezip } });
    }
    async walkPhone({ phone }) {
        return await this.walk({ prop: "Phone", data: { phone } });
    }
    async walkAddress({ streetaddress, citystatezip }) {
        return await this.walk({
            prop: "Address",
            data: { streetaddress, citystatezip },
        });
    }
    async searchName({ name, citystatezip, rid }) {
        await this.homepage();
        await this.goto({
            url: url_1.default.format({
                protocol: "https:",
                hostname: "www.truepeoplesearch.com",
                pathname: "/details",
            }) +
                "?" +
                querystring_1.default.stringify({
                    name,
                    citystatezip,
                    rid: "0x" + Number(rid || 0).toString(16),
                }),
            noTimeout: true,
        });
        return await this._resultWorkflow();
    }
    async searchAddress({ streetaddress, citystatezip, rid }) {
        await this.homepage();
        await this.goto({
            url: url_1.default.format({
                protocol: "https:",
                hostname: "www.truepeoplesearch.com",
                pathname: "/details",
            }) +
                "?" +
                querystring_1.default.stringify({
                    streetaddress,
                    citystatezip,
                    rid: "0x" + Number(rid || 0).toString(16),
                }),
            noTimeout: true,
        });
        return await this._resultWorkflow();
    }
    async ipinfo() {
        await this.goto({ url: "https://ip.seeip.org/json" });
        return JSON.parse(await this._page.content());
    }
    async toObject() {
        const result = await super.toObject();
        delete result.initializeOpts;
        delete result.v2;
        delete result.textContent;
        return result;
    }
    async waitForCaptcha() {
        const page = this._page;
        await this.timeout({ n: 5000 });
    }
    async restartWithNewProxy() {
        if (this.v2) {
            this.v2.kill();
        }
        if (this._browser)
            this._browser.close();
        const port = Math.floor(Math.random() * 10000) + 30000;
        const proxyOpts = (0, exports.proxyStringToV2ray)(await (0, exports.buyOrCycleProxy)(this));
        this.v2 = await (0, exports.makeV2ray)(proxyOpts, port, (0, exports.proxyStringToV2ray)(await cycleIpv4Proxy()));
        this.initializeOpts.proxyServer = "socks5://127.0.0.1:" + String(port);
        const newInstance = await this.constructor.initialize({
            ...this.initializeOpts,
        });
        this._browser = newInstance._browser;
        this._page = newInstance._page;
    }
    async openBrowser() {
        if (this._browser)
            return;
        const newInstance = await this.constructor.initialize(this.initializeOpts);
        this._browser = newInstance._browser;
        this._page = newInstance._page;
        if (this.userAgent)
            await this._page.setUserAgent(this.userAgent);
    }
    async homepage() {
        await this.restartWithNewProxy();
        await this.timeout({ n: 5000 });
        await this.goto({ url: "https://truepeoplesearch.com", noTimeout: true });
        await this.waitForSelector({ selector: "div#divAppInstall" });
    }
    async fetchUri({ uri, method, config }) {
        this.logger.info("fetch: " + uri);
        const browserFetch = (0, fetch_cookie_1.default)(node_fetch_1.default, this.jar);
        const fetchConfig = {
            ...(config || {}),
            agent: this.initializeOpts &&
                this.initializeOpts.proxyServer &&
                new socks_proxy_agent_1.SocksProxyAgent(proxyStringToObject(this.initializeOpts.proxyServer)),
        };
        if (method)
            fetchConfig.method = method;
        if (!fetchConfig.method)
            fetchConfig.method === "GET";
        fetchConfig.headers = fetchConfig.headers || {};
        fetchConfig.headers["user-agent"] = this.userAgent;
        const response = await browserFetch(uri, fetchConfig);
        this.textContent = await response.text();
        if (await this.isRateLimit()) {
            this.logger.info(this.textContent);
            await this.createSession();
            return await this.fetchUri({ uri, method, config });
        }
        return response;
    }
    async hasCaptcha() {
        if (this._browser)
            return await this.evaluate({
                script: String(function () {
                    return Boolean(document.body.innerText.match("Human test"));
                }),
                args: [],
            });
        return this.textContent.match("Human test");
    }
    async isRateLimit() {
        if (this._browser)
            return await this.evaluate({
                script: String(function () {
                    return (Boolean(document.body.innerText.match("Human test")) ||
                        Boolean(((document.querySelector("pre") || {}).innerText || "").match("rate")));
                }),
                args: [],
            });
        return Boolean(this.textContent.match(/(?:Human\stest|IP.*has.*been.*rate)/));
    }
    async createSession() {
        while (true) {
            this.logger.info("creating session");
            await this.restartWithNewProxy();
            await this.timeout({ n: 1000 });
            try {
                await this.homepage();
                return { success: true };
            }
            catch (e) {
                this.logger.error(e.stack);
                return await this.createSession();
            }
        }
    }
    async goto(o) {
        this.logger.info("goto: " + o.url);
        if (!o.noTimeout)
            await this.timeout({ n: 10000 });
        await super.goto(o);
        if (await this.isRateLimit()) {
            if (await this.hasCaptcha()) {
                this.logger.info("solve captcha");
                await this.waitForCaptcha();
                await this._page.solveRecaptchas();
                await this.timeout({ n: 1000 });
                await this.click({ selector: 'button[type="submit"]' });
                await this.timeout({ n: 5000 });
                return { success: true };
            }
            await this.createSession();
            await this.goto(o);
        }
        return { success: true };
    }
    async buildDirectoryForLetter({ letter }) {
        await this.goto({ url: "https://truepeoplesearch.com/find/" + letter });
        await this.waitForSelector({ selector: "div.content-container" });
        let names = [];
        for (let i = 1;; i++) {
            await this.goto({
                url: "https://truepeoplesearch.com/find/" + letter + "/" + i,
            });
            await this.waitForSelector({ selector: "div.content-container" });
            const page = await this.evaluate({
                script: String(function () {
                    return [].slice
                        .call(document.querySelectorAll("div.content-center div.card-body div.col-md-3 a") || [])
                        .map((v) => ({ label: v.innerText.trim(), href: v.href }));
                }),
                args: [],
            });
            if (!page.length)
                break;
            else
                names = names.concat(page);
        }
        await fs_extra_1.default.writeFile(path_1.default.join(process.cwd(), "index.json"), JSON.stringify(names, null, 2));
    }
    getAlphabet() {
        const ary = Array(26)
            .fill(0)
            .map((_, i) => i + 65)
            .map((v) => String.fromCharCode(v));
        return ary;
    }
    async buildAlphabetDirectory() {
        const ary = this.getAlphabet();
        for (const char of ary) {
            this.logger.info(char);
            await (0, mkdirp_1.default)(path_1.default.join(process.cwd(), char));
        }
    }
    async constructLastNameIndex() {
        const alphabet = this.getAlphabet();
        await this.buildAlphabetDirectory();
        const start = process.cwd();
        await this.homepage();
        for (const char of alphabet) {
            process.chdir(char);
            if (await fs_extra_1.default.exists(path_1.default.join(process.cwd(), "index.json"))) {
                //        this.logger.info(char + " exists -- skip");
            }
            else {
                await this.buildDirectoryForLetter({ letter: char });
            }
            process.chdir(start);
        }
    }
    async fetchRecursive({ depth }) {
        await this.timeout({ n: Math.floor(Math.random() * 10000) });
        await this.constructLastNameIndex();
        const alphabet = this.getAlphabet();
        const cwd = process.cwd();
        for (const char of alphabet) {
            const directory = path_1.default.join(cwd, char);
            process.chdir(directory);
            if (await fs_extra_1.default.exists(path_1.default.join(directory, "LOCK")))
                continue;
            await fs_extra_1.default.writeFile(path_1.default.join(directory, "LOCK"), "");
            await this.constructNameIndex();
            process.chdir(directory);
            if (await fs_extra_1.default.exists(path_1.default.join(directory, "LOCK")))
                await fs_extra_1.default.unlink(path_1.default.join(directory, "LOCK")).catch((err) => {
                    this.logger.error(err.stack);
                });
            process.chdir(cwd);
        }
        this.logger.info("name index built");
        await this.constructPersonList();
        await new Promise((resolve) => { });
    }
    async constructPersonList() {
        await this.homepage();
        const cwd = process.cwd();
        const alphabet = this.getAlphabet();
        for (const char of alphabet) {
            const letterDirectory = path_1.default.join(cwd, char);
            if (await fs_extra_1.default.exists(path_1.default.join(letterDirectory, "DONE")))
                continue;
            process.chdir(letterDirectory);
            await this.constructPersonListForLetter();
            await fs_extra_1.default.writeFile(path_1.default.join(process.cwd(), "DONE"), "");
            process.chdir(cwd);
        }
        this.logger.info("built person list");
    }
    async constructPersonListForLetter() {
        const lastNames = await getDirectoriesInCwd();
        const cwd = process.cwd();
        for (const lastName of randomizeArray(lastNames)) {
            const lastNameDirectory = path_1.default.join(cwd, lastName);
            if (await fs_extra_1.default.exists(path_1.default.join(lastNameDirectory, "DONE")))
                continue;
            process.chdir(lastNameDirectory);
            await this.constructPersonListWithinLastName();
            await fs_extra_1.default.writeFile(path_1.default.join(lastNameDirectory, "DONE"), "");
            process.chdir(cwd);
        }
    }
    async fetchPeopleRecursive({ depth }) {
        await this.constructLastNameIndex();
        const alphabet = this.getAlphabet();
        const cwd = process.cwd();
        for (const char of alphabet) {
            const directory = path_1.default.join(cwd, char);
            process.chdir(directory);
            if ((await fs_extra_1.default.exists(path_1.default.join(directory, "LOCK"))) ||
                (await fs_extra_1.default.exists(path_1.default.join(directory, "DONE"))))
                continue;
            await fs_extra_1.default.writeFile(path_1.default.join(directory, "LOCK"), "");
            await this.constructNameIndex();
            const directories = await getDirectoriesInCwd();
            for (const subdirectory of directories) {
                process.chdir(subdirectory);
                if (await fs_extra_1.default.exists(path_1.default.join(process.cwd(), "DONE")))
                    continue;
                await this.constructPersonList();
                await fs_extra_1.default.writeFile(path_1.default.join(process.cwd(), "DONE"), "");
            }
            await fs_extra_1.default.writeFile(path_1.default.join(directory, "DONE"), "");
            process.chdir(directory);
            if (await fs_extra_1.default.exists(path_1.default.join(directory, "LOCK")))
                await fs_extra_1.default.unlink(path_1.default.join(directory, "LOCK")).catch((err) => {
                    this.logger.error(err.stack);
                });
            process.chdir(cwd);
        }
        this.logger.info("done");
        this._browser.close();
        await new Promise(() => { });
    }
    async constructNameIndex() {
        const index = JSON.parse(await fs_extra_1.default.readFile(path_1.default.join(process.cwd(), "index.json"), "utf8"));
        for (const item of index) {
            await (0, mkdirp_1.default)(path_1.default.join(process.cwd(), item.label));
        }
        const cwd = process.cwd();
        for (const item of index) {
            process.chdir(path_1.default.join(cwd, item.label));
            if (await fs_extra_1.default.exists(path_1.default.join(process.cwd(), "index.json"))) {
                //        this.logger.info("index.json exists for " + item.label + " -- skip");
            }
            else {
                this.logger.info(item.href);
                await this.goto({ url: item.href });
                let names = [];
                for (let i = 1;; i++) {
                    await this.goto({
                        url: item.href + "/" + i,
                    });
                    await this.waitForSelector({ selector: "div.content-container" });
                    const page = await this.evaluate({
                        script: String(function () {
                            return [].slice
                                .call(document.querySelectorAll("div.content-center div.card-body div.col-md-3 a") || [])
                                .map((v) => ({ label: v.innerText.trim(), href: v.href }));
                        }),
                        args: [],
                    });
                    if (!page.length)
                        break;
                    else
                        names = names.concat(page);
                }
                await fs_extra_1.default.writeFile(path_1.default.join(process.cwd(), "index.json"), JSON.stringify(names, null, 2));
            }
            process.chdir(cwd);
        }
    }
    async constructPersonListWithinLastName() {
        if (await fs_extra_1.default.exists(path_1.default.join(process.cwd(), "LOCK")))
            return;
        else
            await fs_extra_1.default.writeFile(path_1.default.join(process.cwd(), "LOCK"), "");
        const index = JSON.parse(await fs_extra_1.default.readFile(path_1.default.join(process.cwd(), "index.json"), "utf8"));
        for (const item of index) {
            await (0, mkdirp_1.default)(path_1.default.join(process.cwd(), item.label));
        }
        const cwd = process.cwd();
        this.logger.info(cwd);
        for (const item of index) {
            process.chdir(path_1.default.join(cwd, item.label));
            if (await fs_extra_1.default.exists(path_1.default.join(process.cwd(), "index.json"))) {
                //        this.logger.info("index.json exists for " + item.label + " -- skip");
            }
            else {
                let people = [];
                for (let i = 1;; i++) {
                    const href = item.href + "/" + String(i);
                    this.logger.info(href);
                    await this.goto({ url: href });
                    await this.waitForSelector({
                        selector: "div.content-center",
                    });
                    people = people.concat(await this.scrapePeople());
                    if (await this.finalPage())
                        break;
                }
                this.logger.info(people);
                await fs_extra_1.default.writeFile(path_1.default.join(process.cwd(), "index.json"), JSON.stringify(people, null, 2));
            }
            process.chdir(cwd);
        }
        if (await fs_extra_1.default.exists(path_1.default.join(process.cwd(), "LOCK")))
            await fs_extra_1.default.unlink(path_1.default.join(process.cwd(), "LOCK"));
    }
    async finalPage() {
        if (this._browser)
            return await this.evaluate({
                script: String(function () {
                    return ([].slice.call(document.querySelectorAll('div.card-body[itemtype="http://schema.org/Person"]')).length < 10);
                }),
                args: [],
            });
        else {
            const $ = cheerio_1.default.load(this.textContent);
            const list = [];
            $('div.card-body[itemtype="http://schema.org/Person"]').each(function () {
                list.push($(this));
            });
            if (list.length < 10)
                return true;
            return false;
        }
    }
    async scrapePeople() {
        if (this._browser)
            return await this.evaluate({
                script: String(function () {
                    [].slice
                        .call(document.querySelectorAll("a.view-more") || [])
                        .forEach((v) => v.click());
                    return [].slice
                        .call(document.querySelectorAll('div.card-body[itemtype="http://schema.org/Person"]') || [])
                        .map((v) => {
                        const person = {
                            href: v.getAttribute("itemid"),
                            label: v.children[0].children[0].children[0].innerText.trim(),
                            age: ((v.children[0].children[0].children[2] || {}).innerText || "").trim(),
                        };
                        const prefix = 'div[itemid="' + person.href + '"]';
                        const getProp = (prop) => [].slice
                            .call(document.querySelectorAll(prefix + ' a[data-link-to-more="' + prop + '"]') || [])
                            .map((v) => ({
                            href: v.href,
                            value: v.innerText.trim(),
                        }));
                        return {
                            ...person,
                            addresses: getProp("address"),
                            phoneNumbers: getProp("phone"),
                            relatives: getProp("relative"),
                        };
                    });
                }),
                args: [],
            });
        else {
            const $ = cheerio_1.default.load(this.textContent);
            const getProp = (prefix, prop) => {
                const els = [];
                $(prefix + ' a[data-link-to-more="' + prop + '"]').each(function () {
                    els.push($(this));
                });
                return els.map((v) => ({
                    href: v.attr("href"),
                    value: v.text().trim(),
                }));
            };
            const peopleEls = [];
            $('div.card-body[itemtype="http://schema.org/Person"]').each(function () {
                peopleEls.push($(this));
            });
            const people = peopleEls.map((v) => {
                const deathEl = v.find('span[itemprop="deathdate"]');
                const ageEl = v.find("div.row div.col span.content-value");
                const age = ageEl ? ageEl.text().trim() : deathEl.text().trim();
                const person = {
                    href: v.attr("itemid"),
                    label: v.find("span.h4").eq(0).text().trim(),
                    age,
                };
                const prefix = 'div[itemid="' + person.href + '"]';
                return {
                    ...person,
                    addresses: getProp(prefix, "address"),
                    phoneNumbers: getProp(prefix, "phone"),
                    relatives: getProp(prefix, "relative"),
                };
            });
            return people;
        }
    }
}
exports.TruePuppeteer = TruePuppeteer;
//# sourceMappingURL=truepeoplesearch.js.map