import { BasePuppeteer } from "base-puppeteer";
import { CookieJar } from "tough-cookie";
export declare const puppeteerCookiesToToughCookie: (cookies: any) => {
    version: string;
    storeType: string;
    rejectPublicSuffixes: boolean;
    enableLooseMode: boolean;
    allowSpecialUseDomain: boolean;
    prefixSecurity: string;
    cookies: any;
};
export declare function getDirectoriesInCwd(): Promise<any[]>;
export declare function cycleIpv4Proxy(): Promise<string>;
export declare function cycleProxy(): Promise<string>;
export declare function buyProxy(truepeoplesearch: any): Promise<any>;
export declare const buyOrCycleProxy: (truepeoplesearch: any) => Promise<any>;
export declare const proxyStringToV2ray: (proxyUri: string) => {
    address: string;
    port: number;
    users: {
        user: string;
        pass: string;
    }[];
};
export declare const ln: (v: any, s?: string) => any;
export declare const makeV2ray: (proxy: any, inboundPort: any, ipv4Proxy: any) => Promise<unknown>;
export declare class TruePuppeteer extends BasePuppeteer {
    initializeOpts: any;
    v2: any;
    jar: CookieJar;
    userAgent: string;
    textContent: string;
    row: number;
    proxy: string;
    static initialize(o: any): Promise<TruePuppeteer>;
    tryOrNull(fn: any): Promise<any>;
    static formatAddress(v: any): any;
    static phoneToObject(s: any): {
        phone: any;
        type: any;
    };
    _findRow(tag: any): Promise<any>;
    extractFindPersonData(): Promise<any>;
    extractData(): Promise<any>;
    extractResultData(): Promise<any>;
    next(proceed?: any): number;
    searchPhone({ phone, rid }: {
        phone: any;
        rid: any;
    }): Promise<any>;
    _resultWorkflow(): Promise<any>;
    walk({ prop, data }: {
        prop: any;
        data: any;
    }): Promise<any[]>;
    walkName({ name, citystatezip }: {
        name: any;
        citystatezip: any;
    }): Promise<any[]>;
    walkPhone({ phone }: {
        phone: any;
    }): Promise<any[]>;
    walkAddress({ streetaddress, citystatezip }: {
        streetaddress: any;
        citystatezip: any;
    }): Promise<any[]>;
    searchName({ name, citystatezip, rid }: {
        name: any;
        citystatezip: any;
        rid: any;
    }): Promise<any>;
    searchAddress({ streetaddress, citystatezip, rid }: {
        streetaddress: any;
        citystatezip: any;
        rid: any;
    }): Promise<any>;
    ipinfo(): Promise<any>;
    toObject(): Promise<this & {
        content: string;
        cookies: any;
    }>;
    waitForCaptcha(): Promise<void>;
    restartWithNewProxy(): Promise<void>;
    openBrowser(): Promise<void>;
    homepage(): Promise<void>;
    fetchUri({ uri, method, config }: {
        uri: any;
        method: any;
        config: any;
    }): Promise<any>;
    hasCaptcha(): Promise<any>;
    isRateLimit(): Promise<any>;
    createSession(): any;
    goto(o: any): Promise<{
        success: boolean;
    }>;
    buildDirectoryForLetter({ letter }: {
        letter: any;
    }): Promise<void>;
    getAlphabet(): string[];
    buildAlphabetDirectory(): Promise<void>;
    constructLastNameIndex(): Promise<void>;
    fetchRecursive({ depth }: {
        depth: any;
    }): Promise<void>;
    constructPersonList(): Promise<void>;
    constructPersonListForLetter(): Promise<void>;
    fetchPeopleRecursive({ depth }: {
        depth: any;
    }): Promise<void>;
    constructNameIndex(): Promise<void>;
    constructPersonListWithinLastName(): Promise<void>;
    finalPage(): Promise<any>;
    scrapePeople(): Promise<any>;
}
